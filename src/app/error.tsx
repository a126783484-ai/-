import { ErrorBoundary } from 'react-error-boundary';
import { useRouteError } from 'react-router-dom';
import { supabaseClient } from 'src/lib/supabase';

const ErrorPage = () => {
  const error = useRouteError();
  console.error(error);

  // Log error to Supabase
  supabaseClient
    .from('errors')
    .insert([{ message: error.message, stack: error.stack }])
    .then(() => console.log('Error logged to Supabase'))
    .catch((error) => console.error('Error logging to Supabase:', error));

  return (
    <div>
      <h1>Oh no!</h1>
      <p>Something went wrong.</p>
      <p>{error.message}</p>
    </div>
  );
};

export default ErrorPage;