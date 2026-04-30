import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';

export const useProfile = (isAuthenticated: boolean = false) => {
    return useQuery({
        queryKey: ['profile'],
        queryFn: userService.getProfile,
        enabled: isAuthenticated,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
};

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: userService.updateProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
    });
};
