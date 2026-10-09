import { describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';

vi.mock('../../src/services/pdf/images', () => ({ embedImageInPDF: vi.fn(), urlToBase64: vi.fn() }));
vi.mock('../../src/utils/indexedDB', () => ({
  getImageBlob: vi.fn(async () => null),
  blobToBase64: vi.fn(),
  cacheImageBlob: vi.fn(),
}));
vi.mock('../../src/utils/storage', () => ({ loadCards: vi.fn(async () => []) }));
vi.mock('../../src/repositories/CardRepository', () => ({ CardRepository: { downloadImage: vi.fn() } }));
vi.mock('../../src/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() } }));

import { generatePDF } from '../../src/services/PDFService';

const titleOf = async (blob: Blob) => (await PDFDocument.load(await blob.arrayBuffer())).getTitle();

describe('título interno del PDF (FEAT-28, US A1)', () => {
  it('lleva el nombre de la lotería como título', async () => {
    expect(await titleOf(await generatePDF([], { title: '  Cumple de Ana ' }))).toBe('Cumple de Ana');
  });

  it('sin nombre no lleva título: el lector muestra el nombre del archivo', async () => {
    expect(await titleOf(await generatePDF([]))).toBeUndefined();
    expect(await titleOf(await generatePDF([], { title: '   ' }))).toBeUndefined();
  });
});
