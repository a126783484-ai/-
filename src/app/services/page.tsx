import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Service } from '@/lib/types';

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          setError(error.message);
        } else {
          setServices(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

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
          </div>
        ))
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default ServicesPage;