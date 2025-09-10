import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { signInWithPasswordDirect, signOutDirect } from '@/lib/supabase-direct';
// Using direct fetch instead of axios due to XHR timeout issues
// import { api } from '@/lib/api';

// Get API base URL from environment (same as api.ts)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Updated to match backend role system
export type UserRole = 'admin' | 'manager' | 'receptionist' | 'accountant';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department?: string;
  position?: string;
  is_super_admin?: boolean;
  account_status?: string;
  role_id?: string;
  raw_app_meta_data?: Record<string, any>;
  raw_user_meta_data?: Record<string, any>;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  permissions: string[];
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  loadPermissions: () => Promise<void>;
  
  // New role-based permission helpers
  isAdmin: () => boolean;
  isStaff: () => boolean;
  hasRole: (role: UserRole) => boolean;
  canAccess: (module: string, action?: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

// All permissions are now dynamically loaded from the database
// No hardcoded permission matrix needed

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      permissions: [],

      login: async (email: string, password: string) => {
        console.log('🔧 DEBUG: Starting backend login with:', { email });
        set({ isLoading: true, error: null });
        try {
          // Use our updated backend login endpoint that returns role_id and metadata
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            signal: (() => {
              const controller = new AbortController();
              setTimeout(() => controller.abort(), 30000);
              return controller.signal;
            })(),
          });

          console.log('🔧 DEBUG: Backend login response:', { 
            status: response.status,
            url: response.url
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Login failed');
          }

          const loginData = await response.json();
          console.log('🔧 DEBUG: Login response data:', loginData);

          if (loginData.success && loginData.user && loginData.session) {
            // Validate and ensure role is one of the allowed values
            const validRoles: UserRole[] = ['admin', 'manager', 'receptionist', 'accountant'];
            let userRole: UserRole = 'receptionist'; // Default fallback
            
            if (loginData.user.role && validRoles.includes(loginData.user.role as UserRole)) {
              userRole = loginData.user.role as UserRole;
            } else if (loginData.user.is_super_admin) {
              userRole = 'admin';
            }
            
            console.log('Final user role assigned:', userRole);

            const user: User = {
              id: loginData.user.id,
              email: loginData.user.email,
              full_name: loginData.user.full_name || loginData.user.display_name || email.split('@')[0],
              role: userRole,
              department: loginData.user.department,
              position: loginData.user.position,
              is_super_admin: loginData.user.is_super_admin,
              account_status: loginData.user.account_status,
              // Include the new fields from updated login response (they're in the user object)
              role_id: loginData.user.role_id,
              raw_app_meta_data: loginData.user.raw_app_meta_data,
              raw_user_meta_data: loginData.user.raw_user_meta_data,
            };

            set({
              user,
              token: loginData.session.access_token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            
            // Set Supabase session for compatibility with existing components
            await supabase.auth.setSession({
              access_token: loginData.session.access_token,
              refresh_token: loginData.session.refresh_token
            });
            
            // Load user permissions after successful login
            await get().loadPermissions();
            
            console.log('🔧 DEBUG: Login completed successfully, user authenticated:', {
              userId: user.id,
              email: user.email,
              role: user.role,
              role_id: user.role_id,
              isAuthenticated: true
            });
          } else {
            throw new Error(loginData.error || 'Invalid login response');
          }
        } catch (error: any) {
          console.error('🔧 DEBUG: Login error caught:', error);
          let errorMessage = 'Login failed';
          
          if (error.name === 'AbortError') {
            errorMessage = 'Login timeout - please check your connection and try again';
            console.error('🔧 DEBUG: AbortError (timeout) occurred during login');
          } else if (error.message) {
            errorMessage = error.message;
            console.error('🔧 DEBUG: Error message:', error.message);
          }
          console.error('🔧 DEBUG: Full error object:', error);
          
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await supabase.auth.signOut();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            permissions: [],
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
              // Fetch user profile from our backend using direct fetch
              console.log('🔧 DEBUG: checkAuth fetching profile with token:', session.access_token.substring(0, 20) + '...');
              
              let userProfile: any = {};
              
              try {
                const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  signal: (() => {
                  const controller = new AbortController();
                  setTimeout(() => controller.abort(), 30000);
                  return controller.signal;
                })(),
                });
                
                console.log('🔧 DEBUG: checkAuth response:', { 
                  status: response.status,
                  url: response.url
                });

                if (response.ok) {
                  userProfile = await response.json();
                } else {
                  console.error('checkAuth profile fetch failed:', response.status, response.statusText);
                }
                
              } catch (fetchError: any) {
                console.error('checkAuth profile fetch failed:', fetchError.message);
                if (fetchError.name === 'TimeoutError') {
                  console.error('checkAuth request timed out after 30 seconds');
                }
              }

              // Validate and ensure role is one of the allowed values (same as login)
              const validRoles: UserRole[] = ['admin', 'manager', 'receptionist', 'accountant'];
              let userRole: UserRole = 'receptionist'; // Default fallback
              
              if (userProfile.role && validRoles.includes(userProfile.role as UserRole)) {
                userRole = userProfile.role as UserRole;
              } else if (userProfile.is_super_admin) {
                userRole = 'admin';
              }

              const authUser: User = {
                id: user.id,
                email: user.email!,
                full_name: userProfile.full_name || user.user_metadata?.full_name || user.email!.split('@')[0],
                role: userRole,
                department: userProfile.department,
                position: userProfile.position,
                is_super_admin: userProfile.is_super_admin,
                account_status: userProfile.account_status,
              };

              set({
                user: authUser,
                token: session.access_token,
                isAuthenticated: true,
                isLoading: false,
              });
              
              // Load user permissions after successful auth check
              await get().loadPermissions();
            }
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            permissions: [],
          });
        }
      },

      clearError: () => set({ error: null }),

      // New role-based permission helpers
      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin' || user?.is_super_admin === true;
      },

      isStaff: () => {
        const { user } = get();
        return user?.role ? ['admin', 'manager', 'receptionist', 'accountant'].includes(user.role) : false;
      },

      hasRole: (role: UserRole) => {
        const { user } = get();
        return user?.role === role;
      },

      canAccess: (module: string, action?: string) => {
        const { permissions, user } = get();
        if (!user) return false;

        // Super admin has all permissions
        if (user?.is_super_admin) return true;

        // Build permission string to check
        const permissionToCheck = action ? `${module}.${action}` : `${module}.read`;
        
        // Check if user has the specific permission
        return permissions.includes(permissionToCheck);
      },

      loadPermissions: async () => {
        try {
          const { token } = get();
          if (!token) return;

          // Add cache buster to force fresh permissions using direct fetch
          const cacheBuster = Date.now();
          console.log('🔧 DEBUG: Loading permissions with direct fetch');
          
          try {
            const response = await fetch(`${API_BASE_URL}/auth/permissions?_=${cacheBuster}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
              },
              signal: (() => {
                  const controller = new AbortController();
                  setTimeout(() => controller.abort(), 30000);
                  return controller.signal;
                })(),
            });
            
            console.log('🔧 DEBUG: Permissions response:', { 
              status: response.status, 
              url: response.url 
            });

            if (response.ok) {
              const data = await response.json();
              console.log('🔧 DEBUG: Loaded permissions:', data.effective_permissions);
              set({ permissions: data.effective_permissions || [] });
            } else {
              console.error('Failed to load permissions:', response.status, response.statusText);
            }
            
          } catch (fetchError: any) {
            console.error('Failed to load permissions:', fetchError.message);
            if (fetchError.name === 'TimeoutError') {
              console.error('Permissions request timed out after 30 seconds');
            }
          }
        } catch (error) {
          console.error('Failed to load permissions:', error);
        }
      },

      hasPermission: (permission: string) => {
        const { permissions, user } = get();
        
        // Super admin has all permissions
        if (user?.is_super_admin) {
          console.log(`🔧 DEBUG: Super admin has permission: ${permission}`);
          return true;
        }
        
        // Check if user has the specific permission
        const hasAccess = permissions.includes(permission);
        console.log(`🔧 DEBUG: Checking permission "${permission}":`, hasAccess, 'Available:', permissions);
        return hasAccess;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
      }),
    }
  )
);
