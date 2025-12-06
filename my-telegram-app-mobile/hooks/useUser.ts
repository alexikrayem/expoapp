import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';

export const useProfile = () => {
    return useQuery({
        queryKey: ['profile'],
        queryFn: userService.getProfile,
    });
};

export const useFavorites = () => {
    return useQuery({
        queryKey: ['favorites'],
        queryFn: userService.getFavorites,
    });
};

export const useAddFavorite = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: userService.addFavorite,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
    });
};

export const useRemoveFavorite = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: userService.removeFavorite,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
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
