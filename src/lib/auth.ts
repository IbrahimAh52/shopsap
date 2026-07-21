import { supabase, isSupabaseConfigured } from './db';

export interface UserSession {
  email: string;
  name: string;
}

const MOCK_USERS_KEY = 'shopsnap_mock_users';
const ACTIVE_USER_KEY = 'shopsnap_active_user';

export const auth = {
  isSupabase: isSupabaseConfigured,

  async getCurrentUser(): Promise<UserSession | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (user) {
          return {
            email: user.email || '',
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Advisor'
          };
        }
      } catch (err) {
        console.warn('Supabase auth failed, checking mock session:', err);
      }
    }
    
    // LocalStorage fallback
    if (typeof window !== 'undefined') {
      const active = localStorage.getItem(ACTIVE_USER_KEY);
      if (active) {
        try {
          return JSON.parse(active);
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  async login(email: string, password: string): Promise<UserSession> {
    const cleanEmail = email.trim().toLowerCase();
    
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      if (error) throw error;
      if (data.user) {
        return {
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Advisor'
        };
      }
      throw new Error('Sign in failed: No user returned');
    }

    // Mock login
    if (typeof window !== 'undefined') {
      const usersStr = localStorage.getItem(MOCK_USERS_KEY);
      const users = usersStr ? JSON.parse(usersStr) : [];
      const user = users.find((u: any) => u.email === cleanEmail && u.password === password);
      
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      const session = { email: user.email, name: user.name };
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(session));
      return session;
    }
    
    throw new Error('Client-side environment not found');
  },

  async signUp(email: string, password: string, name: string): Promise<UserSession> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name: cleanName }
        }
      });
      if (error) throw error;
      if (data.user) {
        return {
          email: data.user.email || '',
          name: cleanName
        };
      }
      throw new Error('Sign up failed');
    }

    // Mock sign up
    if (typeof window !== 'undefined') {
      const usersStr = localStorage.getItem(MOCK_USERS_KEY);
      const users = usersStr ? JSON.parse(usersStr) : [];
      
      if (users.some((u: any) => u.email === cleanEmail)) {
        throw new Error('Account with this email already exists');
      }

      const newUser = { email: cleanEmail, password, name: cleanName };
      users.push(newUser);
      localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));

      // Auto log in after signup
      const session = { email: cleanEmail, name: cleanName };
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(session));
      return session;
    }
    
    throw new Error('Client-side environment not found');
  },

  async logout(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out error:', err);
      }
    }
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  }
};
