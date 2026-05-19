import { useSession } from '@supabase/auth-helpers-nextjs';
import { NextPage } from 'next';
import { useQuery } from 'react-query';
import { supabaseClient } from 'src/lib/supabase';
import { Service } from 'src/lib/types';

const ServicesPage: NextPage = () => {
  const { data: session } = useSession();
  const { data: services } = useQuery('services', async () => {
    const { data } = await supabaseClient.from('services').select('*');
    return data;
  });

  return (
    <div>
      <h1>Services</h1>
      <ul>
        {services?.map((service) => (
          <li key={service.id}>{service.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default ServicesPage;