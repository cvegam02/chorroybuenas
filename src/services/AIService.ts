/**
 * AI Service for Loteria Style Transfer
 *
 * Las llamadas a Replicate se realizan vía Edge Function (transform-loteria) para
 * mantener la API key en el servidor. El frontend solo envía la imagen y recibe el resultado.
 *
 * Modelo único: GPT-Image-1.5, elegido en el servidor. No hay modelo alterno: una foto que su
 * filtro de contenido rechaza no se transforma.
 */

import { supabase } from '../utils/supabaseClient';
import { TokenRepository } from '../repositories/TokenRepository';
import { transformWithFallback } from './aiFallback';
import { logger } from '../utils/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export interface TransformationRequest {
    image: string; // Base64 or URL
    prompt_strength?: number;
}

/** Callbacks para notificar al usuario cuando hay reintentos por contenido sensible (E005) */
export interface TransformationCallbacks {
    /** Llamado al reintentar con un prompt más permisivo (intento 2 o 3). */
    onSensitiveRetry?: (attempt: number, message: string) => void;
}

export type AIStyle = {
    id: string;
    name: string;
    prompt: string;
    previewUrl?: string;
};

export class AIService {
    public static COST_PER_IMAGE = 0.013; // USD (OpenAI GPT-Image-1.5 Low)

    /** Solo estilo lotería tradicional (Don Clemente Gallo). */
    public static STYLES: AIStyle[] = [
        {
            id: 'traditional',
            name: 'Tradicional',
            prompt: `Authentic Mexican Loteria card illustration. Style: Traditional Don Clemente Gallo vintage lithograph from the 1940s. Visual details: - Subject MUST keep the exact features, pose, and silhouette from the input image. - Bold, thick black ink outlines. Naive folk art drawing style. - Vibrant primary colors (Mexican pink, deep teal, sunflower yellow). - Flat, solid colors with visible ink texture and aged paper grain. - NO 3D, NO photorealism, NO modern digital gradients. - NO text, NO borders inside the image. The output should look like a hand-painted card from a vintage Loteria set.`
        }
    ];

    /**
     * Converts a remote URL to a Base64 Data URI
     */
    public static async urlToDataUri(url: string): Promise<string> {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            logger.error('Error fetching image to DataURI:', error);
            return url; // Fallback to original URL if it fails
        }
    }

    /**
     * Calculates the estimated cost and time for a batch of images
     */
    static getEstimation(count: number) {
        return {
            totalCost: count * this.COST_PER_IMAGE,
            estimatedSeconds: count * 45, // GPT-Image on Replicate ~45s per image
        };
    }

    /** Código de error cuando la foto no pudo generarse tras todos los reintentos (E005). */
    static readonly SENSITIVE_PHOTO_NOT_SUPPORTED = 'SENSITIVE_PHOTO_NOT_SUPPORTED';

    /**
     * Llama a la Edge Function transform-loteria con la imagen en base64.
     * El servidor cobra el token antes de generar y lo devuelve si la transformación falla.
     * Rechaza con un Error cuyo message es el código que respondió el servidor.
     */
    private static async callEdgeFunction(
        accessToken: string,
        imageBase64: string,
        params: { prompt_variant: 0 | 1 | 2; prompt_strength: number; set_id?: string }
    ): Promise<string> {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/transform-loteria`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ image: imageBase64, ...params }),
        });

        const body = await res.json().catch(() => ({}));
        if (res.ok && typeof body.output === 'string' && body.output) return body.output;
        if (res.status === 401) throw new Error('NOT_LOGGED_IN');
        if (body.error === 'CONFIG_ERROR') throw new Error('AI_NOT_CONFIGURED');
        throw new Error(typeof body.error === 'string' ? body.error : 'AI_ERROR');
    }

    /**
     * Transforma una imagen al estilo Lotería. Nunca devuelve la imagen original: si no se pudo
     * transformar, rechaza con un Error cuyo message es un código (NOT_LOGGED_IN, INSUFFICIENT_TOKENS,
     * RATE_LIMITED, AI_TIMEOUT, AI_NOT_CONFIGURED, NSFW_FILTER, SENSITIVE_PHOTO_NOT_SUPPORTED, AI_ERROR).
     * La estrategia de reintentos está en aiFallback.ts.
     */
    static async transformToLoteria(
        request: TransformationRequest,
        userId?: string,
        callbacks?: TransformationCallbacks,
        setId?: string
    ): Promise<string> {
        const { data: { session } } = await supabase.auth.refreshSession();
        if (!session?.access_token) throw new Error('NOT_LOGGED_IN');
        const accessToken = session.access_token;

        const imageBase64 = await this.urlToBase64(request.image, 768);
        const strength = request.prompt_strength ?? 0.5;

        try {
            return await transformWithFallback(
                (params) => this.callEdgeFunction(accessToken, imageBase64, {
                    ...params,
                    prompt_strength: strength,
                    set_id: setId,
                }),
                { onSensitiveRetry: callbacks?.onSensitiveRetry }
            );
        } finally {
            // El servidor cobró (o reembolsó) el token: que la UI vuelva a pedir el saldo.
            if (userId) TokenRepository.invalidateBalance(userId);
        }
    }

    /**
     * Helper to convert a URL (blob or normal) to Base64 and resize it
     */
    static async urlToBase64(url: string, maxDimension = 768): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            if (url.startsWith('http://') || url.startsWith('https://')) {
                img.crossOrigin = 'Anonymous';
            }
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height) {
                    if (width > maxDimension) {
                        height *= maxDimension / width;
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width *= maxDimension / height;
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => reject(new Error('Could not load image'));
            img.src = url;
        });
    }
}
