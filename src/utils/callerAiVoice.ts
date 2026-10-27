/** Voz con IA del cantador (FEAT-55, US A6). El cobro y la generación los hace la edge function caller-voice. */

/** Bloques de la voz con IA (FEAT-58, decisión 8). El cobro real lo decide la base (migración 071). */
const BASE_PRICE = 10;
const BASE_CARDS = 60;
const BLOCK_CARDS = 10;
const BLOCK_PRICE = 2;

const blocksFor = (cards: number) => Math.ceil(Math.max(0, cards - BASE_CARDS) / BLOCK_CARDS);

/** Lo que cuesta la voz con IA de una lotería: 10 tokens hasta 60 cartas y 2 por cada 10 más. */
export const aiVoicePrice = (cards: number): number => BASE_PRICE + BLOCK_PRICE * blocksFor(cards);

/** Cuántas cartas cubre lo pagado: 60, más 10 por bloque. */
export const aiVoiceCoverage = (cards: number): number => BASE_CARDS + BLOCK_CARDS * blocksFor(cards);

/** «Ampliar la voz»: 2 tokens por cada 10 cartas que pasan de lo cubierto. */
export const expandPrice = (cards: number, covered: number): number =>
  BLOCK_PRICE * Math.ceil(Math.max(0, cards - covered) / BLOCK_CARDS);

/** Id de la frase «Se va y se corre con…» entre los audios (decisión 23). */
export const INTRO_AUDIO_ID = 'intro';

export interface AiVoiceOption {
  id: string;
  /** Clave de traducción: caller.aiVoice.voices.<name> */
  name: string;
  /** Para agruparlas en la ventana: «Voces de hombre», «Voces de mujer». */
  group: 'men' | 'women';
  sample: string;
}

/** Las 8 voces mexicanas de ElevenLabs (decisión 29): 4 de hombre y luego 4 de mujer, con su muestra. */
export const AI_VOICES: AiVoiceOption[] = [
  ['y2ijeTfmnXjzheHO6zeN', 'jose'],
  ['qRUgOhnxGASxirG4fKjv', 'david'],
  ['gbTn1bmCvNgk0QEAVyfM', 'enriqueNieto'],
  ['iDEmt5MnqUotdwCIVplo', 'enriqueMondragon'],
  ['hHjbwzYZW17oh0p05AKv', 'gabriela'],
  ['twZzvyYIl5ntDHC1Vatv', 'angelica'],
  ['ay4iqk10DLwc8KGSrf2t', 'azucena'],
  ['JYyJjNPfmNJdaby8LdZs', 'marlene'],
].map(([id, name], index) => ({ id, name, group: index < 4 ? 'men' : 'women', sample: `/audio/voces/${id}.mp3` }));

interface TitledCard {
  id: string;
  title: string;
}

/**
 * Los audios que faltan, en orden: la frase de arranque y luego las cartas sin audio o renombradas
 * después de generarlo (decisión 15). `audioTitles`: carta → título con el que se generó su audio. Las cartas sin
 * audio solo hasta las que cubre lo pagado (`covered`, FEAT-58 decisión 8); las demás, con la voz del navegador.
 */
export function pendingAudioIds(
  cards: TitledCard[],
  audioTitles: Map<string, string>,
  hasIntro: boolean,
  covered = Number.POSITIVE_INFINITY,
): string[] {
  let room = Math.max(0, covered - audioTitles.size);
  const missing = cards
    .filter((card) => {
      const audioTitle = audioTitles.get(card.id);
      if (audioTitle === undefined) return room-- > 0;
      return audioTitle !== card.title;
    })
    .map((card) => card.id);
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

/**
 * Si no salió ninguna carta ni la frase de arranque se piden de vuelta los tokens (decisión 11; FEAT-58,
 * decisión 10); el servidor lo vuelve a comprobar.
 */
export function shouldRefund(cardAudioCount: number, hasIntro: boolean): boolean {
  return cardAudioCount === 0 && !hasIntro;
}
