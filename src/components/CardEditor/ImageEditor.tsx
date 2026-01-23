import { useState, useRef, useEffect } from 'react';
import { FaCut } from 'react-icons/fa';
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
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartRef = useRef<{ distance: number; center: { x: number; y: number } } | null>(null);
  const initialZoomRef = useRef<number>(1);

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
            
            // Start with the full image visible (contain)
            // Ensure initial zoom is within allowed bounds
            const boundedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialZoom));
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

  // Calculate distance between two touches
  const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Get center point between two touches
  const getTouchCenter = (touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  // Set up touch event listeners with passive: false to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch gesture start
        e.preventDefault();
        const distance = getTouchDistance(e.touches[0], e.touches[1]);
        const center = getTouchCenter(e.touches[0], e.touches[1]);
        const rect = container.getBoundingClientRect();
        
        pinchStartRef.current = {
          distance,
          center: {
            x: center.x - rect.left,
            y: center.y - rect.top,
          },
        };
        initialZoomRef.current = zoom;
        setIsDragging(false);
      } else if (e.touches.length === 1) {
        // Single touch drag
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        touchStartRef.current = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
        lastTouchRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
        setIsDragging(true);
        pinchStartRef.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartRef.current) {
        // Pinch zoom
        e.preventDefault();
        
        const distance = getTouchDistance(e.touches[0], e.touches[1]);
        const scale = distance / pinchStartRef.current.distance;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialZoomRef.current * scale));
        setZoom(newZoom);

        // Adjust position to zoom towards the pinch center
        if (containerRef.current && imageRef.current) {
          const containerWidth = containerRef.current.clientWidth;
          const containerHeight = containerRef.current.clientHeight;
          
          const centerX = pinchStartRef.current.center.x;
          const centerY = pinchStartRef.current.center.y;
          
          // Calculate how the center point should move relative to the image
          const zoomDelta = newZoom - initialZoomRef.current;
          const img = imageRef.current;
          const scaledWidth = img.width * newZoom;
          const scaledHeight = img.height * newZoom;
          
          const relX = (centerX - containerWidth / 2 - position.x) / (img.width * initialZoomRef.current);
          const relY = (centerY - containerHeight / 2 - position.y) / (img.height * initialZoomRef.current);
          
          const newX = position.x - (relX * img.width * zoomDelta);
          const newY = position.y - (relY * img.height * zoomDelta);
          
          const maxX = Math.max(0, (scaledWidth - containerWidth) / 2);
          const maxY = Math.max(0, (scaledHeight - containerHeight) / 2);
          
          setPosition({
            x: Math.max(-maxX, Math.min(maxX, newX)),
            y: Math.max(-maxY, Math.min(maxY, newY)),
          });
        }
      } else if (e.touches.length === 1 && isDragging && touchStartRef.current && lastTouchRef.current) {
        // Single touch drag
        e.preventDefault();

        const touch = e.touches[0];
        const img = imageRef.current;
        if (!img) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const scaledWidth = img.width * zoom;
        const scaledHeight = img.height * zoom;

        const maxX = Math.max(0, (scaledWidth - containerWidth) / 2);
        const maxY = Math.max(0, (scaledHeight - containerHeight) / 2);

        const deltaX = touch.clientX - lastTouchRef.current.x;
        const deltaY = touch.clientY - lastTouchRef.current.y;

        setPosition(prev => ({
          x: Math.max(-maxX, Math.min(maxX, prev.x + deltaX)),
          y: Math.max(-maxY, Math.min(maxY, prev.y + deltaY)),
        }));

        lastTouchRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        // All touches ended
        setIsDragging(false);
        touchStartRef.current = null;
        lastTouchRef.current = null;
        pinchStartRef.current = null;
      } else if (e.touches.length === 1) {
        // Switched from pinch to single touch
        pinchStartRef.current = null;
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        touchStartRef.current = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
        lastTouchRef.current = {
          x: touch.clientX,
          y: touch.clientY,
        };
        setIsDragging(true);
      }
    };

    // Add event listeners with passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging, zoom, position]);

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
    e.preventDefault();
    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const img = imageRef.current;
    if (!img) return;

    const containerWidth = containerRef.current?.clientWidth || 0;
    const containerHeight = containerRef.current?.clientHeight || 0;
    const scaledWidth = img.width * zoom;
    const scaledHeight = img.height * zoom;

    const maxX = Math.max(0, (scaledWidth - containerWidth) / 2);
    const maxY = Math.max(0, (scaledHeight - containerHeight) / 2);

    const deltaX = e.clientX - (dragStart.x + rect.left);
    const deltaY = e.clientY - (dragStart.y + rect.top);

    setPosition(prev => ({
      x: Math.max(-maxX, Math.min(maxX, prev.x + deltaX)),
      y: Math.max(-maxY, Math.min(maxY, prev.y + deltaY)),
    }));

    // Update drag start to prevent accumulation
    setDragStart({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
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
    const img = imageRef.current;
    if (!canvas || !containerRef.current || !img) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // Get the actual canvas size (accounting for device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    
    // Create a new canvas with the crop dimensions (high resolution)
    // This will have the exact aspect ratio the user sees (5:7.5)
    const cropCanvas = document.createElement('canvas');
    const ctx = cropCanvas.getContext('2d');
    if (!ctx) return;

    // Set crop canvas to high resolution
    cropCanvas.width = containerWidth * dpr;
    cropCanvas.height = containerHeight * dpr;
    
    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);

    // Use the exact same calculation as drawImage to determine what's visible
    const scaledWidth = img.width * zoom;
    const scaledHeight = img.height * zoom;
    const offsetX = (containerWidth - scaledWidth) / 2 + position.x;
    const offsetY = (containerHeight - scaledHeight) / 2 + position.y;

    // Fill canvas with white background first (handles any transparent/empty areas)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, containerWidth, containerHeight);

    // Draw the image exactly as the user sees it (may include empty borders)
    ctx.drawImage(
      img,
      0, 0, img.width, img.height,
      offsetX, offsetY, scaledWidth, scaledHeight
    );

    // Get the cropped image data - this matches exactly what the user sees
    const croppedImage = cropCanvas.toDataURL('image/jpeg', 0.85);
    onCrop(croppedImage);
  };

  return (
    <div className="image-editor">
      <div className="image-editor__header">
        <h3>
          <FaCut className="image-editor__header-icon" />
          Ajusta tu imagen
        </h3>
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
          style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        >
          <canvas ref={canvasRef} className="image-editor__canvas" />
        </div>
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

