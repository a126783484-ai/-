import { useState, useEffect } from 'react';
import { useSupabaseClient } from 'src/lib/supabase';
import { Service } from 'src/lib/types';
import { useUser } from 'src/lib/auth';
import { useDebounce } from 'src/lib/hooks';
import { Button } from 'src/components/Button';
import { EmptyState } from 'src/components/EmptyState';

const ServicesPage = () => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select()
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        console.error(error);
      } else {
        setServices(data);
      }
    };

    fetchServices();
  }, [user.id, debouncedSearchQuery]);

  const handleAddService = () => {
    // Navigate to the add service page
    router.push('/services/add');
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Services</h1>
      <div className="flex justify-between mb-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services..."
          className="w-full p-2 pl-10 text-sm text-gray-700 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <Button onClick={handleAddService}>Add Service</Button>
      </div>
      {services.length === 0 && (
        <EmptyState
          title="No services added yet"
          description="Add your first service to get started!"
          ctaLabel="Add Service"
          ctaOnClick={handleAddService}
        />
      )}
      {services.map((service) => (
        <div key={service.id} className="bg-white p-4 mb-4 rounded-lg shadow-md">
          <h2 className="text-lg font-bold mb-2">{service.name}</h2>
          <p className="text-sm text-gray-700">{service.description}</p>
        </div>
      ))}
    </div>
  );
};

export default ServicesPage;