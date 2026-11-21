import { supabase } from '../utils/supabaseClient';
import { boardBackgroundImagePath } from '../utils/boardBackgrounds';

/** Mismo almacenamiento privado que las fotos de las cartas: solo la dueña lee y escribe su carpeta. */
const BUCKET = 'card-images';

/** Imagen propia de fondo de los tableros (FEAT-67, US A2). */
export class BoardBackgroundRepository {
  /** Sube la imagen y devuelve su ruta. Lanza si no se pudo. */
  static async uploadImage(userId: string, setId: string, file: File): Promise<string> {
    const path = boardBackgroundImagePath(userId, setId, file.type, Date.now());
    const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    return data.path;
  }

  /** Borra una imagen de fondo que ya no se usa. Lanza si no se pudo. */
  static async removeImage(path: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  }
}
