import type { Card } from '../../types';

export interface ComposeCardInput {
  /** La foto de la carta: data URL, blob URL o dirección web. */
  photo: string;
  name: string;
  /** Con margen crema y marco negro (foto normal) o sin ellos (ilustración que ya trae su marco). */
  framed: boolean;
}

/** Devuelve la carta terminada (foto, marco y nombre) como data URL de un JPEG. */
export type CardComposer = (input: ComposeCardInput) => Promise<string>;

/** Cómo se compone una carta: la convertida con IA va entera, sin margen ni marco nuevo (FEAT-29, decisión 5). */
export const composeInputFor = (card: Card, photo: string): ComposeCardInput => ({
  photo,
  name: card.title,
  framed: !card.isAiGenerated,
});
