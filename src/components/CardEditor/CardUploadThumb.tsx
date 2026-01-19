import './CardUploadThumb.css';

interface CardUploadThumbProps {
  onSingleClick: () => void;
}

export const CardUploadThumb = ({ onSingleClick }: CardUploadThumbProps) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onSingleClick();
  };

  return (
    <div className="card-upload-thumb" onClick={handleClick}>
      <div className="card-upload-thumb__image-container">
        <div className="card-upload-thumb__placeholder">
          <span className="card-upload-thumb__icon">➕</span>
          <p className="card-upload-thumb__text">Agregar imagen</p>
        </div>
      </div>
    </div>
  );
};

