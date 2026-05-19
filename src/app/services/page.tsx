import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@chakra-ui/react';
import { useRouter } from 'next/router';

interface Service {
  id: number;
  name: string;
  price: number;
}

const ServicesPage: React.FC = () => {
  const supabaseClient = useSupabaseClient();
  const toast = useToast();
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabaseClient
          .from('services')
          .select('*');
        if (error) {
          throw error;
        }
        setServices(data);
      } catch (error) {
        console.error(error);
        toast({
          title: 'Error',
          description: error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, [supabaseClient, toast]);

  const handleDelete = async (id: number) => {
    try {
      await supabaseClient.from('services').delete({ id });
      setServices(services.filter((service) => service.id !== id));
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Services</h1>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ul>
            {services.map((service) => (
              <li key={service.id}>
                <p>
                  {service.name} - {service.price}
                </p>
                <button
                  className="bg-red-500 text-white py-2 px-4 rounded"
                  onClick={() => handleDelete(service.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ServicesPage;