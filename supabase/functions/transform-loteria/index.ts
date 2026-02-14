import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const REPLICATE_API_BASE = 'https://api.replicate.com/v1';

const LOTERIA_PROMPT_TAIL = `
Style: Traditional Don Clemente Gallo vintage lithograph from the 1940s. 
Visual details:
- Bold, thick black ink outlines. Naive folk art drawing style.
- Vibrant primary colors (Mexican pink, deep teal, sunflower yellow).
- Flat, solid colors with visible ink texture and aged paper grain.
- NO 3D, NO photorealism, NO modern digital gradients.
- NO text, NO borders inside the image.
The output should look like a hand-painted card from a vintage Loteria set.`;

const PROMPTS: Record<number, string> = {
  0: `Authentic Mexican Loteria card illustration. Style: Traditional Don Clemente Gallo vintage lithograph from the 1940s. Visual details: - Subject MUST keep the exact features, pose, and silhouette from the input image. - Bold, thick black ink outlines. Naive folk art drawing style. - Vibrant primary colors (Mexican pink, deep teal, sunflower yellow). - Flat, solid colors with visible ink texture and aged paper grain. - NO 3D, NO photorealism, NO modern digital gradients. - NO text, NO borders inside the image. The output should look like a hand-painted card from a vintage Loteria set.`,
  1: `Create an original 2D folk art illustration inspired by the input image.
Do NOT preserve exact facial features, body proportions, or identity.
The result must be an original character.${LOTERIA_PROMPT_TAIL}`,
  2: `Create a symbolic illustration inspired by the theme and colors of the image.${LOTERIA_PROMPT_TAIL}`,
};

const FLUX_PROMPT = `Same subject, same pose and composition as the input image. Mexican Loteria card, Don Clemente Gallo vintage 1940s style, lithograph print. Bold thick black outlines, naive folk art, flat colors. Mexican pink, teal, sunflower yellow, solid flat fills. Visible ink texture, aged paper grain. Illustration only, no photorealism, no 3D, no text.`;

interface RequestBody {
  image: string; // Base64 data URI
  prompt_strength?: number;
  model?: 'gpt-image' | 'flux';
  prompt_variant?: 0 | 1 | 2;
}

async function callReplicate(
  apiKey: string,
  body: Record<string, unknown>
): Promise<{ id: string }> {
  const res = await fetch(`${REPLICATE_API_BASE}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    const err = await res.json().catch(() => ({}));
    const waitMs = (err.retry_after || 10) * 1000;
    await new Promise((r) => setTimeout(r, waitMs));
    return callReplicate(apiKey, body);
  }

  if (!res.ok) {
    const text = await res.text();
    let detail = res.statusText;
    try {
      const j = JSON.parse(text);
      detail = j.detail ?? JSON.stringify(j);
    } catch {
      // ignore
    }
    throw new Error(`Replicate API (${res.status}): ${detail}`);
  }

  return res.json();
}

async function pollPrediction(apiKey: string, id: string): Promise<unknown> {
  const res = await fetch(`${REPLICATE_API_BASE}/predictions/${id}`, {
    headers: { Authorization: `Token ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`Replicate poll (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

async function runGptImage(
  apiKey: string,
  imageData: string,
  strength: number,
  promptVariant: 0 | 1 | 2
): Promise<string> {
  const fidelity = strength > 0.4 ? 'high' : 'low';
  const prompt = PROMPTS[promptVariant] ?? PROMPTS[0];

  const pred = await callReplicate(apiKey, {
    version: '118f53498ea7319519229b2d5bd0d4a69e3d77eb60d6292d5db38125534dc1ca',
    input: {
      input_images: [imageData],
      prompt,
      input_fidelity: fidelity,
      quality: 'low',
      aspect_ratio: '2:3',
      output_format: 'webp',
    },
  });

  let prediction: { status: string; output?: string | string[]; error?: string; logs?: string } = pred as never;
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
    await new Promise((r) => setTimeout(r, 3000));
    prediction = (await pollPrediction(apiKey, prediction.id)) as typeof prediction;
  }

  if (prediction.status === 'failed') {
    const msg = ((prediction.error || '') + (prediction.logs || '')).toLowerCase();
    if (msg.includes('nsfw') || msg.includes('blocked') || msg.includes('safety') || msg.includes('content policy')) {
      throw new Error('NSFW_FILTER');
    }
    if (msg.includes('sensitive') || msg.includes('e005')) {
      throw new Error('SENSITIVE_CONTENT_FILTER');
    }
    throw new Error(`AI Transformation failed: ${prediction.error || 'Unknown'}`);
  }

  const out = prediction.output;
  return Array.isArray(out) ? out[0] : (out as string);
}

async function runFlux(
  apiKey: string,
  imageData: string,
  denoising: number
): Promise<string> {
  const pred = await callReplicate(apiKey, {
    version: '0ce45202d83c6bd379dfe58f4c0c41e6cadf93ebbd9d938cc63cc0f2fcb729a5',
    input: {
      image: imageData,
      positive_prompt: FLUX_PROMPT,
      denoising: Math.min(0.72, Math.max(0.45, denoising)),
      steps: 28,
      scheduler: 'simple',
      sampler_name: 'euler',
      seed: 0,
    },
  });

  let prediction: { status: string; output?: string | string[] } = pred as never;
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
    await new Promise((r) => setTimeout(r, 3000));
    prediction = (await pollPrediction(apiKey, prediction.id)) as typeof prediction;
  }

  if (prediction.status === 'failed') {
    throw new Error(`FLUX img2img failed: ${(prediction as { error?: string }).error ?? 'Unknown'}`);
  }

  const out = prediction.output;
  return typeof out === 'string' ? out : (Array.isArray(out) ? out[0] : (out as string));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'NOT_LOGGED_IN', message: 'Se requiere autenticación.' }),
      { status: 401, headers: corsHeaders }
    );
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const replicateToken = Deno.env.get('REPLICATE_API_TOKEN');

  if (!replicateToken) {
    console.error('transform-loteria: REPLICATE_API_TOKEN no configurado');
    return new Response(
      JSON.stringify({ error: 'CONFIG_ERROR', message: 'Servicio de IA no configurado.' }),
      { status: 500, headers: corsHeaders }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: 'NOT_LOGGED_IN', message: 'Sesión inválida o expirada.' }),
      { status: 401, headers: corsHeaders }
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'INVALID_REQUEST', message: 'Body JSON inválido.' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const image = body?.image;
  if (!image || typeof image !== 'string') {
    return new Response(
      JSON.stringify({ error: 'INVALID_REQUEST', message: 'Se requiere image (base64 data URI).' }),
      { status: 400, headers: corsHeaders }
    );
  }

  const model = body.model ?? 'gpt-image';
  const promptStrength = body.prompt_strength ?? 0.5;
  const promptVariant = (body.prompt_variant ?? 0) as 0 | 1 | 2;

  try {
    let output: string;
    if (model === 'flux') {
      output = await runFlux(replicateToken, image, promptStrength || 0.65);
    } else {
      output = await runGptImage(replicateToken, image, promptStrength, promptVariant);
    }
    return new Response(JSON.stringify({ output }), { headers: corsHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = msg === 'NSFW_FILTER' ? 'NSFW_FILTER' :
      msg === 'SENSITIVE_CONTENT_FILTER' ? 'SENSITIVE_CONTENT_FILTER' : 'AI_ERROR';
    return new Response(
      JSON.stringify({ error: code, message: msg }),
      { status: 400, headers: corsHeaders }
    );
  }
});
