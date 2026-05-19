import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '../lib/supabase';
import { Service } from '../lib/types';

const ServicesPage = () => {
  const { data: session } = useSession();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Services</h1>
      <button onClick={fetchServices}>Fetch Services</button>
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