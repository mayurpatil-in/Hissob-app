import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettlements, submitSettlement, verifySettlement } from '../api/services';

export function useSettlements(params?: { status?: string }) {
  const queryClient = useQueryClient();

  const settlementsQuery = useQuery({
    queryKey: ['settlements', params?.status],
    queryFn: () => getSettlements(params),
  });

  const submitMutation = useMutation({
    mutationFn: submitSettlement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, action, rejection_reason }: { id: string; action: string; rejection_reason?: string }) =>
      verifySettlement(id, action, rejection_reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    },
  });

  return {
    settlements: settlementsQuery.data || [],
    isLoading: settlementsQuery.isLoading,
    submitSettlement: submitMutation,
    verifySettlement: verifyMutation,
  };
}
