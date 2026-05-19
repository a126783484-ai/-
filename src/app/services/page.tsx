import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '../lib/supabase';
import { Service } from '../lib/types';

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const { data: session } = useSession();

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('created_by', session.user.id);
      if (error) {
        throw error;
      }
      setServices(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [session]);

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