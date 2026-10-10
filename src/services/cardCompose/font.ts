import arvoBoldUrl from '../../fonts/Arvo-Bold.ttf';
import { CARD_FONT_FAMILY, CARD_FONT_WEIGHT } from './constants';

let loading: Promise<void> | null = null;

/** Carga la letra de la carta una sola vez. Si falla no se guarda el intento, para poder reintentar. */
export const loadCardFont = (): Promise<void> => {
  if (!loading) {
    loading = (async () => {
      const face = new FontFace(CARD_FONT_FAMILY, `url("${arvoBoldUrl}")`, { weight: CARD_FONT_WEIGHT });
      document.fonts.add(await face.load());
    })().catch((error: unknown) => {
      loading = null;
      throw error;
    });
  }
  return loading;
};
