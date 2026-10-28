import { describe, expect, it } from 'vitest';
import { pickSpanishVoice } from '../../src/utils/callerVoice';

const voice = (lang: string, name = lang, localService = true) => ({ lang, name, localService });

describe('voz del navegador para el cantador (FEAT-55, US A4)', () => {
  it('prefiere español de México', () => {
    const voices = [voice('en-US'), voice('es-ES'), voice('es-MX', 'Paulina'), voice('es-US')];
    expect(pickSpanishVoice(voices)?.name).toBe('Paulina');
  });

  it('acepta el código con guion bajo o en minúsculas', () => {
    expect(pickSpanishVoice([voice('es-ES'), voice('es_mx', 'Android MX')])?.name).toBe('Android MX');
  });

  it('sin México, toma español de Latinoamérica o de Estados Unidos antes que el de España', () => {
    expect(pickSpanishVoice([voice('es-ES'), voice('es-US', 'US')])?.name).toBe('US');
    expect(pickSpanishVoice([voice('es-ES'), voice('es-419', 'Latam')])?.name).toBe('Latam');
  });

  it('sin esas, cualquier español', () => {
    expect(pickSpanishVoice([voice('en-GB'), voice('es-ES', 'España')])?.name).toBe('España');
    expect(pickSpanishVoice([voice('es', 'Genérica')])?.name).toBe('Genérica');
  });

  it('entre dos del mismo país, prefiere la que no necesita internet', () => {
    const voices = [voice('es-MX', 'En línea', false), voice('es-MX', 'Local', true)];
    expect(pickSpanishVoice(voices)?.name).toBe('Local');
  });

  it('sin ninguna voz en español, null', () => {
    expect(pickSpanishVoice([voice('en-US'), voice('fr-FR'), voice('est-EE')])).toBeNull();
    expect(pickSpanishVoice([])).toBeNull();
  });
});
