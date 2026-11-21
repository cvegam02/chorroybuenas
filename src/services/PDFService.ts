import { PDFDocument } from 'pdf-lib';
import { Board, Card } from '../types';
import { loadCards } from '../utils/storage';
import { PAGE_HEIGHT_PT, PAGE_WIDTH_PT } from './pdf/constants';
import { EmbedResult, embedImageInPDF } from './pdf/images';
import { drawBoardOnPage, drawDeckPages } from './pdf/draw';
import { createOnceLoader } from './pdf/loadOnce';
import { PdfCardsFailedError, uniqueFailedCards } from './pdf/failedCards';
import { createCardPreparer } from './pdf/prepareCards';
import { composeCard } from './cardCompose/compose';
import type { CardComposer } from './cardCompose/input';
import { readStoredCardImage } from './cardImage';
import { withCardNumbers, withNumbersFrom } from '../utils/cardNumbers';
import type { CardLabels } from '../utils/cardLabels';
import {
  OWN_IMAGE_BACKGROUND_ID,
  boardBackgroundOrDefault,
  boardLogoPositionOrDefault,
  ownImageBackground,
  type BoardBackground,
} from '../utils/boardBackgrounds';
import { logger } from '../utils/logger';

export { downloadPDF } from './pdf/download';
export { pdfFileName } from './pdf/fileName';

export interface GeneratePDFOptions {
  /** Cartas para la sección "Baraja Completa". Si no se pasa, se usa loadCards() (invitados). */
  allCards?: Card[];
  /** Cartas que ya traen su nombre dibujado (lotería de temporada, FEAT-23): van enteras y no se componen. */
  finishedCards?: boolean;
  /** Nombre de la lotería: queda como título del PDF (el que muestran los lectores en la pestaña). */
  title?: string;
  /** Cómo se compone cada carta (foto, marco y nombre). Por defecto, en el navegador. */
  composeCard?: CardComposer;
  /** Qué se ve en las cartas de la lotería (FEAT-51). Por defecto, nombre y número. */
  cardLabels?: CardLabels;
  /** Si va la baraja para recortar después de los tableros. Por defecto sí; la lotería tradicional no (FEAT-53). */
  includeDeck?: boolean;
  /** Fondo de los tableros (FEAT-67), por su id. Sin él o si no se reconoce, el crema de siempre. */
  boardBackground?: string | null;
  /** Dónde va el logo en los tableros (FEAT-67, US A4). Sin ella, al centro. */
  boardLogoPosition?: string | null;
  /** Dónde va «TABLERO N» (FEAT-67, US A4). Sin ella, al centro. */
  boardTitlePosition?: string | null;
  /** Imagen propia de fondo (US A2): su dirección y si se aclara. Solo cuenta si el fondo es 'imagen'. */
  boardBackgroundImage?: { url: string; lighten: boolean } | null;
}

/**
 * El fondo de los tableros y, si es la imagen propia, la imagen ya metida en el PDF. Si la imagen no
 * carga, el PDF sale con el crema de siempre en lugar de no salir; queda anotado.
 */
const resolveBoardBackground = async (
  pdfDoc: PDFDocument,
  options: GeneratePDFOptions | undefined
): Promise<{ background: BoardBackground; ownImage?: EmbedResult }> => {
  const image = options?.boardBackgroundImage;
  if (options?.boardBackground !== OWN_IMAGE_BACKGROUND_ID) {
    return { background: boardBackgroundOrDefault(options?.boardBackground) };
  }
  if (!image) return { background: boardBackgroundOrDefault(null) };
  try {
    return { background: ownImageBackground(image.url, image.lighten), ownImage: await embedImageInPDF(pdfDoc, image.url) };
  } catch (error) {
    logger.error('Could not load the board background image; using the default background:', error);
    return { background: boardBackgroundOrDefault(null) };
  }
};

/**
 * Arma el PDF de tableros y baraja. Si alguna carta no se puede dibujar, no devuelve un PDF incompleto:
 * lanza `PdfCardsFailedError` con las cartas que fallaron.
 */
export const generatePDF = async (boards: Board[], options?: GeneratePDFOptions): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();
  const finishedCards = options?.finishedCards ?? false;
  const title = options?.title?.trim();
  if (title) pdfDoc.setTitle(title, { showInWindowTitleBar: true });

  // Una sola lectura por carta, aunque aparezca en varios tableros y todos la pidan a la vez.
  const loadOnce = createOnceLoader<string>();
  const getBase64ForPDF = (card: Card): Promise<string | null> =>
    card.id ? loadOnce(card.id, () => readStoredCardImage(card)) : Promise.resolve(null);

  const prepareCard = createCardPreparer({
    readImage: getBase64ForPDF,
    compose: options?.composeCard ?? composeCard,
    finishedCards,
    cardLabels: options?.cardLabels,
  });

  // Cartas de la baraja: las que se pasan (usuario con sesión) o las del navegador (invitados).
  // El número de cada carta es su lugar en esa lista; las de temporada ya vienen terminadas y no llevan.
  const deckSource: Card[] = options?.allCards ?? (await loadCards());
  const deckCards = finishedCards ? deckSource : withCardNumbers(deckSource);
  const numbered = (cards: Card[]) => (finishedCards ? cards : withNumbersFrom(cards, deckCards));

  const refreshedBoards: Board[] = await Promise.all(
    boards.map(async (board) => ({ ...board, cards: await Promise.all(numbered(board.cards).map(prepareCard)) }))
  );

  // Caché por card.id: cada imagen se decodifica/embebe una sola vez (evita 160+ decodificaciones cuando hay 10 tableros)
  const embedCache = new Map<string, EmbedResult>();
  const failedCards: Card[] = [];

  const look = {
    ...(await resolveBoardBackground(pdfDoc, options)),
    logoPosition: boardLogoPositionOrDefault(options?.boardLogoPosition),
    titlePosition: boardLogoPositionOrDefault(options?.boardTitlePosition),
  };
  for (let i = 0; i < refreshedBoards.length; i++) {
    const board = refreshedBoards[i];
    const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

    failedCards.push(...(await drawBoardOnPage(page, board, i + 1, pdfDoc, embedCache, finishedCards, look)));
  }

  // Páginas con todas las cartas (baraja completa)
  if (options?.includeDeck ?? true) {
    const allCards: Card[] = await Promise.all(deckCards.map(prepareCard));
    failedCards.push(...(await drawDeckPages(pdfDoc, allCards, embedCache, finishedCards)));
  }

  if (failedCards.length > 0) throw new PdfCardsFailedError(uniqueFailedCards(failedCards));

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
};
