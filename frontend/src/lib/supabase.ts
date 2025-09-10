import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

console.log('🔧 DEBUG: Supabase client initialized with:', { 
  url: supabaseUrl, 
  keyPrefix: supabaseAnonKey?.substring(0, 20) + '...' 
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: (url, options = {}) => {
      console.log('🔧 DEBUG: Supabase fetch request to:', url);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('🔧 DEBUG: Supabase request timeout after 30s');
        controller.abort();
      }, 30000);

      return fetch(url, {
        ...options,
        signal: controller.signal
      }).finally(() => {
        clearTimeout(timeoutId);
      });
    }
  }
})