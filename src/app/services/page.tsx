import { useState } from 'react';
import { Service } from '../lib/types';

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);

  const fetchServices = async () => {
    try {
      const response = await supabase.from('services').select('*');
      setServices(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h1>Services</h1>
      <button onClick={fetchServices}>Fetch Services</button>
      <ul>
        {services.map((service) => (
          <li key={service.id}>{service.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default ServicesPage;