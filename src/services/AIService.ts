/**
 * AI Service for Loteria Style Transfer
 *
 * Modelo principal: Replicate → OpenAI GPT-Image-1.5 (img2img).
 * - Errores E005 / SENSITIVE_CONTENT_FILTER vienen del filtro de OpenAI.
 * - Fallback automático: FLUX img2img (sin filtro OpenAI) cuando GPT-Image devuelve SENSITIVE_CONTENT_FILTER.
 *
 * Opciones en Replicate (misma API key):
 * 1. openai/gpt-image-1.5: mejor calidad, filtro estricto.
 * 2. bxclib2/flux_img2img: fallback; VITE_REPLICATE_USE_FLUX=true para usarlo primero.
 *
 * Alternativas fuera de Replicate:
 * - OpenAI Images API (DALL·E 3): requiere backend para la key.
 * - Stability AI, Together AI, Fal.ai: otras APIs de imagen.
 *
 * Nota: Para producción, las llamadas deberían ir a un backend que guarde las API keys.
 */

import { TokenRepository } from '../repositories/TokenRepository';

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
     * Transforms an image to Loteria style using Replicate.
     * En E005 (sensitive): intento 1 = prompt original, 2 = personaje original, 3 = ilustración simbólica; luego FLUX; si falla, lanza SENSITIVE_PHOTO_NOT_SUPPORTED.
     */
    static async transformToLoteria(
        request: TransformationRequest,
        userId?: string,
        callbacks?: TransformationCallbacks,
        /** setId opcional para vincular el gasto a una lotería. */
        setId?: string
    ): Promise<string> {
        // 1. Token Check (if logged in)
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

        const apiKey = import.meta.env.VITE_REPLICATE_API_TOKEN;

        if (!apiKey) {
            console.warn('No Replicate API Token found. Falling back to mock.');
            await new Promise(resolve => setTimeout(resolve, this.MOCK_DELAY));
            return request.image;
        }

        const useFluxFirst = import.meta.env.VITE_REPLICATE_USE_FLUX === 'true';

        if (useFluxFirst) {
            try {
                const result = await this.realTransformFluxImg2Img(request.image, apiKey, request.prompt_strength ?? 0.65);
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

        const strength = request.prompt_strength ?? 0.5;
        let promptVariant: 0 | 1 | 2 = 0;
        let lastError: Error | null = null;

        while (promptVariant <= 2) {
            try {
                const result = await this.realTransform(
                    request.image,
                    apiKey,
                    strength,
                    this.getPromptVariant(promptVariant as 0 | 1 | 2)
                );

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
            throw new Error(this.SENSITIVE_PHOTO_NOT_SUPPORTED);
        }
        throw lastError ?? new Error('FAILED_AFTER_RETRIES');
    }

    /**
     * Helper to convert a URL (blob or normal) to Base64 and resize it
     */
    static async urlToBase64(url: string, maxDimension = 768): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            // Solo CORS para URLs remotas; blob/data no lo necesitan y puede dar problemas
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

    /** Parte común del prompt (estilo Lotería) usada en todos los intentos. */
    private static LOTERIA_PROMPT_TAIL = `
Style: Traditional Don Clemente Gallo vintage lithograph from the 1940s. 
Visual details:
- Bold, thick black ink outlines. Naive folk art drawing style.
- Vibrant primary colors (Mexican pink, deep teal, sunflower yellow).
- Flat, solid colors with visible ink texture and aged paper grain.
- NO 3D, NO photorealism, NO modern digital gradients.
- NO text, NO borders inside the image.
The output should look like a hand-painted card from a vintage Loteria set.`;

    /** Prompt 0: estilo lotería fiel al sujeto de la imagen de entrada. */
    private static PROMPT_0 = `Authentic Mexican Loteria card illustration. Style: Traditional Don Clemente Gallo vintage lithograph from the 1940s. Visual details: - Subject MUST keep the exact features, pose, and silhouette from the input image. - Bold, thick black ink outlines. Naive folk art drawing style. - Vibrant primary colors (Mexican pink, deep teal, sunflower yellow). - Flat, solid colors with visible ink texture and aged paper grain. - NO 3D, NO photorealism, NO modern digital gradients. - NO text, NO borders inside the image. The output should look like a hand-painted card from a vintage Loteria set.`;

    /**
     * Devuelve el prompt para el intento dado (0 = original, 1 = personaje original, 2 = ilustración simbólica).
     */
    private static getPromptVariant(attempt: 0 | 1 | 2): string {
        if (attempt === 0) {
            return this.PROMPT_0;
        }
        if (attempt === 1) {
            return `Create an original 2D folk art illustration inspired by the input image.
Do NOT preserve exact facial features, body proportions, or identity.
The result must be an original character.${this.LOTERIA_PROMPT_TAIL}`;
        }
        return `Create a symbolic illustration inspired by the theme and colors of the image.${this.LOTERIA_PROMPT_TAIL}`;
    }

    /**
     * Real Replicate API Call (openai/gpt-image-1.5). Opcionalmente con prompt custom (para reintentos E005).
     */
    static async realTransform(image: string, apiKey: string, strength = 0.3, promptOverride?: string): Promise<string> {
        try {
            // 1. Convert and Resize to Base64 Data URI
            const imageData = await this.urlToBase64(image, 768);

            // 2. Start prediction
            const baseUrl = import.meta.env.DEV ? '/api/replicate' : 'https://api.replicate.com/v1';

            const mainPrompt = promptOverride ?? this.getPromptVariant(0);

            let response;
            let attempts = 0;
            const maxAttempts = 5;

            // Map strength (0-1) to input_fidelity ("low" or "high")
            const fidelity = strength > 0.4 ? "high" : "low";

            while (attempts < maxAttempts) {
                response = await fetch(`${baseUrl}/predictions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        // Model: openai/gpt-image-1.5
                        version: "118f53498ea7319519229b2d5bd0d4a69e3d77eb60d6292d5db38125534dc1ca",
                        input: {
                            input_images: [imageData],
                            prompt: mainPrompt,
                            input_fidelity: fidelity,
                            quality: "low",
                            aspect_ratio: "2:3",
                            output_format: "webp"
                        }
                    })
                });

                if (response.status === 429) {
                    try {
                        const errorJson = await response.json();
                        const waitTime = (errorJson.retry_after || 10) * 1000;
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        attempts++;
                        continue;
                    } catch (e) {
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        attempts++;
                        continue;
                    }
                }
                break;
            }

            if (!response || !response.ok) {
                const errorText = response ? await response.text() : 'No response from AI';
                let detail = response ? response.statusText : 'Unknown';
                try {
                    const errorJson = JSON.parse(errorText);
                    detail = errorJson.detail || JSON.stringify(errorJson);
                } catch (e) { /* ignore */ }

                console.error('Replicate raw error:', errorText);
                throw new Error(`AI Error (${response?.status}): ${detail}`);
            }

            let prediction = await response.json();

            // 3. Poll for the result
            while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
                await new Promise(resolve => setTimeout(resolve, 3000));
                const pollResponse = await fetch(`${baseUrl}/predictions/${prediction.id}`, {
                    headers: { 'Authorization': `Token ${apiKey}` }
                });
                prediction = await pollResponse.json();

                if (prediction.status === 'failed') {
                    const errorMsg = ((prediction.error || '') + (prediction.logs || '')).toLowerCase();
                    const isSafetyError = errorMsg.includes('nsfw') ||
                        errorMsg.includes('blocked') ||
                        errorMsg.includes('safety') ||
                        errorMsg.includes('content policy');

                    if (isSafetyError) {
                        throw new Error('NSFW_FILTER');
                    }
                    // E005 / "sensitive": input or output flagged by content filter (OpenAI/Replicate)
                    const isSensitiveError = errorMsg.includes('sensitive') || errorMsg.includes('e005');
                    if (isSensitiveError) {
                        throw new Error('SENSITIVE_CONTENT_FILTER');
                    }
                    throw new Error(`AI Transformation failed: ${prediction.error || 'Unknown error'}`);
                }
            }

            return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        } catch (error) {
            console.error('Replicate API Error:', error);
            throw error;
        }
    }

    /**
     * Prompt único para estilo lotería (FLUX); enfatiza sujeto primero, luego estilo.
     */
    private static getLoteriaStylePrompt(): string {
        return `Same subject, same pose and composition as the input image. Mexican Loteria card, Don Clemente Gallo vintage 1940s style, lithograph print. Bold thick black outlines, naive folk art, flat colors. Mexican pink, teal, sunflower yellow, solid flat fills. Visible ink texture, aged paper grain. Illustration only, no photorealism, no 3D, no text.`;
    }

    /**
     * Fallback: FLUX img2img (bxclib2/flux_img2img).
     * Sin filtro OpenAI. denoising bajo (0.52) preserva sujeto y aplica estilo sobre la estructura.
     */
    static async realTransformFluxImg2Img(
        image: string,
        apiKey: string,
        denoising = 0.52
    ): Promise<string> {
        const imageData = await this.urlToBase64(image, 768);
        const baseUrl = import.meta.env.DEV ? '/api/replicate' : 'https://api.replicate.com/v1';

        const response = await fetch(`${baseUrl}/predictions`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: "0ce45202d83c6bd379dfe58f4c0c41e6cadf93ebbd9d938cc63cc0f2fcb729a5",
                input: {
                    image: imageData,
                    positive_prompt: this.getLoteriaStylePrompt(),
                    denoising: Math.min(0.72, Math.max(0.45, denoising)),
                    steps: 28,
                    scheduler: "simple",
                    sampler_name: "euler",
                    seed: 0,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let detail = response.statusText;
            try {
                const errorJson = JSON.parse(errorText);
                detail = errorJson.detail ?? JSON.stringify(errorJson);
            } catch {
                // ignore
            }
            throw new Error(`FLUX img2img error (${response.status}): ${detail}`);
        }

        let prediction = await response.json();

        while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
            await new Promise(resolve => setTimeout(resolve, 3000));
            const pollResponse = await fetch(`${baseUrl}/predictions/${prediction.id}`, {
                headers: { 'Authorization': `Token ${apiKey}` },
            });
            prediction = await pollResponse.json();
        }

        if (prediction.status === 'failed') {
            throw new Error(`FLUX img2img failed: ${prediction.error ?? 'Unknown'}`);
        }

        const output = prediction.output;
        return typeof output === 'string' ? output : (Array.isArray(output) ? output[0] : output);
    }
}
