import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '../lib/supabase';

const ServicesPage = () => {
  const { data: session } = useSession();
  const [services, setServices] = useState([]);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, description')
        .order('id', { ascending: true });

      if (error) {
        console.error(error);
      } else {
        setServices(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

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