#!/usr/bin/env bash
# Tests de base de datos con un arnés ligero: levanta un Postgres desechable (en memoria),
# aplica los stubs de Supabase y todas las migraciones, y corre supabase/tests/*.test.sql.
# Uso: npm run test:db
set -euo pipefail

IMAGE="${TEST_DB_IMAGE:-postgres:16-alpine}"
CONTAINER="chorroybuenas_test_db_$$"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STUBS="$ROOT/supabase/tests/harness/supabase_stubs.sql"

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --rm --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=test \
  --tmpfs /var/lib/postgresql/data \
  "$IMAGE" >/dev/null

# El entrypoint reinicia Postgres una vez; esperar al servidor definitivo.
ready=0
for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" psql -U postgres -h 127.0.0.1 -Atc 'select 1' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 0.5
done
if [ "$ready" -ne 1 ]; then
  echo "El Postgres de pruebas no arrancó" >&2
  exit 1
fi

run_sql() {
  docker exec -i "$CONTAINER" psql -U postgres -h 127.0.0.1 -v ON_ERROR_STOP=1 --quiet -f - < "$1"
}

echo "== Stubs de Supabase"
run_sql "$STUBS" >/dev/null

echo "== Migraciones"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  if ! output=$(run_sql "$migration" 2>&1); then
    echo "FALLÓ la migración $(basename "$migration"):" >&2
    echo "$output" | grep -E 'ERROR|DETAIL|HINT|LINE' >&2 || echo "$output" >&2
    exit 1
  fi
done
echo "   $(ls "$ROOT"/supabase/migrations/*.sql | wc -l) migraciones aplicadas"

echo "== Tests"
shopt -s nullglob
tests=("$ROOT"/supabase/tests/*.test.sql)
if [ "${#tests[@]}" -eq 0 ]; then
  echo "   (no hay archivos de test)"
  exit 0
fi

failed=0
total_ok=0
for test_file in "${tests[@]}"; do
  name="$(basename "$test_file")"
  if output=$(run_sql "$test_file" 2>&1); then
    count=$(echo "$output" | grep -c 'NOTICE:  ok - ' || true)
    total_ok=$((total_ok + count))
    echo "   ok   $name ($count aserciones)"
  else
    failed=$((failed + 1))
    echo "   FAIL $name"
    echo "$output" | grep -E 'NOTICE:  ok - |ERROR|FAIL|DETAIL|CONTEXT' | sed 's/^/        /'
  fi
done

echo "== ${#tests[@]} archivos, $total_ok aserciones, $failed con fallos"
[ "$failed" -eq 0 ]
