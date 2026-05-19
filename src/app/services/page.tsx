import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Service } from '../lib/types';

const ServicesPage = () => {
  const { data: session } = useSession();
  const [services, setServices] = useState<Service[]>([]);
  const { data, error, isLoading } = useQuery(
    ['services'],
    async () => {
      const { data } = await supabase.from('services').select('*');
      return data;
    },
    {
      enabled: !!session,
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

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