/**
 * AI Service for Loteria Style Transfer
 *
 * Las llamadas a Replicate se realizan vía Edge Function (transform-loteria) para
 * mantener la API key en el servidor. El frontend solo envía la imagen y recibe el resultado.
 *
 * Modelo principal: GPT-Image-1.5. Fallback: FLUX img2img cuando GPT-Image devuelve SENSITIVE_CONTENT_FILTER.
 * VITE_REPLICATE_USE_FLUX=true para usar FLUX primero (preferencia de estilo, no secreto).
 */

import { supabase } from '../utils/supabaseClient';
import { TokenRepository } from '../repositories/TokenRepository';

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
    private static MOCK_DELAY = 2000;
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
            console.error('Error fetching image to DataURI:', error);
            return url; // Fallback to original URL if it fails
        }
    }

    /**
     * Calculates the estimated cost and time for a batch of images
     */
    static getEstimation(count: number) {
        return {
            totalCost: count * this.COST_PER_IMAGE,
            estimatedSeconds: count * 45, // GPT-Image / FLUX on Replicate ~45s per image
        };
    }

    /** Código de error cuando la foto no pudo generarse tras todos los reintentos (E005). */
    static readonly SENSITIVE_PHOTO_NOT_SUPPORTED = 'SENSITIVE_PHOTO_NOT_SUPPORTED';

    /**
     * Llama a la Edge Function transform-loteria con la imagen en base64.
     */
    private static async callEdgeFunction(
        imageBase64: string,
        params: { model: 'gpt-image' | 'flux'; prompt_variant?: 0 | 1 | 2; prompt_strength?: number }
    ): Promise<string> {
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
        if (!refreshedSession?.access_token) {
            throw new Error('NOT_LOGGED_IN');
        }

        const res = await fetch(`${SUPABASE_URL}/functions/v1/transform-loteria`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${refreshedSession.access_token}`,
                apikey: SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
                image: imageBase64,
                model: params.model,
                prompt_variant: params.prompt_variant ?? 0,
                prompt_strength: params.prompt_strength ?? 0.5,
            }),
        });

        const body = await res.json().catch(() => ({}));

        if (res.status === 401) {
            throw new Error('NOT_LOGGED_IN');
        }

        if (res.status === 500 && body.error === 'CONFIG_ERROR') {
            console.warn('Edge Function: REPLICATE_API_TOKEN no configurado en Supabase. Usar mock.');
            throw new Error('CONFIG_ERROR');
        }

        if (!res.ok) {
            const msg = body.message ?? body.error ?? res.statusText;
            if (body.error === 'NSFW_FILTER') throw new Error('NSFW_FILTER');
            if (body.error === 'SENSITIVE_CONTENT_FILTER') throw new Error('SENSITIVE_CONTENT_FILTER');
            throw new Error(msg);
        }

        if (body.output) return body.output;
        throw new Error(body.message ?? 'Respuesta inválida de la IA');
    }

    /**
     * Transforms an image to Loteria style via Edge Function.
     * En E005 (sensitive): intento 1 = prompt original, 2 = personaje original, 3 = ilustración simbólica; luego FLUX.
     */
    static async transformToLoteria(
        request: TransformationRequest,
        userId?: string,
        callbacks?: TransformationCallbacks,
        setId?: string
    ): Promise<string> {
        if (userId) {
            try {
                const balance = await TokenRepository.getBalance(userId);
                if (balance < 1) {
                    throw new Error('INSUFFICIENT_TOKENS');
                }
            } catch (error: any) {
                if (error.message === 'INSUFFICIENT_TOKENS') throw error;
                console.warn('Error checking token balance, proceeding anyway:', error);
            }
        }

        const { data: { session } } = await supabase.auth.refreshSession();
        if (!session?.access_token) {
            console.warn('No session. Falling back to mock.');
            await new Promise(resolve => setTimeout(resolve, this.MOCK_DELAY));
            return request.image;
        }

        const imageBase64 = await this.urlToBase64(request.image, 768);
        const useFluxFirst = import.meta.env.VITE_REPLICATE_USE_FLUX === 'true';
        const strength = request.prompt_strength ?? 0.5;

        try {
        if (useFluxFirst) {
            try {
                const result = await this.callEdgeFunction(imageBase64, {
                    model: 'flux',
                    prompt_strength: strength || 0.65,
                });
                if (userId) {
                    try {
                        await TokenRepository.spendTokens(userId, 1, setId);
                    } catch (error) {
                        console.error('Failed to deduct token after success:', error);
                    }
                }
                return result;
            } catch (error: any) {
                console.warn('FLUX img2img failed, falling back to GPT-Image:', error.message);
            }
        }

        let promptVariant: 0 | 1 | 2 = 0;
        let lastError: Error | null = null;

        while (promptVariant <= 2) {
            try {
                const result = await this.callEdgeFunction(imageBase64, {
                    model: 'gpt-image',
                    prompt_variant: promptVariant as 0 | 1 | 2,
                    prompt_strength: strength,
                });

                if (userId) {
                    try {
                        await TokenRepository.spendTokens(userId, 1, setId);
                    } catch (error) {
                        console.error('Failed to deduct token after success:', error);
                    }
                }

                return result;
            } catch (error: any) {
                lastError = error;
                const isNsfw = error.message === 'NSFW_FILTER';
                const isSensitive = error.message === 'SENSITIVE_CONTENT_FILTER';

                if (isNsfw && promptVariant <= 2) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    continue;
                }
                if (isSensitive) {
                    if (promptVariant < 2) {
                        callbacks?.onSensitiveRetry?.(promptVariant + 1, 'cardEditor.errors.aiSensitiveRetrying');
                        promptVariant++;
                        await new Promise(resolve => setTimeout(resolve, 500));
                        continue;
                    }
                    break;
                }
                throw error;
            }
        }

        if (lastError?.message === 'SENSITIVE_CONTENT_FILTER') {
            try {
                const result = await this.callEdgeFunction(imageBase64, {
                    model: 'flux',
                    prompt_strength: strength || 0.65,
                });
                if (userId) {
                    try {
                        await TokenRepository.spendTokens(userId, 1, setId);
                    } catch (e) {
                        console.error('Failed to deduct token after success:', e);
                    }
                }
                return result;
            } catch {
                throw new Error(this.SENSITIVE_PHOTO_NOT_SUPPORTED);
            }
        }
        throw lastError ?? new Error('FAILED_AFTER_RETRIES');
        } catch (err: any) {
            if (err.message === 'CONFIG_ERROR') {
                console.warn('REPLICATE_API_TOKEN no configurado. Falling back to mock.');
                await new Promise(resolve => setTimeout(resolve, this.MOCK_DELAY));
                return request.image;
            }
            throw err;
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
