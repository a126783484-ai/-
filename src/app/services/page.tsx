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
        .eq('owner_id', session.user.id);
      if (error) {
        console.error(error);
      } else {
        setServices(data);
      }
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