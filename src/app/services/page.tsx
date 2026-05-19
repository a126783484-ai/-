import type { NextPage } from 'next';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '../lib/supabase';
import { Service } from '../lib/types';

const ServicesPage: NextPage = () => {
  const { data: session } = useSession();
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true);

      if (supabaseError) {
        setError(supabaseError.message);
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