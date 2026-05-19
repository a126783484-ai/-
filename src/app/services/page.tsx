import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Service } from '../lib/types';

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('id', { ascending: true });
        if (error) {
          console.error(error);
        } else {
          setServices(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  return (
    <div>
      <h1>Services</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        services.map((service) => (
          <div key={service.id}>{service.name}</div>
        ))
      )}
    </div>
  );
};

export default ServicesPage;