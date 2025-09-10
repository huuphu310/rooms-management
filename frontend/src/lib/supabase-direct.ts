// Direct Supabase authentication without the JS client
// This bypasses potential React 19 compatibility issues

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create timeout signal with browser compatibility
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

export interface AuthResponse {
  user: any;
  session: any;
  error?: any;
}

export async function signInWithPasswordDirect(email: string, password: string): Promise<AuthResponse> {
  console.log('🔧 DEBUG: Using direct Supabase auth (bypassing JS client)');
  
  try {
    // Test basic connectivity first
    console.log('🔧 DEBUG: Testing basic connectivity to Supabase...');
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY
      },
      signal: createTimeoutSignal(10000) // 10 second timeout
    });
    console.log('🔧 DEBUG: Basic connectivity test result:', testResponse.status);
    
    console.log('🔧 DEBUG: Attempting authentication...');
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        email,
        password
      }),
      signal: createTimeoutSignal(15000) // 15 second timeout
    });

    console.log('🔧 DEBUG: Direct auth response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.log('🔧 DEBUG: Direct auth error:', errorData);
      return {
        user: null,
        session: null,
        error: { message: errorData.msg || 'Authentication failed' }
      };
    }

    const data = await response.json();
    console.log('🔧 DEBUG: Direct auth success, data keys:', Object.keys(data));

    return {
      user: data.user,
      session: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        expires_in: data.expires_in
      },
      error: null
    };

  } catch (error: any) {
    console.error('🔧 DEBUG: Direct auth fetch error:', error);
    return {
      user: null,
      session: null,
      error: { message: error.message || 'Network error' }
    };
  }
}

export async function signOutDirect(): Promise<void> {
  // For direct implementation, we'll just clear local storage
  // In a full implementation, you'd call the Supabase logout endpoint
  localStorage.removeItem('supabase.auth.token');
}