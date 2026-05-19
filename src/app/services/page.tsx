import type { NextPage } from 'next';
import type { Product } from '../lib/types';

const ServicesPage: NextPage = () => {
  // existing code...

  const products = [
    {
      id: 1,
      name: 'Product 1',
      description: 'This is product 1',
      price: 19.99,
    },
    {
      id: 2,
      name: 'Product 2',
      description: 'This is product 2',
      price: 9.99,
    },
  ];

  return (
    // existing code...
    <div>
      {products.map((product) => (
        <div key={product.id}>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <p>Price: ${product.price}</p>
        </div>
      ))}
    </div>
  );
};

export default ServicesPage;