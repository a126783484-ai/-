import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '../lib/supabase';
import { Service } from '../lib/types';

const ServicesPage: NextPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
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
      fetchServices();
    }
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