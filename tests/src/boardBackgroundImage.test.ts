import { describe, expect, it, vi } from 'vitest';
import type { PDFPage, PDFImage } from 'pdf-lib';

vi.mock('../../src/utils/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() } }));

import {
  BOARD_IMAGE_MAX_BYTES,
  OWN_IMAGE_VEIL_OPACITY,
  boardImageFileError,
  ownImageBackground,
} from '../../src/utils/boardBackgrounds';
import { drawBoardBackground } from '../../src/services/pdf/background';
import { boardBackgroundArea } from '../../src/services/pdf/layout';
import { saveBoardLook, type BoardLookUpdate } from '../../src/services/boardLook';
import { boardBackgroundImagePath } from '../../src/repositories/BoardBackgroundRepository';

describe('imagen propia de fondo (FEAT-67, US A2)', () => {
  it('acepta lo mismo que las cartas: PNG, JPEG o WebP de hasta 5 MB', () => {
    expect(BOARD_IMAGE_MAX_BYTES).toBe(5 * 1024 * 1024);
    for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
      expect(boardImageFileError({ type, size: 1000 })).toBeNull();
    }
    expect(boardImageFileError({ type: 'image/gif', size: 1000 })).toBe('type');
    expect(boardImageFileError({ type: 'application/pdf', size: 1000 })).toBe('type');
    expect(boardImageFileError({ type: 'image/png', size: BOARD_IMAGE_MAX_BYTES + 1 })).toBe('size');
    expect(boardImageFileError({ type: 'image/png', size: BOARD_IMAGE_MAX_BYTES })).toBeNull();
  });

  it('se guarda en la carpeta de la dueña, con un nombre de fondo que cumple la regla de la base', () => {
    const path = boardBackgroundImagePath('user-1', 'set-1', 'image/jpeg', 123);
    expect(path).toBe('user-1/board-bg-set-1_123.jpg');
    expect(boardBackgroundImagePath('user-1', 'set-1', 'image/webp', 1)).toMatch(/\.webp$/);
  });

  it('mientras no llega su dirección, se ve el crema', () => {
    const background = ownImageBackground(null, true);
    expect(background.id).toBe('imagen');
    expect(background.image).toBeUndefined();
    expect(background.base).toBe('#fef3e7');
  });
});

describe('imagen propia en el PDF (FEAT-67, US A2)', () => {
  const fakePage = () => ({ drawRectangle: vi.fn(), drawSvgPath: vi.fn(), drawImage: vi.fn(), pushOperators: vi.fn() });
  const image = { image: {} as PDFImage, width: 1000, height: 500 };

  it('la imagen llena el área, recortada, y con «Aclarar la imagen» lleva el velo blanco', () => {
    const page = fakePage();
    drawBoardBackground(page as unknown as PDFPage, ownImageBackground('https://x', true), image);
    const area = boardBackgroundArea();
    const [, placed] = page.drawImage.mock.calls[0];
    // Imagen más ancha que el área: toma el alto y sobra a los lados.
    expect(placed.height).toBeCloseTo(area.height, 5);
    expect(placed.width).toBeGreaterThan(area.width);
    expect(page.drawRectangle).toHaveBeenCalledWith(expect.objectContaining({ ...area, opacity: OWN_IMAGE_VEIL_OPACITY }));
  });

  it('sin «Aclarar la imagen», no lleva velo', () => {
    const page = fakePage();
    drawBoardBackground(page as unknown as PDFPage, ownImageBackground('https://x', false), image);
    expect(page.drawImage).toHaveBeenCalledTimes(1);
    const veils = page.drawRectangle.mock.calls.filter(([options]) => options.opacity !== undefined);
    expect(veils).toHaveLength(0);
  });
});

describe('guardar el fondo con imagen propia (FEAT-67, US A2)', () => {
  const file = new File(['x'], 'fondo.png', { type: 'image/png' });
  const base = { background: 'imagen', logoPosition: 'center' as const, titlePosition: 'left' as const, lighten: true };

  const deps = (updateSet = vi.fn(async (update: BoardLookUpdate) => update)) => ({
    uploadImage: vi.fn(async () => 'u/board-bg-s_2.png'),
    removeImage: vi.fn(async () => undefined),
    updateSet,
  });

  it('sube la nueva, guarda la lotería y borra la anterior', async () => {
    const d = deps();
    await saveBoardLook({ ...base, file, previousImagePath: 'u/board-bg-s_1.png' }, d);
    expect(d.uploadImage).toHaveBeenCalledWith(file);
    expect(d.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ board_background_image_path: 'u/board-bg-s_2.png', board_title_position: 'left' })
    );
    expect(d.removeImage).toHaveBeenCalledWith('u/board-bg-s_1.png');
    expect(d.uploadImage.mock.invocationCallOrder[0]).toBeLessThan(d.updateSet.mock.invocationCallOrder[0]);
    expect(d.updateSet.mock.invocationCallOrder[0]).toBeLessThan(d.removeImage.mock.invocationCallOrder[0]);
  });

  it('sin imagen nueva no sube ni borra nada, y no toca la ruta guardada', async () => {
    const d = deps();
    await saveBoardLook({ ...base, background: 'greca', file: null, previousImagePath: 'u/board-bg-s_1.png' }, d);
    expect(d.uploadImage).not.toHaveBeenCalled();
    expect(d.removeImage).not.toHaveBeenCalled();
    expect(d.updateSet.mock.calls[0][0]).not.toHaveProperty('board_background_image_path');
  });

  it('si guardar la lotería falla, borra la recién subida y deja la anterior', async () => {
    const d = deps(vi.fn(async () => { throw new Error('sin conexión'); }));
    await expect(saveBoardLook({ ...base, file, previousImagePath: 'u/board-bg-s_1.png' }, d)).rejects.toThrow('sin conexión');
    expect(d.removeImage).toHaveBeenCalledTimes(1);
    expect(d.removeImage).toHaveBeenCalledWith('u/board-bg-s_2.png');
  });

  it('si no se puede borrar la anterior, el guardado sigue siendo bueno', async () => {
    const d = deps();
    d.removeImage.mockRejectedValueOnce(new Error('storage'));
    await expect(saveBoardLook({ ...base, file, previousImagePath: 'u/board-bg-s_1.png' }, d)).resolves.toBeTruthy();
  });
});
