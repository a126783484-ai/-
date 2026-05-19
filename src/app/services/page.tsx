import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Service } from '../lib/types';

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          setError(error.message);
        } else {
          setServices(data);
        }
      } catch (error) {
        setError(error.message);
      }
    };
    fetchServices();
  }, []);

  return (
    <div>
      <h1>Services</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <ul>
        {services.map((service) => (
          <li key={service.id}>{service.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default ServicesPage;