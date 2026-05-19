import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '../lib/supabase';
import { Service } from '../lib/types';

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('is_active', true);
        if (error) {
          console.error(error);
        } else {
          setServices(data);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchServices();
  }, []);

  return (
    <div>
      {/* services list */}
    </div>
  );
};

export default ServicesPage;