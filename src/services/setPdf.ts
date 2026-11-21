import { BoardRepository } from '../repositories/BoardRepository';
import { CardRepository } from '../repositories/CardRepository';
import { downloadPDF, generatePDF, pdfFileName } from './PDFService';
import { cardLabelsOrDefault, type CardLabels } from '../utils/cardLabels';
import { OWN_IMAGE_BACKGROUND_ID } from '../utils/boardBackgrounds';

/**
 * Arma y descarga el PDF de una lotería guardada sin abrirla: carga sus tableros y sus cartas y usa el
 * mismo armado que la pantalla de la lotería. Lanza si no tiene tableros o si el PDF no se pudo armar.
 */
export const downloadSetPdf = async (
  userId: string,
  set: {
    id: string;
    name: string;
    card_labels?: CardLabels;
    board_background?: string;
    board_logo_position?: string;
  board_title_position?: string;
    board_background_image_path?: string | null;
    board_background_lighten?: boolean;
  }
): Promise<void> => {
  const [boards, cards] = await Promise.all([
    BoardRepository.getBoards(userId, set.id),
    CardRepository.getCards(userId, set.id),
  ]);
  if (boards.length === 0) throw new Error(`Set ${set.id} has no boards to print`);

  // La imagen propia de fondo (FEAT-67, US A2) está en el almacenamiento privado: se pide su dirección.
  const imagePath = set.board_background === OWN_IMAGE_BACKGROUND_ID ? set.board_background_image_path : null;
  const imageUrl = imagePath ? await CardRepository.getImageUrl(imagePath) : null;

  const blob = await generatePDF(boards, {
    allCards: cards,
    title: set.name,
    cardLabels: cardLabelsOrDefault(set.card_labels),
    boardBackground: set.board_background,
    boardLogoPosition: set.board_logo_position,
    boardTitlePosition: set.board_title_position,
    boardBackgroundImage: imageUrl ? { url: imageUrl, lighten: set.board_background_lighten ?? true } : null,
  });
  downloadPDF(blob, pdfFileName(set.name));
};
