import { useState, useEffect } from 'react';
import { login, logout } from '../actions';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleLogin = async () => {
      setLoading(true);
      try {
        const data = await login(email, password);
        // Handle login success
      } catch (error) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };
    handleLogin();
  }, [email, password]);

  const handleLogout = async () => {
    try {
      await logout();
      // Handle logout success
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
      <h1>Login</h1>
      <form>
        <label>
          Email:
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password:
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit" onClick={handleLogin}>
          Login
        </button>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </form>
    </div>
  );
};

export default LoginPage;