import { useState } from 'react';
import { useCards } from '../../hooks/useCards';
import { CardPreview } from './CardPreview';
import { CardUploadThumb } from './CardUploadThumb';
import { CardUploadModal } from './CardUploadModal';
import { BatchUploadModal } from './BatchUploadModal';
import { CardRecommendations } from '../Recommendations/CardRecommendations';
import { Card } from '../../types';
import logoImage from '../../img/logo.png';
import './CardEditor.css';

interface CardEditorProps {
  onNext: () => void;
}

export const CardEditor = ({ onNext }: CardEditorProps) => {
  const { cards, addCard, addCards, removeCard, cardCount, hasMinimumCards } = useCards();
  const [nextCardId, setNextCardId] = useState(1);
  const [isRecommendationsCollapsed, setIsRecommendationsCollapsed] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);

  const handleCardAdd = (image: string, title: string) => {
    const newCard: Card = {
      id: `card-${nextCardId}-${Date.now()}`,
      title,
      image,
    };
    addCard(newCard);
    setNextCardId(prev => prev + 1);
  };

  const handleBatchCardsAdd = (cardsToAdd: Array<{ image: string; title: string }>) => {
    console.log('handleBatchCardsAdd called with', cardsToAdd.length, 'cards'); // Debug log
    
    // Create all new cards with unique IDs
    const newCards: Card[] = cardsToAdd.map(({ image, title }, index) => ({
      id: `card-${nextCardId + index}-${Date.now()}-${Math.random()}`,
      title,
      image,
    }));
    
    // Add all cards at once using addCards function
    addCards(newCards);
    
    // Update ID counter by the number of cards added
    setNextCardId(prev => prev + cardsToAdd.length);
  };

  const handleBatchSelect = (files: File[]) => {
    setBatchFiles(files);
    setIsBatchModalOpen(true);
  };

  return (
    <div className="card-editor">
      <div className="card-editor__header">
        <img 
          src={logoImage} 
          alt="chorroybuenas.com.mx" 
          className="card-editor__logo"
        />
        <h1 className="card-editor__title">Carga de Cartas</h1>
      </div>

      <div className="card-editor__intro">
        <p className="card-editor__intro-text">
          Crea tu baraja personalizada subiendo imágenes y asignándoles un título. 
          Puedes ajustar cada imagen antes de agregarla a tu colección.
        </p>
      </div>
      
      <div className="card-editor__counter">
        Cartas cargadas: <strong>{cardCount}</strong> {hasMinimumCards && <span className="card-editor__counter-check">✓</span>}
      </div>

      <div className="card-editor__instructions">
        <h2 className="card-editor__instructions-title">📝 Instrucciones</h2>
        <div className="card-editor__instructions-steps">
          <div className="card-editor__instruction-step">
            <span className="card-editor__step-number-small">1</span>
            <div>
              <strong>Selecciona una imagen</strong>
              <p>Haz clic en el área de carga o arrastra una imagen. Formatos aceptados: JPG, PNG o WEBP</p>
            </div>
          </div>
          <div className="card-editor__instruction-step">
            <span className="card-editor__step-number-small">2</span>
            <div>
              <strong>Ajusta la imagen</strong>
              <p>Usa zoom (rueda del mouse o botones + / -) y arrastra para seleccionar el área que quieres mostrar</p>
            </div>
          </div>
          <div className="card-editor__instruction-step">
            <span className="card-editor__step-number-small">3</span>
            <div>
              <strong>Agrega un título</strong>
              <p>Escribe un nombre descriptivo para tu carta. Este será el texto que se cantará durante el juego</p>
            </div>
          </div>
          <div className="card-editor__instruction-step">
            <span className="card-editor__step-number-small">4</span>
            <div>
              <strong>Agrega la carta</strong>
              <p>Haz clic en "Agregar Carta" para añadirla a tu baraja. Puedes eliminarla haciendo clic en la X</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card-editor__recommendations-box">
        <button 
          className="card-editor__recommendations-header"
          onClick={() => setIsRecommendationsCollapsed(!isRecommendationsCollapsed)}
          type="button"
        >
          <h3 className="card-editor__recommendations-title">✨ Recomendaciones para mejores resultados</h3>
          <span className={`card-editor__recommendations-chevron ${isRecommendationsCollapsed ? 'card-editor__recommendations-chevron--collapsed' : ''}`}>
            ▼
          </span>
        </button>
        {!isRecommendationsCollapsed && (
          <ul className="card-editor__recommendations-list">
            <li>📸 <strong>Usa imágenes de buena calidad:</strong> Evita imágenes borrosas o pixeladas para que se vean nítidas en los tableros</li>
            <li>🎯 <strong>Enfócate en el sujeto principal:</strong> Las imágenes con un objeto o persona claramente visible funcionan mejor</li>
            <li>💡 <strong>Buena iluminación:</strong> Elige fotos bien iluminadas para que los detalles se aprecien mejor</li>
            <li>🎨 <strong>Colores vibrantes:</strong> Las imágenes con colores vivos y contrastes claros destacan más</li>
            <li>📏 <strong>Composición centrada:</strong> El editor te permite recortar y ajustar, pero es mejor empezar con una imagen bien encuadrada</li>
            <li>✏️ <strong>Títulos descriptivos:</strong> Usa nombres claros y cortos que sean fáciles de cantar durante el juego</li>
          </ul>
        )}
      </div>

      <div className="card-editor__cards-section">
        {cards.length > 0 && (
          <>
            <h2 className="card-editor__cards-section-title">Tus Cartas ({cardCount})</h2>
            <p className="card-editor__cards-section-subtitle">
              Haz clic en la X para eliminar una carta si necesitas hacer cambios
            </p>
          </>
        )}
        <div className="card-editor__cards-grid">
          {cards.map((card) => (
            <CardPreview key={card.id} card={card} onRemove={removeCard} />
          ))}
          <CardUploadThumb 
            onSingleClick={() => setIsUploadModalOpen(true)}
            onBatchSelect={handleBatchSelect}
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

      <div className="card-editor__actions">
        {!hasMinimumCards && (
          <p className="card-editor__actions-note">
            Necesitas al menos 30 cartas para continuar. Actualmente tienes {cardCount} cartas.
          </p>
        )}
        <button
          onClick={onNext}
          disabled={!hasMinimumCards}
          className="card-editor__next-button"
        >
          {hasMinimumCards 
            ? 'Siguiente: Seleccionar Cantidad de Tableros →' 
            : `Agregar ${30 - cardCount} cartas más para continuar`
          }
        </button>
      </div>
    </div>
  );
};

