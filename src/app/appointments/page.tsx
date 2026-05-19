import { useState, useEffect } from 'react';
import { fetchAppointments, createAppointment } from '../actions';
import { Appointment } from '../types';

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAppointmentsData = async () => {
      setLoading(true);
      try {
        const data = await fetchAppointments();
        setAppointments(data);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointmentsData();
  }, []);

  const handleCreateAppointment = async (appointment: Appointment) => {
    try {
      const data = await createAppointment(appointment);
      setAppointments([...appointments, ...data]);
    } catch (error) {
      setError(error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>Appointments</h1>
      <ul>
        {appointments.map((appointment) => (
          <li key={appointment.id}>{appointment.name}</li>
        ))}
      </ul>
      <button onClick={() => handleCreateAppointment({ name: 'New Appointment' })}>
        Create Appointment
      </button>
    </div>
  );
};

export default AppointmentsPage;