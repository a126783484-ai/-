import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '../lib/supabase';
import type { Session } from '../lib/types';

const ServicesPage = () => {
  const { data: session } = useSession();
  const [services, setServices] = useState([]);
  const [error, setError] = useState(null);

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true);
      if (error) {
        setError(error.message);
      } else {
        setServices(data);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  useEffect(() => {
    if (session) {
      fetchServices();
    }
  }, [session]);

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