import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Service } from '../lib/types';

const ServicesPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { data, isLoading, error } = useQuery(
    ['services', session?.user?.id],
    async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, description')
        .eq('owner_id', session?.user?.id);
      if (error) {
        throw error;
      }
      return data;
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Services</h1>
      <ul>
        {data.map((service: Service) => (
          <li key={service.id}>
            <a href={`/services/${service.id}`}>{service.name}</a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ServicesPage;