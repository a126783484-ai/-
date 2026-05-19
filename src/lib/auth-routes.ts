import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../supabase';
import { AuthRoutesError } from './auth-routes-error';

const login = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { email, password } = req.body;
    const { user, session } = await supabase.auth.signIn({ email, password });
    if (user && session) {
      return res.status(200).json({ user, session });
    } else {
      throw new AuthRoutesError('登入失敗');
    }
  } catch (error) {
    if (error instanceof AuthRoutesError) {
      return res.status(401).json({ error: error.message });
    } else {
      return res.status(500).json({ error: '伺服器錯誤' });
    }
  }
};

const logout = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    await supabase.auth.signOut();
    return res.status(200).json({ message: '登出成功' });
  } catch (error) {
    return res.status(500).json({ error: '伺服器錯誤' });
  }
};

export { login, logout };