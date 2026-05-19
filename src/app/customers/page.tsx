import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@chakra-ui/react';
import { useRouter } from 'next/router';

interface Customer {
  id: number;
  name: string;
  email: string;
}

const CustomersPage: React.FC = () => {
  const supabaseClient = useSupabaseClient();
  const toast = useToast();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabaseClient
          .from('customers')
          .select('*');
        if (error) {
          throw error;
        }
        setCustomers(data);
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
    fetchCustomers();
  }, [supabaseClient, toast]);

  const handleDelete = async (id: number) => {
    try {
      await supabaseClient.from('customers').delete({ id });
      setCustomers(customers.filter((customer) => customer.id !== id));
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
        <h1 className="text-3xl font-bold mb-4">Customers</h1>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ul>
            {customers.map((customer) => (
              <li key={customer.id}>
                <p>
                  {customer.name} - {customer.email}
                </p>
                <button
                  className="bg-red-500 text-white py-2 px-4 rounded"
                  onClick={() => handleDelete(customer.id)}
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

export default CustomersPage;