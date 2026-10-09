import { describe, expect, it } from 'vitest';
import { DEFAULT_PDF_FILE_NAME, pdfFileName } from '../../src/services/pdf/fileName';

describe('nombre del archivo PDF (FEAT-28, US A1)', () => {
  it('lleva el nombre de la lotería, sin acentos, espacios ni signos', () => {
    expect(pdfFileName('Cumple de Ana')).toBe('loteria-cumple-de-ana.pdf');
    expect(pdfFileName('  ¡Bautizo: Sofía & Íker!  ')).toBe('loteria-bautizo-sofia-iker.pdf');
  });

  it('no repite la palabra «lotería» si el nombre ya empieza con ella', () => {
    expect(pdfFileName('Lotería de Ana')).toBe('loteria-de-ana.pdf');
    expect(pdfFileName('LOTERIA familiar 2026')).toBe('loteria-familiar-2026.pdf');
  });

  it('usa el nombre por defecto cuando la lotería no tiene nombre', () => {
    expect(DEFAULT_PDF_FILE_NAME).toBe('loteria-tableros.pdf');
    expect(pdfFileName(undefined)).toBe(DEFAULT_PDF_FILE_NAME);
    expect(pdfFileName(null)).toBe(DEFAULT_PDF_FILE_NAME);
    expect(pdfFileName('   ')).toBe(DEFAULT_PDF_FILE_NAME);
    expect(pdfFileName('¡¿?!')).toBe(DEFAULT_PDF_FILE_NAME);
  });
});
