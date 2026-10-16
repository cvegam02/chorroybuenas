import { describe, expect, it } from 'vitest';
import {
  canPublish,
  publishChecklist,
  savedAgoLabel,
  wizardSteps,
  type PublishCheckInput,
  type WizardFacts,
} from '../../src/utils/seasonalWizard';
import { seasonalFormFromLoteria } from '../../src/utils/seasonalLoteria';

const empty: WizardFacts = {
  name_es: 'Baby shower',
  description_es: null,
  card_count: null,
  board_count: null,
  price_cents: null,
  hasPdf: false,
  hasCover: false,
};

describe('wizardSteps', () => {
  it('un borrador recién empezado no tiene pasos terminados', () => {
    const steps = wizardSteps(empty);
    expect(steps.map((step) => step.title)).toEqual(['Lo básico', 'Cartas', 'Tableros', 'Vitrina', 'Precio y publicación']);
    expect(steps.map((step) => step.description)).toEqual([
      'Nombre, temática y modo',
      'Sube tus cartas',
      'Cuántos tableros',
      'Portada y muestras',
      'Precio, fechas y publicar',
    ]);
    expect(steps.every((step) => !step.done)).toBe(true);
  });

  it('marca terminado cada paso según lo guardado', () => {
    const steps = wizardSteps({
      ...empty,
      description_es: 'Para el bebé',
      card_count: 32,
      board_count: 20,
      hasPdf: true,
      hasCover: true,
      price_cents: 9000,
    });
    expect(steps.map((step) => step.done)).toEqual([true, true, true, true, true]);
    expect(steps[1].description).toBe('32 cartas');
    expect(steps[2].description).toBe('20 tableros');
  });

  it('los tableros no están terminados sin PDF', () => {
    expect(wizardSteps({ ...empty, board_count: 1 })[2]).toMatchObject({ description: '1 tablero', done: false });
  });

  it('lo básico pide nombre y descripción', () => {
    expect(wizardSteps({ ...empty, description_es: '  ' })[0].done).toBe(false);
  });
});

describe('savedAgoLabel', () => {
  const savedAt = new Date('2026-10-15T18:00:00Z');
  it('dice hace cuánto se guardó', () => {
    expect(savedAgoLabel(savedAt, new Date('2026-10-15T18:00:40Z'))).toBe('hace unos segundos');
    expect(savedAgoLabel(savedAt, new Date('2026-10-15T18:05:10Z'))).toBe('hace 5 min');
    expect(savedAgoLabel(savedAt, new Date('2026-10-15T19:10:00Z'))).toBe('hace más de una hora');
  });
});

describe('seasonalFormFromLoteria', () => {
  it('una nueva toma la temática si solo hay una', () => {
    expect(seasonalFormFromLoteria(null, [{ id: 's1' }]).seasonId).toBe('s1');
    expect(seasonalFormFromLoteria(null, [{ id: 's1' }, { id: 's2' }]).seasonId).toBe('');
  });

  it('una guardada pasa sus datos al formulario', () => {
    const form = seasonalFormFromLoteria(
      {
        season_id: 's2',
        name_es: 'Boda',
        name_en: null,
        description_es: 'Para la boda',
        description_en: null,
        grid_size: 9,
        card_count: 12,
        board_count: null,
        price_cents: 4950,
        valid_from: null,
        valid_until: null,
      },
      [],
    );
    expect(form).toMatchObject({ seasonId: 's2', nameEs: 'Boda', nameEn: '', gridSize: 9, cardCount: '12', boardCount: '', price: '49.50' });
  });
});

