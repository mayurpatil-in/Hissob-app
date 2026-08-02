import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReceipts, createReceipt, updateReceipt, cancelReceipt, deleteReceipt } from '../api/services';

export function useReceipts(params?: { status?: string; payment_mode?: string }) {
  const queryClient = useQueryClient();

  const receiptsQuery = useQuery({
    queryKey: ['receipts', params?.status, params?.payment_mode],
    queryFn: () => getReceipts(params),
  });

  const createMutation = useMutation({
    mutationFn: createReceipt,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receipts'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: any }) => updateReceipt(id, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receipts'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelReceipt(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    },
  });

  return {
    receipts: receiptsQuery.data || [],
    isLoading: receiptsQuery.isLoading,
    isError: receiptsQuery.isError,
    refetch: receiptsQuery.refetch,
    createReceipt: createMutation,
    updateReceipt: updateMutation,
    cancelReceipt: cancelMutation,
    deleteReceipt: deleteMutation,
  };
}
