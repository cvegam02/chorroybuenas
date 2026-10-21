import { BoardRepository } from '../repositories/BoardRepository';
import { CardRepository } from '../repositories/CardRepository';
import { downloadPDF, generatePDF, pdfFileName } from './PDFService';
import { cardLabelsOrDefault, type CardLabels } from '../utils/cardLabels';

/**
 * Arma y descarga el PDF de una lotería guardada sin abrirla: carga sus tableros y sus cartas y usa el
 * mismo armado que la pantalla de la lotería. Lanza si no tiene tableros o si el PDF no se pudo armar.
 */
export const downloadSetPdf = async (
  userId: string,
  set: { id: string; name: string; card_labels?: CardLabels }
): Promise<void> => {
  const [boards, cards] = await Promise.all([
    BoardRepository.getBoards(userId, set.id),
    CardRepository.getCards(userId, set.id),
  ]);
  if (boards.length === 0) throw new Error(`Set ${set.id} has no boards to print`);

  const blob = await generatePDF(boards, {
    allCards: cards,
    title: set.name,
    cardLabels: cardLabelsOrDefault(set.card_labels),
  });
  downloadPDF(blob, pdfFileName(set.name));
};
