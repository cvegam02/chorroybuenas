/** Barra de pasos del flujo de crear una lotería: C1 Cartas, C2 Tableros y C3 Vista previa (FEAT-34). */

export interface CreateStep {
  id: 'cards' | 'boards' | 'download';
  /** Número del paso, desde 1. */
  number: number;
  path: string;
}

export const CREATE_STEPS: readonly CreateStep[] = [
  { id: 'cards', number: 1, path: '/cards' },
  { id: 'boards', number: 2, path: '/board-count' },
  { id: 'download', number: 3, path: '/preview' },
];

/** El paso que corresponde a una dirección, o null si la pantalla no es del flujo. */
export function createStepOf(pathname: string): number | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return CREATE_STEPS.find((step) => step.path === normalized)?.number ?? null;
}

export type CreateStepStatus = 'done' | 'current' | 'pending';

export function createStepStatus(stepNumber: number, currentStep: number): CreateStepStatus {
  if (stepNumber < currentStep) return 'done';
  return stepNumber === currentStep ? 'current' : 'pending';
}
