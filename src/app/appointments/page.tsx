import React, { useState, useEffect } from 'react';
import { getAppointments } from '../actions';
import { Appointment } from '../types';

const AppointmentsPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const data = await getAppointments();
        setAppointments(data);
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

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
    </div>
  );
};

export default AppointmentsPage;