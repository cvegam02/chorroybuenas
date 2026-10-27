import { describe, expect, it } from 'vitest';
import {
  addRetryingWhenRateLimited, GUEST_CARDS_PER_LOTERIA, guestCardError, guestCardsLeft, guestImagePath, uploaderName,
} from '../../src/utils/guestCards';

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
    expect(guestCardError('GUEST_LIMIT')).toBe('guestLimit');
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

describe('guestCardsLeft (FEAT-58, decisión 9)', () => {
  const mine = (n: number) => Array.from({ length: n }, () => ({ uploadedBy: 'yo' }));

  it('cada invitado sube hasta 60 cartas por lotería', () => {
    expect(GUEST_CARDS_PER_LOTERIA).toBe(60);
    expect(guestCardsLeft([], 'yo')).toBe(60);
  });

  it('solo cuentan las suyas', () => {
    expect(guestCardsLeft([...mine(10), { uploadedBy: 'otro' }, { uploadedBy: null }], 'yo')).toBe(50);
  });

  it('nunca es negativo', () => {
    expect(guestCardsLeft(mine(61), 'yo')).toBe(0);
  });
});

describe('addRetryingWhenRateLimited (10 por minuto, FEAT-58 decisión 9)', () => {
  it('si la base pide esperar, espera y vuelve a intentar', async () => {
    const results = ['RATE_LIMITED', 'RATE_LIMITED', undefined];
    const waits: number[] = [];
    const error = await addRetryingWhenRateLimited(
      async () => results.shift(),
      async (ms) => {
        waits.push(ms);
      },
    );
    expect(error).toBeUndefined();
    expect(waits).toHaveLength(2);
  });

  it('otro error se devuelve sin esperar', async () => {
    const waits: number[] = [];
    const error = await addRetryingWhenRateLimited(
      async () => 'DUPLICATE_TITLE',
      async (ms) => {
        waits.push(ms);
      },
    );
    expect(error).toBe('DUPLICATE_TITLE');
    expect(waits).toHaveLength(0);
  });

  it('deja de esperar después de un par de minutos', async () => {
    let waited = 0;
    const error = await addRetryingWhenRateLimited(
      async () => 'error: RATE_LIMITED',
      async (ms) => {
        waited += ms;
      },
    );
    expect(error).toContain('RATE_LIMITED');
    expect(waited).toBeGreaterThanOrEqual(60_000);
    expect(waited).toBeLessThanOrEqual(120_000);
  });
});
