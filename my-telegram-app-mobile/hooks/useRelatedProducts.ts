import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/apiClient"

export const useRelatedProducts = (currentProductId: string, categoryId?: string) => {
    return useQuery({
        queryKey: ["related-products", currentProductId, categoryId],
        queryFn: async () => {
            // If we don't have a category, we can't really fetch "related" by category.
            // In a real app, the backend might handle "related" logic by product ID alone.
            // For now, mirroring web logic: fetch same category, exclude current.
            if (!categoryId) return []

            const response = await apiClient(`products?category=${categoryId}&limit=6`)

            // Filter out current product if returned
            return (response?.products || []).filter((p: any) => p.id !== currentProductId)
        },
        enabled: !!currentProductId && !!categoryId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}
