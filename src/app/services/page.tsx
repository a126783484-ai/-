import { useState, useEffect } from 'react';
import { useSupabaseClient } from 'src/lib/supabase';
import { Service } from 'src/lib/types';

const ServicesPage = () => {
  const supabaseClient = useSupabaseClient();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabaseClient
        .from('services')
        .select('*');
      if (error) {
        console.error(error);
      } else {
        setServices(data);
      }
      setLoading(false);
    };
    fetchServices();
  }, [supabaseClient]);

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {services.map((service) => (
            <li key={service.id}>{service.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ServicesPage;