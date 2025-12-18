import { supabase } from './supabaseClient';
import type { Database } from '@/lib/database.types';

export interface AuthUser {
  id: string;
  email: string;
  role: 'ops' | 'admin' | 'viewer';
}

type UserRow = Database['public']['Tables']['users']['Row'];

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  console.log('[AUDIT] Auth: Sign in attempt for:', email);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('[AUDIT] Auth: Sign in FAILED for:', email, '- Error:', error.message);
    throw error;
  }

  console.log('[AUDIT] Auth: Sign in SUCCESS for:', email, '- User ID:', data.user?.id);
  return data;
}

/**
 * Sign out current user
 */
export async function signOut() {
  const session = await getSession();
  const userId = session?.user?.id;
  
  console.log('[AUDIT] Auth: Sign out initiated for user:', userId);
  
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[AUDIT] Auth: Sign out FAILED -', error.message);
    throw error;
  }
  
  console.log('[AUDIT] Auth: Sign out SUCCESS - Session destroyed');
}

/**
 * Get current session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
}

/**
 * Get current user with role from users table
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data?.user) {
    console.log('[AUDIT] Auth: No active session found');
    return null;
  }

  const user = data.user;
  console.log('[AUDIT] Auth: Fetching user profile for:', user.email);

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('id', user.id)
    .single<UserRow>();

  if (userError) {
    console.error('[AUDIT] Auth: Failed to fetch user data -', userError.message);
    console.error('Error fetching user:', userError);
    return null;
  }

  if (!userData) {
    console.log('[AUDIT] Auth: User profile not found');
    return null;
  }

  console.log('[AUDIT] Auth: Current user -', userData.email, '- Role:', userData.role);
  return {
    id: userData.id,
    email: userData.email,
    role: userData.role,
  };
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

/**
 * Check if user has specific role
 */
export async function hasRole(role: 'ops' | 'admin' | 'viewer'): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.role === role;
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole('admin');
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      const user = await getCurrentUser();
      callback(user);
    } else {
      callback(null);
    }
  });
}

