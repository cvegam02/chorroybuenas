import { useState, useRef, useEffect } from 'react';
import './ImageEditor.css';

interface ImageEditorProps {
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
}

const MIN_ZOOM = 0.1; // 10% - permite zoom out más para imágenes grandes
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export const ImageEditor = ({ imageSrc, onCrop, onCancel }: ImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const img = new Image();
    let resizeHandler: (() => void) | null = null;
    
    img.onload = () => {
      imageRef.current = img;
      // Calculate initial position to center the image
      const updateSize = () => {
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth;
          const containerHeight = containerRef.current.clientHeight;
          if (containerWidth > 0 && containerHeight > 0) {
            setContainerSize({ width: containerWidth, height: containerHeight });
            
            const imgAspectRatio = img.width / img.height;
            const containerAspectRatio = containerWidth / containerHeight;
            
            let initialZoom = 1;
            if (imgAspectRatio > containerAspectRatio) {
              // Image is wider, fit to height
              initialZoom = containerHeight / img.height;
            } else {
              // Image is taller, fit to width
              initialZoom = containerWidth / img.width;
            }
            
            // Start with image covering the container (zoom in slightly to ensure coverage)
            // Ensure initial zoom is within allowed bounds
            const calculatedZoom = initialZoom * 1.1;
            const boundedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, calculatedZoom));
            setZoom(boundedZoom);
            setPosition({ x: 0, y: 0 });
          }
        }
      };
      
      // Initial update
      setTimeout(updateSize, 0);
      
      // Handle window resize
      resizeHandler = () => {
        updateSize();
        setTimeout(() => drawImage(), 100);
      };
      
      window.addEventListener('resize', resizeHandler);
    };
    img.src = imageSrc;
    
    return () => {
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
    };
  }, [imageSrc]);

  useEffect(() => {
    drawImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, position, containerSize]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !containerRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerWidth = containerRef.current.clientWidth || containerSize.width;
    const containerHeight = containerRef.current.clientHeight || containerSize.height;

    if (containerWidth === 0 || containerHeight === 0) return;

    // Set canvas size to container size (use device pixel ratio for crisp rendering)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, containerWidth, containerHeight);

    // Calculate scaled image dimensions
    const scaledWidth = img.width * zoom;
    const scaledHeight = img.height * zoom;

    // Calculate position (center the image, then apply offset)
    const offsetX = (containerWidth - scaledWidth) / 2 + position.x;
    const offsetY = (containerHeight - scaledHeight) / 2 + position.y;

    // Draw image
    ctx.drawImage(
      img,
      0, 0, img.width, img.height,
      offsetX, offsetY, scaledWidth, scaledHeight
    );

    // Draw overlay border to show crop area
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, containerWidth, containerHeight);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Constrain movement to keep image covering the crop area
    const img = imageRef.current;
    if (!img || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const scaledWidth = img.width * zoom;
    const scaledHeight = img.height * zoom;

    const maxX = (scaledWidth - containerWidth) / 2;
    const maxY = (scaledHeight - containerHeight) / 2;

    setPosition({
      x: Math.max(-maxX, Math.min(maxX, newX)),
      y: Math.max(-maxY, Math.min(maxY, newY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // Get the actual canvas size (accounting for device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    const canvasLogicalWidth = canvas.width / dpr;
    const canvasLogicalHeight = canvas.height / dpr;

    // Create a new canvas with the crop dimensions (logical size, not device pixels)
    const cropCanvas = document.createElement('canvas');
    const ctx = cropCanvas.getContext('2d');
    if (!ctx) return;

    cropCanvas.width = containerWidth;
    cropCanvas.height = containerHeight;

    // Draw the visible portion from the rendered canvas to the crop canvas
    // We need to account for the device pixel ratio scaling
    ctx.drawImage(
      canvas,
      0, 0, canvasLogicalWidth, canvasLogicalHeight,
      0, 0, containerWidth, containerHeight
    );

    // Get the cropped image data (use lower quality for initial crop, will be compressed further)
    const croppedImage = cropCanvas.toDataURL('image/jpeg', 0.85);
    onCrop(croppedImage);
  };

  return (
    <div className="image-editor">
      <div className="image-editor__header">
        <h3>✂️ Ajusta tu imagen</h3>
        <p>Selecciona la parte de la imagen que quieres usar en tu carta. El área dentro del recuadro será la que aparezca en tu lotería.</p>
      </div>

      <div className="image-editor__viewport-container">
        <div
          ref={containerRef}
          className="image-editor__viewport"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <canvas ref={canvasRef} className="image-editor__canvas" />
        </div>
      </div>

      <div className="image-editor__help-text">
        <p><strong>📏 Cómo ajustar tu imagen:</strong></p>
        <p>🔍 <strong>Zoom:</strong> Usa la rueda del mouse o los botones + / - para acercar o alejar</p>
        <p>👆 <strong>Mover:</strong> Haz clic y arrastra la imagen para reposicionarla dentro del recuadro</p>
        <p>✅ <strong>Consejo:</strong> Asegúrate de que el sujeto principal esté bien centrado y visible antes de guardar</p>
      </div>

      <div className="image-editor__controls">
        <div className="image-editor__zoom-controls">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="image-editor__zoom-button"
            aria-label="Alejar"
          >
            −
          </button>
          <span className="image-editor__zoom-value">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="image-editor__zoom-button"
            aria-label="Acercar"
          >
            +
          </button>
        </div>

        <div className="image-editor__actions">
          <button
            type="button"
            onClick={onCancel}
            className="image-editor__cancel-button"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCrop}
            className="image-editor__crop-button"
          >
            Usar esta área
          </button>
        </div>
      </div>
    </div>
  );
};

