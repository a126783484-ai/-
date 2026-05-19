import type { NextPage } from 'next';
import type { Product } from '../lib/types';
import { useSession } from 'next-auth/react';
import { useSupabaseClient } from '../lib/supabase';

const ServicesPage: NextPage = () => {
  const supabaseClient = useSupabaseClient();
  const { data: session } = useSession();

  const products: Product[] = [
    // Add products here
  ];

  return (
    <div>
      {/* Render products here */}
    </div>
  );
};

export default ServicesPage;