import { useState } from 'react';
import { useSupabaseClient } from 'src/lib/supabase';
import { Service } from 'src/lib/types';
import { Button } from 'src/components';

const ServicesPage = () => {
  const supabaseClient = useSupabaseClient();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAddService = async () => {
    // Add a new service
  };

  const handleLoadServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabaseClient.from('services').select('*');
      if (error) {
        console.error(error);
      } else {
        setServices(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleLoadServices();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {services.length === 0 && (
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <h2 className="text-lg font-bold mb-2">No services added yet</h2>
          <p className="text-gray-600 mb-4">
            Click the button below to add a new service.
          </p>
          <Button onClick={handleAddService} className="bg-blue-500 hover:bg-blue-700">
            Add Service
          </Button>
        </div>
      )}
      {services.length > 0 && (
        <div className="flex flex-col items-center justify-center p-4">
          <h2 className="text-lg font-bold mb-2">Services</h2>
          <ul className="list-none p-0 m-0">
            {services.map((service) => (
              <li key={service.id} className="mb-4">
                <p className="text-gray-600">{service.name}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;