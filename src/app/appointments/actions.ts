import { Appointment } from '../../models/appointment';
import { supabase } from '../../../utils/supabase';
import { useState, useEffect } from 'react';

export const getAppointments = async () => {
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

export const createAppointment = async (appointment: Appointment) => {
  try {
    const { data, error } = await supabase.from('appointments').insert([appointment]);
    if (error) {
      throw error;
    }
    return data[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const updateAppointment = async (id: number, appointment: Appointment) => {
  try {
    const { data, error } = await supabase.from('appointments').update([appointment]).eq('id', id);
    if (error) {
      throw error;
    }
    return data[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const deleteAppointment = async (id: number) => {
  try {
    const { data, error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) {
      throw error;
    }
    return data[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};