import { useTranslation } from 'react-i18next';
import type { GuestCard } from '../../repositories/GuestLoteriaRepository';
import { uploaderName, type LoteriaMember } from '../../utils/guestCards';
import { SetCardThumb } from '../SetView/SetCardThumb';

interface GuestCardGridProps {
  cards: GuestCard[];
  members: ReadonlyMap<string, LoteriaMember>;
  onOpenCard: (index: number) => void;
}

/** Las cartas de una lotería colectiva, cada una con quién la subió (U5, FEAT-56 US B3). */
export const GuestCardGrid = ({ cards, members, onOpenCard }: GuestCardGridProps) => {
  const { t } = useTranslation();

  const uploaderText = (card: GuestCard) => {
    const uploader = uploaderName(card.uploadedBy, members);
    if (uploader.kind === 'named') return t('guest.uploadedBy', { name: uploader.name });
    return t(uploader.kind === 'owner' ? 'guest.uploadedByOwner' : 'guest.uploadedByGuest');
  };

  return (
    <section className="set-section">
      <div className="set-section__header">
        <div className="set-section__heading">
          <h2 className="set-section__title">{t('setView.cardsTitle')}</h2>
          <span className="set-section__count">{t('dashboard.loterias.cards', { count: cards.length })}</span>
        </div>
      </div>
      {cards.length === 0 ? (
        <p className="guest-loteria__empty">{t('guest.empty')}</p>
      ) : (
        <div className="set-cards__grid">
          {cards.map((card, index) => (
            <figure key={card.id} className="guest-loteria__card">
              <SetCardThumb card={card} onOpen={() => onOpenCard(index)} />
              <figcaption className="guest-loteria__uploader">{uploaderText(card)}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
};
