import { describe, expect, it } from 'vitest';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';
import { CREATE_STEPS, createStepOf, createStepStatus } from '../../src/utils/createSteps';

describe('barra de pasos de crear lotería (FEAT-34, US A1)', () => {
  it('son tres pasos: cartas, tableros y descarga', () => {
    expect(CREATE_STEPS.map((step) => step.id)).toEqual(['cards', 'boards', 'download']);
  });

  it('cada pantalla del flujo tiene su paso', () => {
    expect(createStepOf('/cards')).toBe(1);
    expect(createStepOf('/board-count')).toBe(2);
    expect(createStepOf('/preview')).toBe(3);
  });

  it('una diagonal al final no cambia el paso', () => {
    expect(createStepOf('/cards/')).toBe(1);
  });

  it('fuera del flujo no hay barra de pasos', () => {
    expect(createStepOf('/')).toBeNull();
    expect(createStepOf('/dashboard')).toBeNull();
    expect(createStepOf('/comprar-tokens')).toBeNull();
    expect(createStepOf('/loteria/abc')).toBeNull();
  });

  it('los pasos anteriores quedan hechos, el de la pantalla es el actual y los demás, pendientes', () => {
    expect([1, 2, 3].map((step) => createStepStatus(step, 2))).toEqual(['done', 'current', 'pending']);
    expect([1, 2, 3].map((step) => createStepStatus(step, 1))).toEqual(['current', 'pending', 'pending']);
    expect([1, 2, 3].map((step) => createStepStatus(step, 3))).toEqual(['done', 'done', 'current']);
  });

  it('tiene los mismos textos en español y en inglés, uno por cada paso', () => {
    expect(Object.keys(en.createSteps).sort()).toEqual(Object.keys(es.createSteps).sort());
    for (const step of CREATE_STEPS) {
      expect(es.createSteps[step.id]).toBeTruthy();
    }
  });
});
