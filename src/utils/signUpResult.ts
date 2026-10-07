export const EMAIL_ALREADY_REGISTERED_MESSAGE = 'User already registered';

/**
 * Con la confirmación de correo activa, Supabase no devuelve error al registrar
 * un correo que ya tiene cuenta: responde con un usuario sin identidades.
 */
export const isEmailAlreadyRegistered = (
  user: { identities?: unknown[] | null } | null | undefined
): boolean => Array.isArray(user?.identities) && user.identities.length === 0;
