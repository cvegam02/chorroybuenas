import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DOWNLOAD_URL_LIFETIME_MS, downloadPDF } from '../../src/services/pdf/download';

describe('descarga del PDF (FEAT-28, US A2)', () => {
  const link = { href: '', download: '', click: vi.fn() };

  beforeEach(() => {
    vi.useFakeTimers();
    link.click.mockReset();
    vi.stubGlobal('document', {
      createElement: vi.fn(() => link),
      body: { appendChild: vi.fn(), removeChild: vi.fn() },
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pdf');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('descarga con el nombre que recibe', () => {
    downloadPDF(new Blob(['pdf']), 'loteria-cumple-de-ana.pdf');

    expect(link.href).toBe('blob:pdf');
    expect(link.download).toBe('loteria-cumple-de-ana.pdf');
    expect(link.click).toHaveBeenCalledTimes(1);
  });

  it('sin nombre usa el de siempre', () => {
    downloadPDF(new Blob(['pdf']));

    expect(link.download).toBe('loteria-tableros.pdf');
  });

  it('no libera el enlace temporal al hacer clic, sino un rato después', () => {
    downloadPDF(new Blob(['pdf']));

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(DOWNLOAD_URL_LIFETIME_MS - 1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf');
  });
});
