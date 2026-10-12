/**
 * Ventana «Editar carta» (FEAT-34, US A8): las imágenes entre las que se puede elegir (foto original o
 * versión con IA), cuál está en uso y qué se guarda al pulsar «Guardar cambios».
 * Aquí no se cobra ni se genera nada: solo se decide qué queda en la carta.
 */

import type { Card } from '../types';
import { isPrintableCardTitle } from './cardTitle';

export type CardImageChoice = 'original' | 'ai' | 'aiPrevious';

export interface CardEditDraft {
  title: string;
  /** La foto que subió la persona. */
  original?: string;
  /** La versión con IA; tras hacer otra, la nueva. */
  ai?: string;
  /** La versión con IA que estaba en uso antes de hacer otra. Solo vive mientras la ventana está abierta. */
  aiPrevious?: string;
  /** La que se ve en la vista previa y la que quedará al guardar. */
  selected: CardImageChoice;
  /** La que hoy está guardada en la carta. */
  inUse: CardImageChoice;
  /** Opciones cuya imagen cambió en esta ventana (recorte o foto nueva) y todavía no se guarda. */
  edited: CardImageChoice[];
}

type EditableCard = Pick<Card, 'title' | 'image' | 'originalImage' | 'isAiGenerated'>;

export function initialDraft(card: EditableCard): CardEditDraft {
  const isAi = card.isAiGenerated === true;
  const choice: CardImageChoice = isAi ? 'ai' : 'original';
  return {
    title: card.title,
    original: isAi ? card.originalImage : card.image,
    ai: isAi ? card.image : undefined,
    selected: choice,
    inUse: choice,
    edited: [],
  };
}

/** La imagen que se ve en la vista previa. */
export function draftImage(draft: CardEditDraft): string | undefined {
  return draft[draft.selected];
}

/** Elegir una opción solo cambia la vista previa; no se puede elegir una que no tiene imagen. */
export function selectChoice(draft: CardEditDraft, choice: CardImageChoice): CardEditDraft {
  return draft[choice] ? { ...draft, selected: choice } : draft;
}

/** El recorte reemplaza la imagen de la opción elegida. */
export function withCrop(draft: CardEditDraft, image: string): CardEditDraft {
  return {
    ...draft,
    [draft.selected]: image,
    edited: [...new Set([...draft.edited, draft.selected])],
  };
}

/** Una foto nueva es la nueva «foto original»; las versiones con IA eran de la foto anterior y se quitan. */
export function withNewPhoto(draft: CardEditDraft, photo: string): CardEditDraft {
  return {
    ...draft,
    original: photo,
    ai: undefined,
    aiPrevious: undefined,
    selected: 'original',
    edited: ['original'],
  };
}

/**
 * Tras hacer otra versión con IA: la nueva ya quedó guardada en la carta junto con la foto que se usó,
 * así que pasa a estar en uso. La que estaba antes sigue como opción hasta cerrar la ventana.
 */
export function afterNewVersion(draft: CardEditDraft, newAi: string, previousAi?: string): CardEditDraft {
  return {
    ...draft,
    ai: newAi,
    aiPrevious: previousAi,
    selected: 'ai',
    inUse: 'ai',
    edited: [],
  };
}

export type ChoiceStatus = 'inUse' | 'onSave' | 'free';

/** Cómo va una opción: la guardada, la que se aplicará al guardar o una que se puede elegir sin costo. */
export function choiceStatus(draft: CardEditDraft, choice: CardImageChoice): ChoiceStatus {
  if (choice !== draft.selected) return 'free';
  return choice === draft.inUse ? 'inUse' : 'onSave';
}

export interface CardSavePlan {
  updates: Partial<Card>;
  /** Guardar así borra la versión con IA de la carta: recuperarla después cuesta otro token. */
  losesAi: boolean;
}

/** Lo que hay que escribir en la carta para que quede como se ve en la ventana. Sin cambios, nada. */
export function saveUpdates(card: EditableCard, draft: CardEditDraft): CardSavePlan {
  const updates: Partial<Card> = {};
  const title = draft.title.trim();
  if (title !== card.title) updates.title = title;

  const image = draftImage(draft);
  if (!image) return { updates, losesAi: false };

  if (draft.selected === 'original') {
    if (card.isAiGenerated === true) {
      // Lo mismo que «Volver a la foto original»: la carta deja de ser con IA.
      return { updates: { ...updates, image, originalImage: undefined, isAiGenerated: false }, losesAi: true };
    }
    if (draft.edited.includes('original')) updates.image = image;
    return { updates, losesAi: false };
  }

  if (draft.selected !== draft.inUse || draft.edited.includes(draft.selected)) updates.image = image;
  return { updates, losesAi: false };
}

export type TitleProblem = 'empty' | 'invalid' | 'duplicate';

const normalizeTitle = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();

/** Las mismas reglas del nombre que al agregar una carta: no vacío, imprimible y sin repetir el de otra. */
export function titleProblem(title: string, otherTitles: readonly string[]): TitleProblem | null {
  const normalized = normalizeTitle(title);
  if (!normalized) return 'empty';
  if (!isPrintableCardTitle(title)) return 'invalid';
  return otherTitles.some((other) => normalizeTitle(other) === normalized) ? 'duplicate' : null;
}
