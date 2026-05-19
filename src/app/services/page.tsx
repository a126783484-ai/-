import { useState, useEffect } from 'react';
import { useSupabaseClient } from 'src/lib/supabase';
import { Service } from 'src/lib/types';

const ServicesPage = () => {
  const supabaseClient = useSupabaseClient();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('services')
        .select('*');
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

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <div>
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