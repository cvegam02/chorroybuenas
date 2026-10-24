import { describe, expect, it } from 'vitest';
import {
  audioPath, buildSpeechBody, CALLER_INTRO_TEXT, CALLER_VOICES, mapCallerVoiceError, needsAudio,
  parseCallerVoiceRequest, toCallerVoiceErrorResponse,
} from '../../supabase/functions/_shared/callerVoice.ts';

const SET = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';
const CARD = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const USER = '11111111-2222-4333-8444-555555555555';

describe('parseCallerVoiceRequest', () => {
  it('acepta cobrar con una de las cuatro voces', () => {
    expect(parseCallerVoiceRequest({ action: 'start', set_id: SET, voice_id: 'Spanish_Wiselady' })).toEqual({
      ok: true, value: { action: 'start', setId: SET, voiceId: 'Spanish_Wiselady' },
    });
  });

  it('rechaza una voz que no es de las cuatro', () => {
    expect(parseCallerVoiceRequest({ action: 'start', set_id: SET, voice_id: 'English_Wiselady' }).ok).toBe(false);
  });

  it('acepta generar el audio de una carta o de la frase de arranque', () => {
    expect(parseCallerVoiceRequest({ action: 'generate', set_id: SET, card_id: CARD })).toEqual({
      ok: true, value: { action: 'generate', setId: SET, cardId: CARD },
    });
    expect(parseCallerVoiceRequest({ action: 'generate', set_id: SET, card_id: 'intro' })).toEqual({
      ok: true, value: { action: 'generate', setId: SET, cardId: 'intro' },
    });
  });

  it('acepta pedir la devolución', () => {
    expect(parseCallerVoiceRequest({ action: 'refund', set_id: SET })).toEqual({
      ok: true, value: { action: 'refund', setId: SET },
    });
  });

  it.each([
    ['sin cuerpo', null],
    ['acción desconocida', { action: 'borrar', set_id: SET }],
    ['lotería que no es uuid', { action: 'refund', set_id: '../otro' }],
    ['carta que no es uuid', { action: 'generate', set_id: SET, card_id: '../../x' }],
    ['generar sin carta', { action: 'generate', set_id: SET }],
  ])('rechaza: %s', (_name, body) => {
    expect(parseCallerVoiceRequest(body).ok).toBe(false);
  });
});

describe('las voces', () => {
  it('son las cuatro que escogió Carlos (decisión 22)', () => {
    expect([...CALLER_VOICES]).toEqual([
      'Spanish_Narrator', 'Spanish_Steadymentor', 'Spanish_WiseScholar', 'Spanish_Wiselady',
    ]);
  });
});

describe('buildSpeechBody', () => {
  it('pide a MiniMax el título con la voz escogida, en español y en MP3', () => {
    expect(buildSpeechBody('La Abuela Chela', 'Spanish_Narrator')).toEqual({
      input: {
        text: 'La Abuela Chela',
        voice_id: 'Spanish_Narrator',
        language_boost: 'Spanish',
        audio_format: 'mp3',
      },
    });
  });

  it('la frase de arranque es la del cantador', () => {
    expect(CALLER_INTRO_TEXT).toBe('Se va y se corre con...');
  });
});

describe('audioPath', () => {
  it('guarda cada audio en la carpeta del dueño y de su lotería', () => {
    expect(audioPath(USER, SET, CARD)).toBe(`${USER}/${SET}/${CARD}.mp3`);
    expect(audioPath(USER, SET, 'intro')).toBe(`${USER}/${SET}/intro.mp3`);
  });
});

describe('needsAudio (decisión 15)', () => {
  it('una carta sin audio lo necesita', () => {
    expect(needsAudio(null, 'El Tío Beto')).toBe(true);
  });

  it('una carta renombrada necesita otro', () => {
    expect(needsAudio('El Tio Beto', 'El Tío Beto')).toBe(true);
  });

  it('una carta con el audio de su título no lo necesita', () => {
    expect(needsAudio('El Tío Beto', 'El Tío Beto')).toBe(false);
  });
});

describe('mapCallerVoiceError', () => {
  it.each(['INSUFFICIENT_TOKENS', 'VOICE_ALREADY_CREATED', 'INVALID_VOICE', 'SET_NOT_FOUND', 'AUDIOS_EXIST'])(
    'conserva %s',
    (code) => {
      expect(mapCallerVoiceError(`ERROR: ${code}`).message).toBe(code);
    },
  );

  it('conserva el detalle de cualquier otro error', () => {
    expect(mapCallerVoiceError('boom').message).toBe('caller voice rpc: boom');
  });
});

describe('toCallerVoiceErrorResponse', () => {
  it.each([
    ['INSUFFICIENT_TOKENS', 402],
    ['VOICE_ALREADY_CREATED', 409],
    ['AUDIOS_EXIST', 409],
    ['SET_NOT_FOUND', 404],
    ['CARD_NOT_FOUND', 404],
    ['VOICE_NOT_PAID', 403],
    ['AI_BUSY', 503],
    ['AI_TIMEOUT', 504],
  ])('%s responde %i', (code, status) => {
    const res = toCallerVoiceErrorResponse(new Error(code));
    expect(res.status).toBe(status);
    expect(res.body.error).toBe(code);
    expect(res.internal).toBe(false);
  });

  it('cualquier otro error es AI_ERROR y se registra', () => {
    const res = toCallerVoiceErrorResponse(new Error('Replicate API (500): x'));
    expect(res).toMatchObject({ status: 502, body: { error: 'AI_ERROR' }, internal: true });
  });
});
