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
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.75
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

