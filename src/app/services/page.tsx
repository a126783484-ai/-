import type { NextPage } from 'next';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

const ServicesPage: NextPage = () => {
  const [services, setServices] = useState([]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      setServices(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      {/* existing JSX code */}
    </div>
  );
};

export default ServicesPage;