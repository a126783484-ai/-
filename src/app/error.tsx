import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@chakra-ui/react';

interface ErrorProps {
  error: any;
}

const ErrorPage: React.FC<ErrorProps> = ({ error }) => {
  const supabaseClient = useSupabaseClient();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [error, toast]);

  const handleError = async () => {
    try {
      setLoading(true);
      await supabaseClient.from('errors').insert([{ message: error.message }]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Error</h1>
        <p className="text-lg mb-4">{error.message}</p>
        {loading ? (
          <button className="bg-gray-300 text-gray-600 py-2 px-4 rounded" disabled>
            Reporting...
          </button>
        ) : (
          <button
            className="bg-red-500 text-white py-2 px-4 rounded"
            onClick={handleError}
          >
            Report Error
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorPage;