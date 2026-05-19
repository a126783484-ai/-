import { useState, useEffect } from 'react';
import { supabaseClient } from 'src/lib/supabase';
import { Service } from 'src/lib/types';

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabaseClient.from('services').select('*');
      if (error) {
        console.error(error);
      } else {
        setServices(data);
      }
      setLoading(false);
    };
    fetchServices();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Services</h1>
      <ul>
        {services.map((service) => (
          <li key={service.id}>{service.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default ServicesPage;