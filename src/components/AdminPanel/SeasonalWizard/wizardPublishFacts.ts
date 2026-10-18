import type { AdminSeasonalLoteria } from '../../../repositories/SeasonalRepository';
import { parsePriceToCents, type SeasonalLoteriaForm } from '../../../utils/seasonalLoteria';
import { publishChecklist, type PublishCheck } from '../../../utils/seasonalWizard';
import type { ThemedCardLoteria } from '../../Seasonal/ThemedCard';
import { buildsOnSite, type CardsMode } from './WizardCardsStep';

interface PublishFactsSource {
  form: SeasonalLoteriaForm;
  record: AdminSeasonalLoteria | null;
  mode: CardsMode;
  /** Con «Subir mis cartas»: cuántas cartas hay cargadas y los tableros que sirven para el modo. */
  cardsLoaded: number;
  boardsGenerated: number;
  pdfIsCurrent: boolean;
  /** Portada elegida, aunque todavía no se haya protegido y guardado. */
  hasCover: boolean;
}

const countFromText = (text: string): number | null => {
  const value = Number(text.trim());
  return text.trim() !== '' && Number.isInteger(value) && value > 0 ? value : null;
};

/** Lo que el paso 5 muestra (FEAT-48, decisión 14): la lista de requisitos y la tarjeta como en el catálogo. */
export function publishFacts({ form, record, mode, cardsLoaded, boardsGenerated, pdfIsCurrent, hasCover }: PublishFactsSource): {
  checks: PublishCheck[];
  preview: ThemedCardLoteria;
} {
  const buildsPdf = buildsOnSite(mode);
  const cardCount = buildsPdf ? cardsLoaded || null : countFromText(form.cardCount);
  const boardCount = buildsPdf ? boardsGenerated || null : countFromText(form.boardCount);
  const priceCents = parsePriceToCents(form.price);

  const checks = publishChecklist({
    nameEs: form.nameEs,
    descriptionEs: form.descriptionEs,
    cardCount,
    boardCount,
    price: form.price,
    gridSize: form.gridSize,
    buildsPdf,
    hasPdf: !!record?.pdf,
    pdfIsCurrent,
    hasCover,
  });

  const preview: ThemedCardLoteria = {
    id: record?.id ?? 'nueva',
    name_es: form.nameEs.trim() || 'Sin nombre',
    name_en: form.nameEn.trim() || null,
    description_es: form.descriptionEs.trim() || null,
    description_en: form.descriptionEn.trim() || null,
    grid_size: form.gridSize,
    card_count: cardCount,
    board_count: boardCount,
    price_cents: priceCents === null || Number.isNaN(priceCents) ? null : priceCents,
    cover_path: record?.cover_path ?? null,
  };

  return { checks, preview };
}
