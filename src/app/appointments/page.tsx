import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useToast } from '@chakra-ui/react';
import { useRouter } from 'next/router';

interface Appointment {
  id: number;
  customer_id: number;
  service_id: number;
  date: string;
  time: string;
}

const AppointmentsPage: React.FC = () => {
  const supabaseClient = useSupabaseClient();
  const toast = useToast();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabaseClient
          .from('appointments')
          .select('*');
        if (error) {
          throw error;
        }
        setAppointments(data);
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
    fetchAppointments();
  }, [supabaseClient, toast]);

  const handleDelete = async (id: number) => {
    try {
      await supabaseClient.from('appointments').delete({ id });
      setAppointments(appointments.filter((appointment) => appointment.id !== id));
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
        <h1 className="text-3xl font-bold mb-4">Appointments</h1>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ul>
            {appointments.map((appointment) => (
              <li key={appointment.id}>
                <p>
                  {appointment.customer_id} - {appointment.service_id} -{' '}
                  {appointment.date} - {appointment.time}
                </p>
                <button
                  className="bg-red-500 text-white py-2 px-4 rounded"
                  onClick={() => handleDelete(appointment.id)}
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

export default AppointmentsPage;