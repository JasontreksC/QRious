import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const isValidUrl = (url: string) => {
  return url.startsWith('http://') || url.startsWith('https://');
};

// Export null if the configuration is not a valid URL (e.g. placeholder) to prevent build failures.
export const supabase = isValidUrl(supabaseUrl) && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
