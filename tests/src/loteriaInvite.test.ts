import { describe, expect, it } from 'vitest';
import { inviteFromRow, inviteLink, invitePreviewFromJson, whatsAppShareLink } from '../../src/utils/loteriaInvite';

describe('inviteLink', () => {
  it('arma el enlace a la página para unirse', () => {
    expect(inviteLink('https://chorroybuenas.com.mx', '0123456789abcdef')).toBe(
      'https://chorroybuenas.com.mx/unirse/0123456789abcdef',
    );
  });

  it('no duplica la diagonal si el origen la trae', () => {
    expect(inviteLink('https://dev.chorroybuenas.com.mx/', 'abc')).toBe('https://dev.chorroybuenas.com.mx/unirse/abc');
  });
});

describe('whatsAppShareLink', () => {
  it('abre WhatsApp con el mensaje ya escrito', () => {
    expect(whatsAppShareLink('¡Sube tus fotos! https://x.mx/unirse/abc')).toBe(
      'https://wa.me/?text=%C2%A1Sube%20tus%20fotos!%20https%3A%2F%2Fx.mx%2Funirse%2Fabc',
    );
  });
});

describe('inviteFromRow', () => {
  it('lee el enlace que devuelve la base', () => {
    expect(inviteFromRow({ set_id: 's1', code: '0123456789abcdef', is_open: true })).toEqual({
      setId: 's1',
      code: '0123456789abcdef',
      isOpen: true,
    });
  });

  it('rechaza lo que no tiene la forma esperada', () => {
    expect(() => inviteFromRow(null)).toThrow();
    expect(() => inviteFromRow({ set_id: 's1', code: 5, is_open: true })).toThrow();
    expect(() => inviteFromRow({ set_id: 's1', code: 'abc' })).toThrow();
  });
});

describe('invitePreviewFromJson', () => {
  it('lee un enlace abierto para quien no es de la lotería', () => {
    expect(
      invitePreviewFromJson({
        status: 'open', role: 'none', set_id: null, set_name: 'Posada', organizer_name: 'Ana', card_count: 12,
      }),
    ).toEqual({ status: 'open', role: 'none', setId: null, setName: 'Posada', organizerName: 'Ana', cardCount: 12 });
  });

  it('lee la lotería del invitado o del dueño, sin organizador si no tiene nombre', () => {
    expect(
      invitePreviewFromJson({
        status: 'open', role: 'guest', set_id: 's1', set_name: 'Posada', organizer_name: null, card_count: 0,
      }),
    ).toEqual({ status: 'open', role: 'guest', setId: 's1', setName: 'Posada', organizerName: null, cardCount: 0 });
  });

  it('lee el enlace que ya no sirve y al invitado quitado', () => {
    expect(invitePreviewFromJson({ status: 'unavailable' })).toEqual({ status: 'unavailable' });
    expect(invitePreviewFromJson({ status: 'removed' })).toEqual({ status: 'removed' });
  });

  it('toma lo que no entiende como un enlace que no sirve', () => {
    expect(invitePreviewFromJson(null)).toEqual({ status: 'unavailable' });
    expect(invitePreviewFromJson({ status: 'open', role: 'raro' })).toEqual({ status: 'unavailable' });
    expect(invitePreviewFromJson({ status: 'open', role: 'guest', set_id: null, set_name: 'x', card_count: 1 })).toEqual({
      status: 'unavailable',
    });
  });
});
