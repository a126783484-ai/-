import { supabase } from '../supabase';
import { Action } from '../types';

export const getAccount: Action = async () => {
  try {
    const { data, error } = await supabase.from('accounts').select('*');
    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const updateAccount: Action = async (id: number, data: any) => {
  try {
    const { error } = await supabase.from('accounts').update({ id, ...data });
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};