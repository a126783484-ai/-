import { useState, useEffect } from 'react';
import { useSupabaseClient } from 'src/lib/supabase';
import { Service } from 'src/lib/types';

const ServicesPage = () => {
  const supabaseClient = useSupabaseClient();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
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

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <div>
      <h1>Services</h1>
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