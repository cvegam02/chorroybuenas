import { describe, expect, it } from 'vitest';
import { guestCardError, guestImagePath, uploaderName } from '../../src/utils/guestCards';

describe('guestImagePath', () => {
  it('pone la imagen en la carpeta del invitado dentro de la del dueño', () => {
    expect(guestImagePath('dueno', 'invitado', 'carta', 'image/jpeg', 1700)).toBe('dueno/guests/invitado/carta_1700.jpg');
  });

  it('guarda como png lo que no es jpeg', () => {
    expect(guestImagePath('d', 'i', 'c', 'image/png', 1)).toBe('d/guests/i/c_1.png');
    expect(guestImagePath('d', 'i', 'c', '', 1)).toBe('d/guests/i/c_1.png');
  });
});

describe('guestCardError', () => {
  it('reconoce los motivos de la base', () => {
    expect(guestCardError('DUPLICATE_TITLE')).toBe('duplicateTitle');
    expect(guestCardError('error: INVITE_UNAVAILABLE')).toBe('closed');
    expect(guestCardError('INVALID_TITLE')).toBe('invalidTitle');
  });

  it('lo demás es un error cualquiera', () => {
    expect(guestCardError('network down')).toBe('unknown');
    expect(guestCardError(undefined)).toBe('unknown');
  });
});

describe('uploaderName', () => {
  const members = new Map([
    ['ana', { name: 'Ana', isOwner: true }],
    ['beto', { name: null, isOwner: false }],
  ]);

  it('da el nombre de quien subió la carta; sin invitado, el del dueño', () => {
    expect(uploaderName(null, members)).toEqual({ kind: 'named', name: 'Ana' });
    expect(uploaderName('ana', members)).toEqual({ kind: 'named', name: 'Ana' });
  });

  it('sin nombre en la cuenta, dice si es invitado u organizador', () => {
    expect(uploaderName('beto', members)).toEqual({ kind: 'guest' });
    expect(uploaderName('nadie', members)).toEqual({ kind: 'guest' });
    expect(uploaderName(null, new Map([['ana', { name: null, isOwner: true }]]))).toEqual({ kind: 'owner' });
  });
});
