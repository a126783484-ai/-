import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '../lib/supabase';

const ServicesPage = () => {
  const { data: session } = useSession();
  const [services, setServices] = useState([]);
  const [error, setError] = useState(null);

  const fetchServices = async () => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('services')
        .select('id, name, description')
        .eq('is_active', true);

      if (supabaseError) {
        setError(supabaseError.message);
      } else {
        setServices(data);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <div>
      <h1>Services</h1>
      <ul>
        {services.map((service) => (
          <li key={service.id}>{service.name}</li>
        ))}
      </ul>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default ServicesPage;