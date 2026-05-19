import { useState, useEffect } from 'react';

const ErrorPage = () => {
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = async () => {
      try {
        // Simulate an error
        throw new Error('Something went wrong');
      } catch (error) {
        setError(error);
      }
    };
    handleError();
  }, []);

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return <div>Loading...</div>;
};

export default ErrorPage;