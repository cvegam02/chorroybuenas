export const EMAIL_ALREADY_REGISTERED_MESSAGE = 'User already registered';

/** Correo de un dominio desechable: no se crea la cuenta (FEAT-58, decisión 1; migración 073). */
export const DISPOSABLE_EMAIL_MESSAGE = 'DISPOSABLE_EMAIL';

/**
 * Con la confirmación de correo activa, Supabase no devuelve error al registrar
 * un correo que ya tiene cuenta: responde con un usuario sin identidades.
 */
export const isEmailAlreadyRegistered = (
  user: { identities?: unknown[] | null } | null | undefined
): boolean => Array.isArray(user?.identities) && user.identities.length === 0;
