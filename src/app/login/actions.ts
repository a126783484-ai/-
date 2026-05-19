import { supabaseClient } from '../supabase';
import { LoginCredentials } from '../types';

export const login = async (credentials: LoginCredentials) => {
  try {
    const { data, error } = await supabaseClient.auth.signIn(credentials);
    if (error) {
      throw error;
    }
    return data;
  } catch (error: any) {
    throw new Error(`登入失敗: ${error.message}`);
  }
};

export const logout = async () => {
  try {
    await supabaseClient.auth.signOut();
  } catch (error: any) {
    throw new Error(`登出失敗: ${error.message}`);
  }
};
```