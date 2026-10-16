import { useEffect, useState } from 'react';
import { AdminRepository } from '../../repositories/AdminRepository';
import { activityItem, type UserActivityEvent } from '../../utils/userActivity';

/** Cuántos movimientos trae la ficha: los más recientes. */
const ACTIVITY_LIMIT = 200;

interface AdminUserActivityProps {
  userId: string;
  /** Cambia al regalar, para volver a pedir la actividad. */
  version: number;
}

/** «Actividad» de la ficha del usuario (FEAT-45, US A3): del movimiento más reciente al más antiguo. */
export const AdminUserActivity = ({ userId, version }: AdminUserActivityProps) => {
  const [events, setEvents] = useState<UserActivityEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setFailed(false);
    AdminRepository.getUserActivity(userId, ACTIVITY_LIMIT)
      .then((result) => {
        if (!current) return;
        setEvents(result);
        if (!result) setFailed(true);
      })
      .catch(() => {
        if (current) setFailed(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [userId, version, attempt]);

  return (
    <section className="admin-sale-detail__section" aria-labelledby="admin-user-activity-title" aria-busy={loading}>
      <h4 id="admin-user-activity-title" className="admin-sale-detail__section-title">
        Actividad
      </h4>
      {failed ? (
        <div className="admin-sale-detail__error" role="alert">
          <p>No se pudo cargar la actividad.</p>
          <button type="button" className="admin-sales__chip" onClick={() => setAttempt((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      ) : loading && !events ? (
        <p className="admin-sales__muted">Cargando actividad…</p>
      ) : (
        <>
          <ol className="admin-users__activity">
            {(events ?? []).map((event, index) => {
              const item = activityItem(event);
              return (
                <li key={`${event.kind}-${event.occurred_at}-${index}`} className="admin-users__event">
                  <span className={`admin-users__event-icon admin-users__event-icon--${item.tone}`} aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="admin-users__event-text">
                    <span className="admin-sales__main">{item.title}</span>
                    <span className="admin-sales__muted">{item.detail}</span>
                  </span>
                  {item.value && <span className="admin-users__event-value">{item.value}</span>}
                </li>
              );
            })}
          </ol>
          {events && events.length >= ACTIVITY_LIMIT && (
            <p className="admin-sales__muted">Se muestran los {ACTIVITY_LIMIT} movimientos más recientes.</p>
          )}
        </>
      )}
    </section>
  );
};
