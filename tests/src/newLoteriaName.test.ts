import { describe, expect, it } from 'vitest';
import { nextNewLoteriaName } from '../../src/utils/newLoteriaName';

describe('nombre propuesto para una lotería nueva (FEAT-57)', () => {
  it('sin loterías con ese nombre, empieza en 1', () => {
    expect(nextNewLoteriaName([], 'Nueva lotería')).toBe('Nueva lotería 1');
    expect(nextNewLoteriaName(['Posada 2025', 'Cumple de Ana'], 'Nueva lotería')).toBe('Nueva lotería 1');
  });

  it('sigue después del número más alto, aunque falten números en medio', () => {
    expect(nextNewLoteriaName(['Nueva lotería 1', 'Nueva lotería 4', 'Posada'], 'Nueva lotería')).toBe('Nueva lotería 5');
  });

  it('no repite un número aunque se hayan borrado loterías anteriores', () => {
    // Con tres loterías y la «3» ya usada, contar loterías propondría la 3 otra vez
    expect(nextNewLoteriaName(['Posada', 'Nueva lotería 3', 'Cumple'], 'Nueva lotería')).toBe('Nueva lotería 4');
  });

  it('ignora lo que no es un número después del nombre', () => {
    expect(nextNewLoteriaName(['Nueva lotería', 'Nueva lotería de Ana', 'Nueva lotería 0'], 'Nueva lotería')).toBe(
      'Nueva lotería 1'
    );
  });

  it('usa el nombre en el idioma que recibe, sin espacios de sobra', () => {
    expect(nextNewLoteriaName(['New lotería 2'], ' New lotería ')).toBe('New lotería 3');
  });
});
