import { Service } from '../../models/service';
import { supabase } from '../../../utils/supabase';
import { useState, useEffect } from 'react';

export const getServices = async () => {
  try {
    const { data, error } = await supabase.from('services').select('*');
    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createService = async (service: Service) => {
  try {
    const { data, error } = await supabase.from('services').insert([service]);
    if (error) {
      throw error;
    }
    return data[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const updateService = async (id: number, service: Service) => {
  try {
    const { data, error } = await supabase.from('services').update([service]).eq('id', id);
    if (error) {
      throw error;
    }
    return data[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const deleteService = async (id: number) => {
  try {
    const { data, error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      throw error;
    }
    return data[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};