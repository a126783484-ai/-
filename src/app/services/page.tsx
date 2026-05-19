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
        throw error;
      }
      setServices(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* existing JSX code */}
    </div>
  );
};

export default ServicesPage;