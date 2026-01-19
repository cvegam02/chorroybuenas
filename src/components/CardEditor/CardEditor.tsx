import { useState, useRef } from 'react';
import { 
  FaInfoCircle, 
  FaChevronDown, 
  FaLightbulb, 
  FaCheckCircle,
  FaUpload,
  FaArrowRight,
  FaImage,
  FaEdit,
  FaTag,
  FaPlus
} from 'react-icons/fa';
import { useCards } from '../../hooks/useCards';
import { CardPreview } from './CardPreview';
import { CardUploadThumb } from './CardUploadThumb';
import { CardUploadModal } from './CardUploadModal';
import { BatchUploadModal } from './BatchUploadModal';
import { CardRecommendations } from '../Recommendations/CardRecommendations';
import { Card } from '../../types';
import './CardEditor.css';

interface CardEditorProps {
  onNext: () => void;
}

export const CardEditor = ({ onNext }: CardEditorProps) => {
  const { cards, addCard, addCards, removeCard, cardCount, hasMinimumCards, minCards } = useCards();
  const [nextCardId, setNextCardId] = useState(1);
  const [isRecommendationsCollapsed, setIsRecommendationsCollapsed] = useState(true);
  const [isInstructionsCollapsed, setIsInstructionsCollapsed] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const handleCardAdd = async (image: string, title: string) => {
    const newCard: Card = {
      id: `card-${nextCardId}-${Date.now()}`,
      title,
      image,
    };
    await addCard(newCard);
    setNextCardId(prev => prev + 1);
  };

  const handleBatchCardsAdd = async (cardsToAdd: Array<{ image: string; title: string }>) => {
    console.log('handleBatchCardsAdd called with', cardsToAdd.length, 'cards'); // Debug log
    
    // Create all new cards with unique IDs
    const newCards: Card[] = cardsToAdd.map(({ image, title }, index) => ({
      id: `card-${nextCardId + index}-${Date.now()}-${Math.random()}`,
      title,
      image,
    }));
    
    // Add all cards at once using addCards function
    await addCards(newCards);
    
    // Update ID counter by the number of cards added
    setNextCardId(prev => prev + cardsToAdd.length);
  };

  const handleBatchClick = () => {
    batchInputRef.current?.click();
  };

  const handleBatchFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
    setBatchFiles(files);
    setIsBatchModalOpen(true);
    }
    // Reset input so same files can be selected again
    if (batchInputRef.current) {
      batchInputRef.current.value = '';
    }
  };

  return (
    <div className="card-editor">
      <div className="card-editor__header">
        <h1 className="card-editor__title">Carga de Cartas</h1>
        <p className="card-editor__subtitle">
          Crea tu baraja personalizada subiendo imágenes y asignándoles un título
        </p>
      </div>

      <div className="card-editor__stats">
        <div className="card-editor__stat">
          <div className="card-editor__stat-value">
            {cardCount}
            {hasMinimumCards && (
              <FaCheckCircle className="card-editor__stat-check" />
            )}
          </div>
          <div className="card-editor__stat-label">Cartas cargadas</div>
          {!hasMinimumCards && (
            <div className="card-editor__stat-minimum">
              Mínimo: {minCards}
            </div>
          )}
        </div>
      </div>

      <div className="card-editor__info-section">
        <button 
          className={`card-editor__info-toggle ${!isInstructionsCollapsed ? 'card-editor__info-toggle--open' : ''}`}
          onClick={() => setIsInstructionsCollapsed(!isInstructionsCollapsed)}
          type="button"
        >
          <div className="card-editor__info-toggle-content">
            <FaInfoCircle className="card-editor__info-icon" />
            <span className="card-editor__info-title">Instrucciones</span>
          </div>
          <FaChevronDown className={`card-editor__info-chevron ${isInstructionsCollapsed ? '' : 'card-editor__info-chevron--open'}`} />
        </button>
        <div className={`card-editor__info-content ${isInstructionsCollapsed ? 'card-editor__info-content--collapsed' : ''}`}>
          <div className="card-editor__steps">
            <div className="card-editor__step">
              <div className="card-editor__step-number">1</div>
              <div className="card-editor__step-content">
                <div className="card-editor__step-icon">
                  <FaImage />
                </div>
                <div>
                  <strong>Selecciona una imagen</strong>
                  <p>Haz clic en el área de carga o arrastra una imagen. Formatos: JPG, PNG o WEBP</p>
                </div>
              </div>
            </div>
            <div className="card-editor__step">
              <div className="card-editor__step-number">2</div>
              <div className="card-editor__step-content">
                <div className="card-editor__step-icon">
                  <FaEdit />
                </div>
                <div>
                  <strong>Ajusta la imagen</strong>
                  <p>Usa zoom (rueda del mouse o botones + / -) y arrastra para seleccionar el área que quieres mostrar</p>
                </div>
              </div>
            </div>
            <div className="card-editor__step">
              <div className="card-editor__step-number">3</div>
              <div className="card-editor__step-content">
                <div className="card-editor__step-icon">
                  <FaTag />
                </div>
                <div>
                  <strong>Agrega un título</strong>
                  <p>Escribe un nombre descriptivo para tu carta. Este será el texto que se cantará durante el juego</p>
                </div>
              </div>
            </div>
            <div className="card-editor__step">
              <div className="card-editor__step-number">4</div>
              <div className="card-editor__step-content">
                <div className="card-editor__step-icon">
                  <FaPlus />
                </div>
                <div>
                  <strong>Agrega la carta</strong>
                  <p>Haz clic en "Agregar Carta" para añadirla a tu baraja. Puedes eliminarla haciendo clic en la X</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-editor__info-section">
        <button 
          className={`card-editor__info-toggle ${!isRecommendationsCollapsed ? 'card-editor__info-toggle--open' : ''}`}
          onClick={() => setIsRecommendationsCollapsed(!isRecommendationsCollapsed)}
          type="button"
        >
          <div className="card-editor__info-toggle-content">
            <FaLightbulb className="card-editor__info-icon" />
            <span className="card-editor__info-title">Recomendaciones para mejores resultados</span>
          </div>
          <FaChevronDown className={`card-editor__info-chevron ${isRecommendationsCollapsed ? '' : 'card-editor__info-chevron--open'}`} />
        </button>
        {!isRecommendationsCollapsed && (
          <div className="card-editor__info-content">
            <ul className="card-editor__recommendations-list">
              <li><strong>Usa imágenes de buena calidad:</strong> Evita imágenes borrosas o pixeladas para que se vean nítidas en los tableros</li>
              <li><strong>Enfócate en el sujeto principal:</strong> Las imágenes con un objeto o persona claramente visible funcionan mejor</li>
              <li><strong>Buena iluminación:</strong> Elige fotos bien iluminadas para que los detalles se aprecien mejor</li>
              <li><strong>Colores vibrantes:</strong> Las imágenes con colores vivos y contrastes claros destacan más</li>
              <li><strong>Composición centrada:</strong> El editor te permite recortar y ajustar, pero es mejor empezar con una imagen bien encuadrada</li>
              <li><strong>Títulos descriptivos:</strong> Usa nombres claros y cortos que sean fáciles de cantar durante el juego</li>
            </ul>
          </div>
        )}
      </div>

      <div className="card-editor__cards-section">
        <div className="card-editor__cards-header">
          <div className="card-editor__cards-header-left">
        {cards.length > 0 && (
              <>
            <h2 className="card-editor__cards-title">Tus Cartas</h2>
            <span className="card-editor__cards-count">({cardCount})</span>
              </>
            )}
          </div>
          <div className="card-editor__cards-header-right">
            <button
              type="button"
              onClick={handleBatchClick}
              className="card-editor__batch-button"
            >
              <FaUpload />
              <span>Subir Varias</span>
            </button>
          </div>
        </div>
        <div className="card-editor__cards-grid">
          {cards.map((card) => (
            <CardPreview key={card.id} card={card} onRemove={removeCard} />
          ))}
          <CardUploadThumb 
            onSingleClick={() => setIsUploadModalOpen(true)}
          />
        </div>
        {cards.length > 0 && (
          <CardRecommendations cardCount={cardCount} />
        )}
      </div>

      <CardUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onCardAdd={handleCardAdd}
      />

      <BatchUploadModal
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false);
          setBatchFiles([]);
        }}
        onCardsAdd={handleBatchCardsAdd}
        files={batchFiles}
      />

      <input
        ref={batchInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        onChange={handleBatchFileSelect}
        style={{ display: 'none' }}
      />

      <div className="card-editor__actions">
        {!hasMinimumCards && (
          <div className="card-editor__actions-note">
            Necesitas al menos <strong>{minCards} cartas</strong> para continuar. 
            Actualmente tienes <strong>{cardCount}</strong>.
          </div>
        )}
        <button
          onClick={onNext}
          disabled={!hasMinimumCards}
          className={`card-editor__next-button ${hasMinimumCards ? 'card-editor__next-button--enabled' : ''}`}
        >
          <span>
            {hasMinimumCards 
              ? 'Siguiente: Seleccionar Cantidad de Tableros' 
              : `Agregar ${minCards - cardCount} cartas más`
            }
          </span>
          {hasMinimumCards && <FaArrowRight />}
        </button>
      </div>
    </div>
  );
};
