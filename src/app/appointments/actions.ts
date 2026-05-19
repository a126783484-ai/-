import { supabase } from '../supabase';
import { Appointment } from '../types';

export const fetchAppointments = async () => {
  try {
    const { data, error } = await supabase.from('appointments').select('*');
    if (error) {
      throw error;
    }
    return data as Appointment[];
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const createAppointment = async (appointment: Appointment) => {
  try {
    const { data, error } = await supabase.from('appointments').insert([appointment]);
    if (error) {
      throw error;
    }
    return data as Appointment[];
  } catch (error) {
    console.error(error);
    throw error;
  }
};