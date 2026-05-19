import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseClient } from '../supabase';
import { AuthRouteError } from './auth-errors';

const authRoutes = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { method } = req;

    switch (method) {
      case 'POST':
        const { email, password } = req.body;
        const { user, session } = await supabaseClient.auth.signIn({
          email,
          password,
        });

        if (!user || !session) {
          throw new AuthRouteError('登入失敗', 401);
        }

        return res.status(200).json({ user, session });
      default:
        throw new AuthRouteError('不支援的請求方法', 405);
    }
  } catch (error) {
    if (error instanceof AuthRouteError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: '伺服器錯誤' });
  }
};

export default authRoutes;