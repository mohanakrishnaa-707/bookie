import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'teacher';
  department: 'computer_science' | 'electrical' | 'mechanical' | 'civil' | 'electronics' | 'information_technology' | 'biotechnology' | 'chemical' | 'automobile_engineering' | 'civil_engineering' | 'mechanical_engineering' | 'electrical_and_electronics_engineering' | 'electronics_and_communication_engineering' | 'vlsi' | 'advanced_communication_technology' | 'artificial_intelligence_and_data_science' | 'computer_science_and_engineering' | 'artificial_intelligence_and_machine_learning' | 'cse_cybersecurity' | 'computer_application_mca' | 'science_and_humanities' | 'me_applied_electronics' | 'me_cad_cam' | 'me_computer_science_and_engineer' | 'me_communication_systems' | 'me_structural_engineer';
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, role: string, department: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  fetchProfile: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ error: any }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Fetch profile after successful login
        setTimeout(() => {
          get().fetchProfile();
        }, 100);
      }
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  },

  signUp: async (email: string, password: string, fullName: string, role: string, department: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            role: role,
            department: department,
          }
        }
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null, profile: null });
      window.location.href = '/auth';
    } catch (error: any) {
      console.error('Sign out error:', error);
    }
  },

  fetchProfile: async () => {
    try {
      const user = get().user;
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      set({ profile });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    try {
      const user = get().user;
      if (!user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      set({ profile: data });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  },

  changePassword: async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  },
}));

// Initialize auth state
supabase.auth.onAuthStateChange((event, session) => {
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
    loading: false,
  });

  if (event === 'SIGNED_IN' && session?.user) {
    setTimeout(() => {
      useAuthStore.getState().fetchProfile();
    }, 0);
  }
});

// Check for existing session
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.setState({
    session,
    user: session?.user ?? null,
    loading: false,
  });

  if (session?.user) {
    setTimeout(() => {
      useAuthStore.getState().fetchProfile();
    }, 0);
  }
});