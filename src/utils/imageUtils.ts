/**
 * Compresses an image to reduce file size for storage
 * @param imageSrc - Base64 image string
 * @param maxWidth - Maximum width (default: 1200px)
 * @param maxHeight - Maximum height (default: 1200px)
 * @param quality - JPEG quality 0-1 (default: 0.75)
 * @returns Compressed base64 image string
 */
export const compressImage = (
  imageSrc: string,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.65
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        
        if (width > height) {
          width = Math.min(width, maxWidth);
          height = width / aspectRatio;
        } else {
          height = Math.min(height, maxHeight);
          width = height * aspectRatio;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG with compression (even if original was PNG)
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    
    img.onerror = () => {
      reject(new Error('Error loading image for compression'));
    };
    
    img.src = imageSrc;
  });
};

export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsDataURL(file);
  });
};

export const validateImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return validTypes.includes(file.type);
};

export const resizeImageToAspectRatio = (
  file: File,
  targetWidth: number,
  targetHeight: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    img.onload = () => {
      // Calculate dimensions to maintain aspect ratio while fitting target size
      const aspectRatio = targetWidth / targetHeight;
      const imgAspectRatio = img.width / img.height;
      
      let drawWidth = img.width;
      let drawHeight = img.height;
      let x = 0;
      let y = 0;
      
      if (imgAspectRatio > aspectRatio) {
        // Image is wider than target aspect ratio
        drawHeight = img.height;
        drawWidth = img.height * aspectRatio;
        x = (img.width - drawWidth) / 2;
      } else {
        // Image is taller than target aspect ratio
        drawWidth = img.width;
        drawHeight = img.width / aspectRatio;
        y = (img.height - drawHeight) / 2;
      }
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      ctx.drawImage(
        img,
        x, y, drawWidth, drawHeight,
        0, 0, targetWidth, targetHeight
      );
      
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    
    img.onerror = () => {
      reject(new Error('Error loading image'));
    };
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Adjusts a base64 image to match card aspect ratio (5:7.5) using "cover" mode
 * This ensures images fill the card area exactly as shown in preview
 * @param imageSrc - Base64 image string
 * @param targetWidth - Target width (default: 800px)
 * @param targetHeight - Target height (default: 1200px for 5:7.5 ratio)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @returns Adjusted base64 image string with exact aspect ratio
 */
export const adjustImageToCardAspectRatio = (
  imageSrc: string,
  targetWidth: number = 800,
  targetHeight: number = 1200,
  quality: number = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }
    
    img.onload = () => {
      // Card aspect ratio is 5:7.5 = 2/3 = 0.666...
      const cardAspectRatio = targetWidth / targetHeight;
      const imgAspectRatio = img.width / img.height;
      
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = img.width;
      let sourceHeight = img.height;
      
      // Use "cover" mode: crop the image to match card aspect ratio
      // This matches how object-fit: cover works in CSS
      if (imgAspectRatio > cardAspectRatio) {
        // Image is wider than card - crop sides
        sourceHeight = img.height;
        sourceWidth = img.height * cardAspectRatio;
        sourceX = (img.width - sourceWidth) / 2;
      } else {
        // Image is taller than card - crop top/bottom
        sourceWidth = img.width;
        sourceHeight = img.width / cardAspectRatio;
        sourceY = (img.height - sourceHeight) / 2;
      }
      
      // Set canvas to target dimensions (high resolution)
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Fill with white background first
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      // Draw the cropped portion scaled to fill the canvas
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, targetWidth, targetHeight
      );
      
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    
    img.onerror = () => {
      reject(new Error('Error loading image'));
    };
    
    img.src = imageSrc;
  });
};
