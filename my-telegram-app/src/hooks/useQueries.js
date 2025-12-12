import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/productService';
import { cityService } from '../services/cityService';

export const useProductDetails = (productId) => {
    return useQuery({
        queryKey: ['product', productId],
        queryFn: () => productService.getProductDetailsWithAlternatives(productId),
        enabled: !!productId,
    });
};

export const useRelatedProducts = (masterProductId, currentProductId) => {
    return useQuery({
        queryKey: ['related-products', masterProductId],
        queryFn: () => productService.getRelatedProducts(masterProductId, currentProductId),
        enabled: !!masterProductId,
    });
};

export const useSupplierDetails = (supplierId) => {
    return useQuery({
        queryKey: ['supplier', supplierId],
        queryFn: () => cityService.getSupplierDetails(supplierId),
        enabled: !!supplierId,
    });
};
