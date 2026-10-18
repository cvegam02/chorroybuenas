import { describe, expect, it } from 'vitest';
import {
  attemptPath,
  buildSeasonalCardPrompt,
  buildSeasonalCardPrediction,
  parseGenerateCardRequest,
  seasonalCardErrorResponse,
} from '../../supabase/functions/_shared/seasonalCard.ts';

const CARD = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';

describe('generate-seasonal-card (FEAT-50, US A2)', () => {
  it('solo acepta el id de una carta', () => {
    expect(parseGenerateCardRequest({ card_id: CARD })).toEqual({ ok: true, value: { cardId: CARD } });
    expect(parseGenerateCardRequest({ card_id: 'x' }).ok).toBe(false);
    expect(parseGenerateCardRequest(null).ok).toBe(false);
  });

  it('arma el prompt con el formato de Carlos: prompt general y luego número, nombre y escena', () => {
    const prompt = buildSeasonalCardPrompt('Lotería navideña, estilo acuarela.', {
      number: 6,
      name: 'LA SIRENA',
      scene: 'una sirena con gorro de Santa sentada sobre un témpano de hielo.',
    });
    expect(prompt).toBe(
      'Lotería navideña, estilo acuarela.\n\n' +
        'Número: "6"\n' +
        'Nombre: "LA SIRENA"\n' +
        'Escena: una sirena con gorro de Santa sentada sobre un témpano de hielo.',
    );
  });

  it('sin escena, no agrega el renglón de escena', () => {
    expect(buildSeasonalCardPrompt('General', { number: 1, name: 'EL GALLO', scene: '  ' })).toBe(
      'General\n\nNúmero: "1"\nNombre: "EL GALLO"',
    );
  });

  it('pide a gpt-image-2 una carta 2:3 en WebP con la calidad elegida', () => {
    expect(buildSeasonalCardPrediction('P', 'medium', 'https://firmada.test/6')).toEqual({
      input: {
        prompt: 'P',
        input_images: ['https://firmada.test/6'],
        aspect_ratio: '2:3',
        quality: 'medium',
        output_format: 'webp',
        number_of_images: 1,
      },
    });
  });

  it('sin imagen de entrada no manda input_images', () => {
    const body = buildSeasonalCardPrediction('P', 'low', null);
    expect(body.input).not.toHaveProperty('input_images');
  });

  it('guarda cada intento en la carpeta de su lotería y su carta', () => {
    expect(attemptPath('L', 'C', 'A')).toBe('L/C/A.webp');
  });

  it('traduce los errores conocidos a mensajes para el administrador', () => {
    expect(seasonalCardErrorResponse(new Error('BASE_CARD_MISSING'))).toMatchObject({
      status: 409,
      body: { error: 'BASE_CARD_MISSING' },
      internal: false,
    });
    expect(seasonalCardErrorResponse(new Error('REFERENCE_MISSING')).status).toBe(409);
    expect(seasonalCardErrorResponse(new Error('PROMPT_MISSING')).status).toBe(400);
    expect(seasonalCardErrorResponse(new Error('AI_TIMEOUT')).status).toBe(504);
    expect(seasonalCardErrorResponse(new Error('AI_BUSY')).status).toBe(503);
    expect(seasonalCardErrorResponse(new Error('NSFW_FILTER')).status).toBe(422);
    expect(seasonalCardErrorResponse(new Error('algo raro'))).toMatchObject({
      status: 502,
      body: { error: 'AI_ERROR' },
      internal: true,
    });
  });
});
