import { supabase } from '../supabase';
import { Action } from '../types';

export const getAppointments: Action = async () => {
  try {
    const { data, error } = await supabase.from('appointments').select('*');
    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createAppointment: Action = async (data: any) => {
  try {
    const { error } = await supabase.from('appointments').insert([data]);
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const updateAppointment: Action = async (id: number, data: any) => {
  try {
    const { error } = await supabase.from('appointments').update({ id, ...data });
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const deleteAppointment: Action = async (id: number) => {
  try {
    const { error } = await supabase.from('appointments').delete({ id });
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};