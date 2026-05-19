import { useState, useEffect } from 'react';
import { useSupabaseClient } from 'src/lib/supabase';
import { Service } from 'src/lib/types';
import { useDeferredViews } from 'src/components/DeferredViews';

const ServicesPage = () => {
  const supabaseClient = useSupabaseClient();
  const [services, setServices] = useState<Service[]>([]);
  const { DeferredView } = useDeferredViews();

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabaseClient
        .from('services')
        .select('*');
      if (error) {
        console.error(error);
      } else {
        setServices(data);
      }
    };
    fetchServices();
  }, [supabaseClient]);

  return (
    <DeferredView>
      {services.map((service) => (
        <div key={service.id}>{service.name}</div>
      ))}
    </DeferredView>
  );
};

export default ServicesPage;