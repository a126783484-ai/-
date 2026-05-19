import { supabase } from '../supabase';
import { Action } from '../types';

export const getItems: Action = async () => {
  try {
    const { data, error } = await supabase.from('items').select('*');
    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createItem: Action = async (data: any) => {
  try {
    const { error } = await supabase.from('items').insert([data]);
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const updateItem: Action = async (id: number, data: any) => {
  try {
    const { error } = await supabase.from('items').update({ id, ...data });
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const deleteItem: Action = async (id: number) => {
  try {
    const { error } = await supabase.from('items').delete({ id });
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};