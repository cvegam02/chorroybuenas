import { describe, expect, it } from 'vitest';
import {
  afterNewVersion,
  choiceStatus,
  draftImage,
  initialDraft,
  saveUpdates,
  selectChoice,
  titleProblem,
  withCrop,
  withNewPhoto,
} from '../../src/utils/cardEditDraft';

const photoCard = { title: 'La Chata', image: 'foto', isAiGenerated: false };
const aiCard = { title: 'La Chata', image: 'ia-1', originalImage: 'foto', isAiGenerated: true };

describe('opciones de imagen al abrir «Editar carta» (FEAT-34, US A8)', () => {
  it('una carta sin IA solo tiene su foto, en uso', () => {
    const draft = initialDraft(photoCard);
    expect(draft).toMatchObject({ original: 'foto', selected: 'original', inUse: 'original' });
    expect(draft.ai).toBeUndefined();
    expect(draftImage(draft)).toBe('foto');
  });

  it('una carta con IA tiene la foto original y la versión con IA, que es la que está en uso', () => {
    const draft = initialDraft(aiCard);
    expect(draft).toMatchObject({ original: 'foto', ai: 'ia-1', selected: 'ai', inUse: 'ai' });
    expect(draftImage(draft)).toBe('ia-1');
  });

  it('una carta con IA que ya no guarda su foto original solo ofrece la versión con IA', () => {
    const draft = initialDraft({ title: 'X', image: 'ia-1', isAiGenerated: true });
    expect(draft.original).toBeUndefined();
    expect(selectChoice(draft, 'original').selected).toBe('ai');
  });

  it('dice cómo va cada opción: en uso, se aplica al guardar o libre', () => {
    const draft = selectChoice(initialDraft(aiCard), 'original');
    expect(choiceStatus(draft, 'original')).toBe('onSave');
    expect(choiceStatus(draft, 'ai')).toBe('free');
    expect(choiceStatus(initialDraft(aiCard), 'ai')).toBe('inUse');
  });
});

describe('lo que se guarda al pulsar «Guardar cambios» (FEAT-34, US A8)', () => {
  it('sin cambios no se guarda nada', () => {
    expect(saveUpdates(photoCard, initialDraft(photoCard))).toEqual({ updates: {}, losesAi: false });
    expect(saveUpdates(aiCard, initialDraft(aiCard))).toEqual({ updates: {}, losesAi: false });
  });

  it('solo el nombre, sin tocar la imagen', () => {
    const draft = { ...initialDraft(aiCard), title: '  El Sol ' };
    expect(saveUpdates(aiCard, draft)).toEqual({ updates: { title: 'El Sol' }, losesAi: false });
  });

  it('un recorte de la foto guarda la foto recortada', () => {
    const draft = withCrop(initialDraft(photoCard), 'foto-recortada');
    expect(saveUpdates(photoCard, draft)).toEqual({ updates: { image: 'foto-recortada' }, losesAi: false });
  });

  it('un recorte de la versión con IA la deja como carta con IA', () => {
    const draft = withCrop(initialDraft(aiCard), 'ia-recortada');
    expect(saveUpdates(aiCard, draft)).toEqual({ updates: { image: 'ia-recortada' }, losesAi: false });
  });

  it('elegir la foto original en una carta con IA borra la versión con IA, y lo avisa', () => {
    const draft = selectChoice(initialDraft(aiCard), 'original');
    const { updates, losesAi } = saveUpdates(aiCard, draft);
    expect(losesAi).toBe(true);
    expect(updates).toMatchObject({ image: 'foto', isAiGenerated: false });
    expect('originalImage' in updates && updates.originalImage === undefined).toBe(true);
  });

  it('elegir la foto y regresar a la versión con IA no cambia nada', () => {
    const draft = selectChoice(selectChoice(initialDraft(aiCard), 'original'), 'ai');
    expect(saveUpdates(aiCard, draft)).toEqual({ updates: {}, losesAi: false });
  });

  it('una foto nueva en una carta con IA deja la foto y borra la versión con IA', () => {
    const draft = withNewPhoto(initialDraft(aiCard), 'foto-nueva');
    expect(draft).toMatchObject({ original: 'foto-nueva', selected: 'original' });
    expect(draft.ai).toBeUndefined();
    const { updates, losesAi } = saveUpdates(aiCard, draft);
    expect(losesAi).toBe(true);
    expect(updates).toMatchObject({ image: 'foto-nueva', isAiGenerated: false });
  });

  it('una foto nueva en una carta sin IA solo cambia la foto', () => {
    const draft = withNewPhoto(initialDraft(photoCard), 'foto-nueva');
    expect(saveUpdates(photoCard, draft)).toEqual({ updates: { image: 'foto-nueva' }, losesAi: false });
  });
});

describe('otra versión con IA hecha desde la ventana (FEAT-34, US A8)', () => {
  // La versión nueva ya quedó guardada en la carta: así se ve la carta después de generarla.
  const cardAfter = { title: 'La Chata', image: 'ia-2', originalImage: 'foto', isAiGenerated: true };

  it('la nueva queda en uso y la anterior sigue disponible hasta guardar', () => {
    const draft = afterNewVersion(initialDraft(aiCard), 'ia-2', 'ia-1');
    expect(draft).toMatchObject({ original: 'foto', ai: 'ia-2', aiPrevious: 'ia-1', selected: 'ai', inUse: 'ai' });
  });

  it('quedarse con la nueva no guarda nada más: ya está en la carta', () => {
    const draft = afterNewVersion(initialDraft(aiCard), 'ia-2', 'ia-1');
    expect(saveUpdates(cardAfter, draft)).toEqual({ updates: {}, losesAi: false });
  });

  it('regresar a la versión anterior la vuelve a poner en la carta, que sigue siendo con IA', () => {
    const draft = selectChoice(afterNewVersion(initialDraft(aiCard), 'ia-2', 'ia-1'), 'aiPrevious');
    expect(saveUpdates(cardAfter, draft)).toEqual({ updates: { image: 'ia-1' }, losesAi: false });
  });

  it('la primera versión con IA de una carta no deja «anterior»', () => {
    const draft = afterNewVersion(initialDraft(photoCard), 'ia-1');
    expect(draft).toMatchObject({ original: 'foto', ai: 'ia-1', selected: 'ai', inUse: 'ai' });
    expect(draft.aiPrevious).toBeUndefined();
  });

  it('la foto usada para la versión nueva ya quedó guardada con ella', () => {
    const cropped = withCrop(selectChoice(initialDraft(aiCard), 'original'), 'foto-recortada');
    const draft = afterNewVersion(cropped, 'ia-2', 'ia-1');
    expect(saveUpdates({ ...cardAfter, originalImage: 'foto-recortada' }, draft)).toEqual({ updates: {}, losesAi: false });
  });
});

describe('nombre de la carta en «Editar carta» (FEAT-34, US A8)', () => {
  const others = ['El Sol', 'La Luna'];

  it('acepta un nombre nuevo o el que ya tenía', () => {
    expect(titleProblem('La Chata', others)).toBeNull();
  });

  it('no acepta un nombre vacío', () => {
    expect(titleProblem('   ', others)).toBe('empty');
  });

  it('no acepta el nombre de otra carta, sin importar mayúsculas ni espacios', () => {
    expect(titleProblem('  el   sol ', others)).toBe('duplicate');
  });

  it('no acepta emojis ni letras de otros alfabetos', () => {
    expect(titleProblem('La Chata 🐶', others)).toBe('invalid');
  });
});
