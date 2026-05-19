import { supabase } from '../supabase';

export const login = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signIn({ email, password });
    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error(error);
    throw error;
  }
};