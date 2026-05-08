import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/apiClient"
import { useEffect } from "react"
import { prefetchImages } from "@/utils/image"
import { productService } from "@/services/productService"
import type { Product, ApiListResponse } from "@/types"

export const useRelatedProducts = (currentProductId: string, categoryId?: string) => {
    const query = useQuery({
        queryKey: ["related-products", currentProductId, categoryId],
        queryFn: async () => {
            if (!currentProductId) return []

            // Backend source-of-truth route:
            // GET /api/products/:id/related -> { items: Product[], total: number }
            try {
                const related = await productService.getRelatedProducts(currentProductId, 6)
                return (related || []).filter((p: Product) => String(p.id) !== String(currentProductId))
            } catch {
                // Fallback to category query if related endpoint is unavailable.
                if (!categoryId) return []
                const response = await apiClient<ApiListResponse<Product>>(`products?category=${categoryId}&limit=6`)
                return (response?.items || []).filter((p: Product) => String(p.id) !== String(currentProductId))
            }
        },
        enabled: !!currentProductId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    useEffect(() => {
        if (!query.data || query.data.length === 0) return
        prefetchImages(
            query.data.map((item: Product) => item.image_url || item.imageUrl),
            6
        )
    }, [query.data])

    return query
}
