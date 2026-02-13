import { createClient } from '@supabase/supabase-js';

/** Use VITE_SUPABASE_URL. In production, set it to your custom auth domain (e.g. https://auth.chorroybuenas.com.mx) so Google OAuth shows your domain instead of *.supabase.co. See docs/OAUTH_DOMINIO_PERSONALIZADO.md */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing in .env file');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
