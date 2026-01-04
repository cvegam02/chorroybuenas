/**
 * Servicio para manejar el almacenamiento de imágenes en IndexedDB
 * IndexedDB permite almacenar mucho más datos que localStorage (cientos de MB o GB)
 */

const DB_NAME = 'loteria_db';
const DB_VERSION = 1;
const STORE_NAME = 'card_images';

interface DBInstance {
  db: IDBDatabase | null;
}

let dbInstance: DBInstance = { db: null };

/**
 * Inicializa la base de datos IndexedDB
 */
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance.db) {
      resolve(dbInstance.db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Error al abrir IndexedDB'));
    };

    request.onsuccess = () => {
      dbInstance.db = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Crear object store si no existe
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('id', 'id', { unique: true });
      }
    };
  });
};

/**
 * Convierte base64 a Blob
 * Maneja diferentes formatos: data:image/...;base64,... o solo el base64
 */
export const base64ToBlob = (base64: string): Blob => {
  try {
    // Validar y limpiar el base64
    const { data: base64Data, mime } = validateAndCleanBase64(base64);
    
    // Decodificar base64 a bytes
    try {
      const byteString = atob(base64Data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      return new Blob([ab], { type: mime });
    } catch (atobError) {
      // Si atob falla, puede ser porque el base64 tiene caracteres inválidos
      // o porque la longitud no es múltiplo de 4 (después del padding)
      throw new Error(
        `Error al decodificar base64 con atob: ${atobError instanceof Error ? atobError.message : 'Error desconocido'}. ` +
        `Longitud del base64: ${base64Data.length}, MIME: ${mime}`
      );
    }
  } catch (error) {
    console.error('Error convirtiendo base64 a Blob:', error);
    console.error('Base64 recibido (tipo):', typeof base64);
    console.error('Base64 recibido (longitud):', base64?.length);
    console.error('Base64 recibido (primeros 200 caracteres):', base64?.substring(0, 200));
    throw error instanceof Error ? error : new Error('Error desconocido al convertir base64 a Blob');
  }
};

/**
 * Convierte Blob a base64 (para compatibilidad con componentes que esperan base64)
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Error al convertir Blob a base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Valida y limpia una cadena base64
 */
const validateAndCleanBase64 = (base64: string): { data: string; mime: string } => {
  if (!base64 || typeof base64 !== 'string') {
    throw new Error('La cadena base64 no es válida: no es un string');
  }
  
  let base64Data: string;
  let mime: string = 'image/jpeg';
  
  // Verificar si tiene el prefijo data:image/...
  if (base64.startsWith('data:')) {
    const parts = base64.split(',');
    if (parts.length < 2) {
      throw new Error('Formato base64 inválido: falta la parte de datos después de la coma');
    }
    
    // Extraer el tipo MIME del prefijo
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (mimeMatch && mimeMatch[1]) {
      mime = mimeMatch[1];
    }
    base64Data = parts[1];
  } else {
    // Si no tiene prefijo, asumir que es solo el base64
    base64Data = base64;
  }
  
  // Limpiar espacios, saltos de línea y otros caracteres whitespace
  base64Data = base64Data.replace(/\s/g, '');
  
  if (base64Data.length === 0) {
    throw new Error('La cadena base64 está vacía después de limpiar espacios');
  }
  
  // Validar formato base64
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64Data)) {
    // Encontrar el primer carácter inválido para debugging
    const invalidChar = base64Data.match(/[^A-Za-z0-9+/=]/)?.[0];
    throw new Error(
      `Formato base64 inválido: contiene caracteres no válidos. ` +
      `Carácter inválido encontrado: "${invalidChar}" (código: ${invalidChar?.charCodeAt(0)}). ` +
      `Longitud: ${base64Data.length}, Primeros 100 caracteres: ${base64Data.substring(0, 100)}`
    );
  }
  
  return { data: base64Data, mime };
};

/**
 * Convierte blob URL a Blob
 */
const blobURLToBlob = async (blobURL: string): Promise<Blob> => {
  try {
    const response = await fetch(blobURL);
    if (!response.ok) {
      throw new Error(`Error al obtener blob desde URL: ${response.statusText}`);
    }
    return await response.blob();
  } catch (error) {
    console.error('Error convirtiendo blob URL a Blob:', error);
    throw new Error(`Error al convertir blob URL a Blob: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};

/**
 * Guarda una imagen en IndexedDB
 * Acepta: base64 string, blob URL, o Blob directamente
 */
export const saveImage = async (cardId: string, imageData: string | Blob): Promise<string> => {
  try {
    const db = await initDB();
    
    let blob: Blob;
    
    if (typeof imageData === 'string') {
      // Verificar si es un blob URL
      if (imageData.startsWith('blob:')) {
        blob = await blobURLToBlob(imageData);
      } else {
        // Es base64, convertir a Blob
        blob = base64ToBlob(imageData);
      }
    } else {
      // Ya es un Blob
      blob = imageData;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put({
        id: cardId,
        image: blob,
        timestamp: Date.now(),
      });

      request.onsuccess = () => {
        // Retornar una URL de objeto para usar en los componentes
        const objectURL = URL.createObjectURL(blob);
        resolve(objectURL);
      };

      request.onerror = () => {
        reject(new Error('Error al guardar imagen en IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
};

/**
 * Obtiene una imagen de IndexedDB
 */
export const getImage = async (cardId: string): Promise<string | null> => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(cardId);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.image instanceof Blob) {
          const objectURL = URL.createObjectURL(result.image);
          resolve(objectURL);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(new Error('Error al obtener imagen de IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error getting image:', error);
    return null;
  }
};

/**
 * Elimina una imagen de IndexedDB
 */
export const deleteImage = async (cardId: string): Promise<void> => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(cardId);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Error al eliminar imagen de IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * Elimina todas las imágenes de IndexedDB
 */
export const clearAllImages = async (): Promise<void> => {
  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Error al limpiar imágenes de IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error clearing images:', error);
    throw error;
  }
};

/**
 * Migra imágenes de base64 en localStorage a IndexedDB
 */
export const migrateImagesToIndexedDB = async (cards: Array<{ id: string; image: string }>): Promise<void> => {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const migrationPromises = cards.map((card) => {
      return new Promise<void>((resolve, reject) => {
        // Verificar si la imagen ya existe
        const checkRequest = store.get(card.id);
        checkRequest.onsuccess = () => {
          if (checkRequest.result) {
            // Ya existe, no migrar
            resolve();
            return;
          }

          // Convertir base64 a Blob y guardar
          try {
            const blob = base64ToBlob(card.image);
            const putRequest = store.put({
              id: card.id,
              image: blob,
              timestamp: Date.now(),
            });

            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(new Error(`Error migrando imagen ${card.id}`));
          } catch (error) {
            console.warn(`Error convirtiendo imagen ${card.id}:`, error);
            resolve(); // Continuar con otras imágenes aunque una falle
          }
        };
        checkRequest.onerror = () => reject(new Error(`Error verificando imagen ${card.id}`));
      });
    });

    await Promise.all(migrationPromises);
  } catch (error) {
    console.error('Error en migración de imágenes:', error);
    throw error;
  }
};

