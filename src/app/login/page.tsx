import React, { useState } from 'react';
import { login } from './actions';
import { LoginCredentials } from '../types';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const credentials: LoginCredentials = { email, password };
      await login(credentials);
      // 登入成功，導向下一頁
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>登入</h1>
      <form onSubmit={handleSubmit}>
        <label>
          電子郵件：
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <br />
        <label>
          密碼：
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <br />
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <button type="submit" disabled={isLoading}>
          {isLoading ? '登入中...' : '登入'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
```