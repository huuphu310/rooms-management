import axios from 'axios'
import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth interceptor that checks both auth store and Supabase session
api.interceptors.request.use(async (config) => {
  let token = null;
  
  // First try to get token from auth store (persistent storage)
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const authData = JSON.parse(authStorage);
      if (authData?.state?.token && authData?.state?.isAuthenticated) {
        token = authData.state.token;
        console.log('🔧 DEBUG: Using token from auth store for API request');
      }
    }
  } catch (error) {
    console.warn('Failed to read token from auth store:', error);
  }
  
  // Fallback to Supabase session if no token from auth store
  if (!token) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        token = session.access_token;
        console.log('🔧 DEBUG: Using token from Supabase session for API request');
      }
    } catch (error) {
      console.warn('Failed to get token from Supabase session:', error);
    }
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn('🔧 DEBUG: No authentication token available for API request');
  }
  
  return config
})

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
