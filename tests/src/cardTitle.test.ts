import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { isPrintableCardTitle, printableCardTitle } from '../../src/utils/cardTitle';

describe('nombre de la carta sin emojis ni letras de otros alfabetos (FEAT-25, US A2)', () => {
  it.each(['El Niño', 'Ñoño', '¡Lotería!', 'Pingüino', '¿Quién?', 'Carta 23', 'Tom & Jerry (50%)', "L'amour", 'Mamá, papá; y yo: #1 +/-'])(
    'acepta «%s»',
    (title) => {
      expect(isPrintableCardTitle(title)).toBe(true);
    },
  );

  it.each(['Abuelita ❤️', '😀', 'Мама', '日本', 'مرحبا', 'Familia 👨‍👩‍👧'])('rechaza «%s»', (title) => {
    expect(isPrintableCardTitle(title)).toBe(false);
  });

  it('acepta las comillas, el apóstrofo y los guiones que pone solo el teclado del teléfono', () => {
    expect(isPrintableCardTitle('“La Dama” – ‘El Catrín’ — «El Gallo»')).toBe(true);
  });

  it('acepta un acento escrito como letra más tilde suelta (texto pegado desde otro programa)', () => {
    expect(isPrintableCardTitle('Mamá')).toBe(true);
    expect(printableCardTitle('Mamá')).toBe('Mamá');
  });

  it('para el PDF, quita lo que no se puede dibujar y deja el resto', () => {
    expect(printableCardTitle('Abuelita ❤️')).toBe('Abuelita');
    expect(printableCardTitle('El 😀 Niño')).toBe('El Niño');
    expect(printableCardTitle('¡Lotería!')).toBe('¡Lotería!');
  });

  it('si no queda nada, el nombre sale vacío', () => {
    expect(printableCardTitle('😀❤️')).toBe('');
  });

  it('todo lo que se acepta lo sabe dibujar la tipografía del PDF, ya limpio y en mayúsculas como va en la carta', async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const accepted = Array.from({ length: 0x2100 }, (_, code) => String.fromCharCode(code)).filter(
      (char) => char.trim() !== '' && isPrintableCardTitle(char),
    );

    expect(accepted.length).toBeGreaterThan(100);
    for (const char of accepted) {
      expect(() => font.widthOfTextAtSize(printableCardTitle(char).toUpperCase(), 10), `«${char}»`).not.toThrow();
    }
  });
});
