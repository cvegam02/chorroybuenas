/** Lo que hace falta de una voz del navegador para elegirla (es un subconjunto de `SpeechSynthesisVoice`). */
export interface VoiceInfo {
  lang: string;
  name: string;
  localService: boolean;
}

/** Orden de preferencia: México, luego Latinoamérica y Estados Unidos, luego cualquier español (decisión 10). */
const rankOf = (lang: string): number | null => {
  const code = lang.toLowerCase().replace('_', '-');
  if (code === 'es-mx') return 0;
  if (code === 'es-419' || code === 'es-us') return 1;
  if (code === 'es' || code.startsWith('es-')) return 2;
  return null;
};

/**
 * La voz en español con la que el cantador dice los títulos (FEAT-55, US A4). Entre dos del mismo
 * lugar, la que no necesita internet. Sin ninguna en español, null: el cantador sigue sin voz.
 */
export const pickSpanishVoice = <T extends VoiceInfo>(voices: readonly T[]): T | null => {
  let best: { voice: T; score: number } | null = null;
  for (const voice of voices) {
    const rank = rankOf(voice.lang);
    if (rank === null) continue;
    const score = rank * 2 + (voice.localService ? 0 : 1);
    if (!best || score < best.score) best = { voice, score };
  }
  return best?.voice ?? null;
};