describe('publishChecklist', () => {
  const ready: PublishCheckInput = {
    nameEs: 'Baby shower',
    descriptionEs: 'Tierna',
    cardCount: 32,
    boardCount: 20,
    price: '90',
    gridSize: 16,
    buildsPdf: true,
    hasPdf: true,
    pdfIsCurrent: true,
    hasCover: true,
  };
  const labels = (input: PublishCheckInput) => publishChecklist(input).map((check) => `${check.ok ? '✓' : '!'} ${check.label}`);

  it('con todo listo, los seis requisitos de §18 en ✓ y se puede publicar', () => {
    expect(labels(ready)).toEqual([
      '✓ Nombre y descripción',
      '✓ 32 cartas (mínimo 24)',
      '✓ 20 tableros',
      '✓ PDF generado',
      '✓ Portada',
      '✓ Precio: $90.00',
    ]);
    expect(canPublish(publishChecklist(ready))).toBe(true);
  });

  it('sin precio dice «Falta el precio» y no se puede publicar', () => {
    const checks = publishChecklist({ ...ready, price: '  ' });
    expect(checks[5]).toEqual({ id: 'price', step: 'publish', ok: false, label: 'Falta el precio' });
    expect(canPublish(checks)).toBe(false);
  });

  it('un precio menor a $10 o mal escrito no cuenta', () => {
    expect(labels({ ...ready, price: '5' })[5]).toBe('! El precio mínimo es $10.00.');
    expect(labels({ ...ready, price: '9.99' })[5]).toBe('! El precio mínimo es $10.00.');
    expect(labels({ ...ready, price: 'noventa' })[5]).toBe('! Escribe el precio en pesos, por ejemplo 49 o 49.50.');
    expect(labels({ ...ready, price: '10' })[5]).toBe('✓ Precio: $10.00');
  });

  it('dice qué falta de nombre y descripción', () => {
    expect(labels({ ...ready, descriptionEs: ' ' })[0]).toBe('! Falta la descripción');
    expect(labels({ ...ready, nameEs: '' })[0]).toBe('! Falta el nombre');
    expect(labels({ ...ready, nameEs: '', descriptionEs: '' })[0]).toBe('! Faltan el nombre y la descripción');
  });

  it('con «Subir mis cartas» exige el mínimo del modo', () => {
    expect(labels({ ...ready, cardCount: null })[1]).toBe('! Faltan las cartas (mínimo 24 en Clásico)');
    expect(labels({ ...ready, cardCount: 20 })[1]).toBe('! Faltan 4 cartas para el mínimo en Clásico, que es 24');
    expect(labels({ ...ready, gridSize: 9, cardCount: 9 })[1]).toBe('✓ 9 cartas (mínimo 9)');
  });

  it('con «Subir mis cartas» pide tableros; con ellos, el PDF que falte o no esté al día se arma al guardar', () => {
    expect(labels({ ...ready, boardCount: null })[2]).toBe('! Faltan los tableros');
    expect(labels({ ...ready, boardCount: null, hasPdf: false, pdfIsCurrent: false })[3]).toBe('! Falta generar el PDF');
    expect(labels({ ...ready, boardCount: null, pdfIsCurrent: false })[3]).toBe('! Falta generar el PDF');
    expect(labels({ ...ready, hasPdf: false, pdfIsCurrent: false })[3]).toBe('✓ El PDF se arma al guardar');
    expect(labels({ ...ready, pdfIsCurrent: false })[3]).toBe('✓ El PDF se vuelve a armar al guardar, con los últimos cambios');
  });

  it('con «Ya tengo el PDF» pide los números escritos y el PDF subido, sin mínimo de cartas', () => {
    const own = { ...ready, buildsPdf: false, pdfIsCurrent: false, cardCount: 12 };
    expect(labels(own).slice(1, 4)).toEqual(['✓ 12 cartas', '✓ 20 tableros', '✓ PDF subido']);
    expect(labels({ ...own, cardCount: null, boardCount: null, hasPdf: false }).slice(1, 4)).toEqual([
      '! Falta el número de cartas',
      '! Falta el número de tableros',
      '! Falta subir el PDF',
    ]);
  });

  it('cada requisito dice en qué paso se completa', () => {
    expect(publishChecklist(ready).map((check) => check.step)).toEqual(['basics', 'cards', 'boards', 'boards', 'showcase', 'publish']);
    expect(publishChecklist({ ...ready, buildsPdf: false }).map((check) => check.step)).toEqual([
      'basics',
      'cards',
      'cards',
      'cards',
      'showcase',
      'publish',
    ]);
    expect(labels({ ...ready, hasCover: false })[4]).toBe('! Falta la portada');
  });
});
