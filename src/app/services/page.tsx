import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Service } from '../lib/types';

const ServicesPage = () => {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('created_at', { ascending: false });
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
    fetchServices();
  }, []);

  const handleServiceClick = (serviceId: string) => {
    router.push(`/services/${serviceId}`);
  };

  return (
    <div>
      <h1>Services</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        services.map((service) => (
          <div key={service.id}>
            <h2>{service.name}</h2>
            <p>{service.description}</p>
            <button onClick={() => handleServiceClick(service.id)}>
              View Service
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default ServicesPage;