/**
 * Nombre que se propone para una lotería nueva: «Nueva lotería N», con N uno más que el mayor que ya existe
 * con ese nombre (1 si no hay ninguna).
 */
export const nextNewLoteriaName = (existingNames: readonly string[], baseName: string): string => {
  const base = (baseName || 'Nueva lotería').trim();
  const numbers = existingNames
    .filter((name) => name.startsWith(base))
    .map((name) => {
      const number = parseInt(name.slice(base.length).trim(), 10);
      return Number.isInteger(number) && number >= 1 ? number : null;
    })
    .filter((number): number is number => number !== null);
  return `${base} ${numbers.length > 0 ? Math.max(...numbers) + 1 : 1}`;
};
