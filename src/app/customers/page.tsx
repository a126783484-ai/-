import { useState, useEffect } from 'react';
import { useSupabaseClient } from 'src/lib/supabase';
import { Customer } from 'src/lib/types';
import { DeferredViews } from 'src/components/DeferredViews';

const CustomersPage = () => {
  const supabaseClient = useSupabaseClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data, error } = await supabaseClient
        .from('customers')
        .select('*');
      if (data) {
        setCustomers(data);
      }
    };
    fetchCustomers();
  }, [supabaseClient]);

  useEffect(() => {
    const filtered = customers.filter((customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [customers, searchTerm]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Customers</h1>
      <input
        type="search"
        placeholder="Search customers"
        value={searchTerm}
        onChange={handleSearch}
        className="w-full p-2 mb-4 border border-gray-300 rounded"
      />
      {filteredCustomers.length === 0 ? (
        <DeferredViews.EmptyState message="No customers found" />
      ) : (
        <ul>
          {filteredCustomers.map((customer) => (
            <li key={customer.id} className="py-2 border-b border-gray-300">
              {customer.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomersPage;