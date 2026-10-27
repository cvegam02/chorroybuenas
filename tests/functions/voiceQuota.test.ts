import { describe, expect, it, vi } from 'vitest';
import {
  buildQuotaAlertEmail, creditsFor, ensureVoiceQuota, parseSubscription, type Subscription, type VoiceQuotaDeps,
} from '../../supabase/functions/_shared/voiceQuota.ts';

const sub = (used: number, limit = 37_875): Subscription => ({ used, limit, period: '1795562086' });

const deps = (subscription: Subscription | null, overrides: Partial<VoiceQuotaDeps> = {}) => ({
  fetchSubscription: vi.fn(async () => subscription),
  claimAlert: vi.fn(async () => true),
  releaseAlert: vi.fn(async () => {}),
  sendAlert: vi.fn(async () => {}),
  log: vi.fn(),
  ...overrides,
});

describe('parseSubscription', () => {
  it('lee los créditos usados, el límite y el periodo de ElevenLabs', () => {
    expect(parseSubscription({ character_count: 2768, character_limit: 37875, next_character_count_reset_unix: 1795562086 }))
      .toEqual({ used: 2768, limit: 37875, period: '1795562086' });
  });

  it('una respuesta sin números no sirve', () => {
    expect(parseSubscription({ character_count: '2768' })).toBeNull();
    expect(parseSubscription(null)).toBeNull();
  });
});

describe('creditsFor (medición del 2026-10-26)', () => {
  it('unos 26 créditos por carta, más la frase si hace falta', () => {
    expect(creditsFor(54, false)).toBe(54 * 26);
    expect(creditsFor(54, true)).toBe(54 * 26 + 50);
    expect(creditsFor(0, false)).toBe(0);
  });
});

describe('ensureVoiceQuota (decisión 11)', () => {
  it('con cupo de sobra, sigue sin alerta', async () => {
    const d = deps(sub(2_000));
    await expect(ensureVoiceQuota(d, 1_500)).resolves.toBeUndefined();
    expect(d.sendAlert).not.toHaveBeenCalled();
  });

  it('si no alcanza, lanza VOICE_UNAVAILABLE (no se cobra) y avisa al administrador', async () => {
    const d = deps(sub(37_000));
    await expect(ensureVoiceQuota(d, 1_500)).rejects.toThrow('VOICE_UNAVAILABLE');
    expect(d.sendAlert).toHaveBeenCalledOnce();
  });

  it('si no se pudo consultar el cupo, tampoco se cobra', async () => {
    await expect(ensureVoiceQuota(deps(null), 10)).rejects.toThrow('VOICE_UNAVAILABLE');
  });

  it('si después de esta lotería queda menos del 20 %, sigue y avisa', async () => {
    const d = deps(sub(29_000));
    await expect(ensureVoiceQuota(d, 1_500)).resolves.toBeUndefined();
    expect(d.claimAlert).toHaveBeenCalledWith('1795562086');
    expect(d.sendAlert).toHaveBeenCalledOnce();
  });

  it('una sola alerta por periodo', async () => {
    const d = deps(sub(29_000), { claimAlert: vi.fn(async () => false) });
    await ensureVoiceQuota(d, 1_500);
    expect(d.sendAlert).not.toHaveBeenCalled();
  });

  it('si el correo falla, se libera la marca para reintentar y el usuario sigue', async () => {
    const d = deps(sub(29_000), { sendAlert: vi.fn(async () => { throw new Error('resend'); }) });
    await expect(ensureVoiceQuota(d, 1_500)).resolves.toBeUndefined();
    expect(d.releaseAlert).toHaveBeenCalledWith('1795562086');
    expect(d.log).toHaveBeenCalled();
  });
});

describe('buildQuotaAlertEmail', () => {
  it('dice cuánto queda del cupo', () => {
    const email = buildQuotaAlertEmail(sub(31_000));
    expect(email.subject).toContain('voz con IA');
    expect(email.text).toContain('6,875');
    expect(email.text).toContain('37,875');
  });
});
