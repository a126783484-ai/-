import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '../lib/supabase';

const ServicesPage = () => {
  const { data: session } = useSession();
  const [services, setServices] = useState([]);

  useEffect(() => {
    if (session) {
      const fetchServices = async () => {
        try {
          const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('user_id', session.user.id);
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
    }
  }, [session]);

  return (
    <div>
      {/* services list */}
    </div>
  );
};

export default ServicesPage;