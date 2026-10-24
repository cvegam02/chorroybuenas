import { describe, expect, it } from 'vitest';
import {
  AI_VOICE_PRICE,
  AI_VOICES,
  INTRO_AUDIO_ID,
  audioUrlFor,
  pendingAudioIds,
  shouldRefund,
} from '../../src/utils/callerAiVoice';

const cards = [
  { id: 'a', title: 'El Tío Beto' },
  { id: 'b', title: 'La Abuela Chela' },
  { id: 'c', title: 'Doce' },
];

describe('las voces con IA', () => {
  it('son las 8 voces mexicanas de la decisión 29, con su nombre y su muestra', () => {
    expect(AI_VOICES.map((v) => [v.id, v.name])).toEqual([
      ['y2ijeTfmnXjzheHO6zeN', 'jose'],
      ['qRUgOhnxGASxirG4fKjv', 'david'],
      ['gbTn1bmCvNgk0QEAVyfM', 'enriqueNieto'],
      ['iDEmt5MnqUotdwCIVplo', 'enriqueMondragon'],
      ['hHjbwzYZW17oh0p05AKv', 'gabriela'],
      ['twZzvyYIl5ntDHC1Vatv', 'angelica'],
      ['ay4iqk10DLwc8KGSrf2t', 'azucena'],
      ['JYyJjNPfmNJdaby8LdZs', 'marlene'],
    ]);
    expect(AI_VOICES[0].sample).toBe('/audio/voces/y2ijeTfmnXjzheHO6zeN.mp3');
  });

  it('cuesta 10 tokens', () => {
    expect(AI_VOICE_PRICE).toBe(10);
  });
});

describe('pendingAudioIds', () => {
  it('recién pagada, falta la frase de arranque y todas las cartas', () => {
    expect(pendingAudioIds(cards, new Map(), false)).toEqual([INTRO_AUDIO_ID, 'a', 'b', 'c']);
  });

  it('con todo generado, no falta nada', () => {
    const audios = new Map(cards.map((c) => [c.id, c.title]));
    expect(pendingAudioIds(cards, audios, true)).toEqual([]);
  });

  it('faltan las cartas agregadas y las renombradas (decisión 15)', () => {
    const audios = new Map([['a', 'El Tío Beto'], ['b', 'La Abuela']]);
    expect(pendingAudioIds(cards, audios, true)).toEqual(['b', 'c']);
  });
});

describe('audioUrlFor', () => {
  const urls = new Map([['a', 'https://x/a.mp3'], [INTRO_AUDIO_ID, 'https://x/intro.mp3']]);
  const titles = new Map([['a', 'El Tío Beto']]);

  it('da el audio de una carta con su título', () => {
    expect(audioUrlFor(urls, titles, cards[0])).toBe('https://x/a.mp3');
  });

  it('no da el audio de una carta renombrada', () => {
    expect(audioUrlFor(urls, titles, { id: 'a', title: 'Beto' })).toBeUndefined();
  });

  it('no da nada a una carta sin audio', () => {
    expect(audioUrlFor(urls, titles, cards[1])).toBeUndefined();
  });
});

describe('shouldRefund (decisión 11)', () => {
  it('se pide la devolución si no hay ningún audio de carta', () => {
    expect(shouldRefund(0)).toBe(true);
  });

  it('no se pide si salió alguna carta', () => {
    expect(shouldRefund(1)).toBe(false);
  });
});
