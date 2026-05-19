import { Customer } from '../../models/customer';
import { supabase } from '../../../utils/supabase';
import { useState, useEffect } from 'react';

export const getCustomers = async () => {
  try {
    const { data, error } = await supabase.from('customers').select('*');
    if (error) {
      throw error;
    }
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createCustomer = async (customer: Customer) => {
  try {
    const { data, error } = await supabase.from('customers').insert([customer]);
    if (error) {
      throw error;
    }
    return data[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const updateCustomer = async (id: number, customer: Customer) => {
  try {
    const { data, error } = await supabase.from('customers').update([customer]).eq('id', id);
    if (error) {
      throw error;
    }
    return data[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const deleteCustomer = async (id: number) => {
  try {
    const { data, error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      throw error;
    }
    return data[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};