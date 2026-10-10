import { describe, expect, it } from 'vitest';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';
import { NAV_LINKS, displayFirstName, isNavLinkActive, userInitial } from '../../src/components/Navbar/navLinks';

const link = (to: string) => {
  const found = NAV_LINKS.find((item) => item.to === to);
  if (!found) throw new Error(`No hay enlace a ${to}`);
  return found;
};

describe('barra superior (FEAT-33, US A1)', () => {
  it('tiene los cinco enlaces, en el orden de la maqueta', () => {
    expect(NAV_LINKS.map((item) => item.to)).toEqual([
      '/cards',
      '/tematicas',
      '/beneficios',
      '/como-se-juega',
      '/que-es-la-loteria',
    ]);
  });

  it('marca como actual el enlace de la página abierta', () => {
    expect(isNavLinkActive(link('/beneficios'), '/beneficios')).toBe(true);
    expect(isNavLinkActive(link('/beneficios'), '/como-se-juega')).toBe(false);
  });

  it('«Temáticas» también queda marcado dentro de la ficha de una lotería', () => {
    expect(isNavLinkActive(link('/tematicas'), '/tematicas/abc-123')).toBe(true);
  });

  it('«Crear lotería» no se marca en otras direcciones que empiezan parecido', () => {
    expect(isNavLinkActive(link('/cards'), '/cards-otra')).toBe(false);
  });

  it('muestra el primer nombre, o lo que va antes de la arroba si no hay nombre', () => {
    expect(displayFirstName('Carlos Vega', 'carlos@correo.com')).toBe('Carlos');
    expect(displayFirstName('  ', 'carlos@correo.com')).toBe('carlos');
    expect(displayFirstName('', '')).toBe('');
  });

  it('la inicial del avatar sale del nombre o del correo, en mayúscula', () => {
    expect(userInitial('carlos vega', 'x@correo.com')).toBe('C');
    expect(userInitial('', 'ana@correo.com')).toBe('A');
    expect(userInitial('', '')).toBe('');
  });

  it('la barra tiene los mismos textos en español y en inglés', () => {
    expect(Object.keys(en.navbar).sort()).toEqual(Object.keys(es.navbar).sort());
  });
});
