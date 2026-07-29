import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDonors, createDonor, updateDonor } from '../api/services';

export function useDonors() {
  const queryClient = useQueryClient();

  const donorsQuery = useQuery({
    queryKey: ['donors'],
    queryFn: () => getDonors(),
  });

  const createMutation = useMutation({
    mutationFn: createDonor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donors'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateDonor({ id, data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donors'] }),
  });

  return {
    donors: donorsQuery.data || [],
    isLoading: donorsQuery.isLoading,
    createDonor: createMutation,
    updateDonor: updateMutation,
  };
}
