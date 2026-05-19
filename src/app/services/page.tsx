import type { NextPage } from 'next';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

const ServicesPage: NextPage = () => {
  const [services, setServices] = useState([]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, description');
      if (error) throw error;
      setServices(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h1>Services</h1>
      <button onClick={fetchServices}>Fetch Services</button>
      <ul>
        {services.map((service) => (
          <li key={service.id}>{service.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default ServicesPage;