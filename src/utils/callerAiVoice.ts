/** Voz con IA del cantador (FEAT-55, US A6). El cobro y la generación los hace la edge function caller-voice. */

/** Lo que cuesta la voz con IA de una lotería (decisión 11). El cobro real lo decide la base (migración 060). */
export const AI_VOICE_PRICE = 10;

/** Id de la frase «Se va y se corre con…» entre los audios (decisión 23). */
export const INTRO_AUDIO_ID = 'intro';

export interface AiVoiceOption {
  id: string;
  /** Clave de traducción: caller.aiVoice.voices.<name> */
  name: string;
  sample: string;
}

/** Las cuatro voces (decisiones 22 y 27), con la muestra que se escucha antes de pagar. */
export const AI_VOICES: AiVoiceOption[] = [
  ['Spanish_Narrator', 'locutor'],
  ['Spanish_Steadymentor', 'pausado'],
  ['Spanish_WiseScholar', 'maduro'],
  ['Spanish_Wiselady', 'senora'],
].map(([id, name]) => ({ id, name, sample: `/audio/voces/${id}.mp3` }));

interface TitledCard {
  id: string;
  title: string;
}

/**
 * Los audios que faltan, en orden: la frase de arranque y luego las cartas sin audio o renombradas
 * después de generarlo (decisión 15). `audioTitles`: carta → título con el que se generó su audio.
 */
export function pendingAudioIds(cards: TitledCard[], audioTitles: Map<string, string>, hasIntro: boolean): string[] {
  const missing = cards.filter((card) => audioTitles.get(card.id) !== card.title).map((card) => card.id);
  return hasIntro ? missing : [INTRO_AUDIO_ID, ...missing];
}

/** El audio de una carta, solo si se generó con su título actual. */
export function audioUrlFor(
  urls: Map<string, string>,
  audioTitles: Map<string, string>,
  card: TitledCard,
): string | undefined {
  return audioTitles.get(card.id) === card.title ? urls.get(card.id) : undefined;
}

/** Si no salió ninguna carta se piden de vuelta los tokens (decisión 11); el servidor lo vuelve a comprobar. */
export function shouldRefund(cardAudioCount: number): boolean {
  return cardAudioCount === 0;
}
