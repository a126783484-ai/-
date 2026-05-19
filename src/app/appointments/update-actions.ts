import { supabase } from '../supabase';
import { Action } from '../types';

export const updateAppointmentStatus: Action = async (id: number, status: string) => {
  try {
    const { error } = await supabase.from('appointments').update({ id, status });
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const updateAppointmentDate: Action = async (id: number, date: string) => {
  try {
    const { error } = await supabase.from('appointments').update({ id, date });
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};