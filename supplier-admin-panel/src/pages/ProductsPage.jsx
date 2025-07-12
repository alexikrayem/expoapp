// src/pages/ProductsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; // Or your preferred HTTP client
import { PlusCircle, Edit, Trash2 } from 'lucide-react'; // Icons for actions
import ProductFormModal from '../components/ProductFormModal'; // Adjust path if needed
// Helper function to get the auth token (could be in a separate authService.js)
const getAuthToken = () => localStorage.getItem('supplierToken');

// Axios instance with auth header (could also be in a separate apiService.js)
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_SUPPLIER_API_BASE_URL || 'http://localhost:3001',
});

apiClient.interceptors.request.use(config => {
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});


const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
// Inside ProductsPage component
const [showProductModal, setShowProductModal] = useState(false);
const [editingProduct, setEditingProduct] = useState(null); // null for Add, product object for Edit
const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for save operation
    // TODO: State for Add/Edit Product Modal
    // const [showProductModal, setShowProductModal] = useState(false);
    // const [editingProduct, setEditingProduct] = useState(null); // null for Add, product object for Edit

    const fetchSupplierProducts = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await apiClient.get('/api/supplier/products');
            setProducts(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch products.');
            console.error("Fetch products error:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSupplierProducts();
    }, [fetchSupplierProducts]);

    // Placeholder functions for actions
    const handleAddProduct = () => {
         setEditingProduct(null); // Ensure it's for adding new
    setShowProductModal(true);  
    };

   const handleEditProduct = (product) => {
    console.log("Edit button clicked for product:", product); // <<< ADD THIS LOG
    setEditingProduct(product); // Pass the product to be edited
    setShowProductModal(true);  // Set state to show the modal
};

   const handleDeleteProduct = async (productId, productName) => { // Added productName for better confirm message
    // Use a more descriptive confirmation message
    if (window.confirm(`Are you sure you want to delete the product "${productName}"? This action cannot be undone.`)) {
        try {
            setIsLoading(true); // Optional: set a general loading state or specific deleting state
            await apiClient.delete(`/api/supplier/products/${productId}`);
            // alert('Product deleted successfully!'); // Optional success message
            fetchSupplierProducts(); // Refresh the product list
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete product.');
            console.error("Delete product error:", err.response || err.message);
        } finally {
            setIsLoading(false);
        }
    }
};



    if (isLoading) {
        return <div className="text-center p-10">Loading products...</div>;
    }

    if (error) {
        return <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
        </div>;
    }
// Inside ProductsPage component
const handleSaveProduct = async (productData, productIdToEdit) => {
    setIsSubmitting(true);
    // setError(''); // Clear page-level error, modal handles its own error

    try {
        if (productIdToEdit) {
            // Editing existing product
            await apiClient.put(`/api/supplier/products/${productIdToEdit}`, productData);
            // alert('Product updated successfully!'); // Or a more subtle notification
        } else {
            // Adding new product
            await apiClient.post('/api/supplier/products', productData);
            // alert('Product added successfully!');
        }
        setShowProductModal(false); // Close modal on success
        fetchSupplierProducts();    // Refresh product list
    } catch (err) {
        console.error("Save product error:", err.response || err.message);
        // The modal itself will display the error using its 'setError' passed from onSave
        // We re-throw so the modal's catch block can handle it.
        throw new Error(err.response?.data?.error || 'Failed to save product.');
    } finally {
        setIsSubmitting(false);
    }
};
    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">My Products</h2>
                <button
                    onClick={handleAddProduct}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md flex items-center transition-colors"
                >
                    <PlusCircle size={20} className="mr-2" /> {/* ml-2 for RTL */}
                    Add New Product
                </button>
            </div>

            {products.length === 0 && !isLoading ? (
                <p className="text-gray-600 text-center py-10">You haven't added any products yet.</p>
            ) : (
                <div className="overflow-x-auto bg-white shadow-md rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {products.map((product) => (
                                <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {product.image_url && (
                                                 <div className="flex-shrink-0 h-10 w-10">
                                                    <img 
                                                        className="h-10 w-10 rounded-md object-cover" 
                                                        src={product.image_url.startsWith('linear-gradient') ? 'https://via.placeholder.com/40' : product.image_url} 
                                                        alt={product.name} 
                                                        style={product.image_url.startsWith('linear-gradient') ? { background: product.image_url} : {}}
                                                    />
                                                </div>
                                            )}
                                            <div className={product.image_url ? "ml-4" : ""}> {/* mr-4 for RTL */}
                                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {product.discount_price && product.is_on_sale ? (
                                            <>
                                                <span className="line-through text-gray-400">{parseFloat(product.price).toFixed(2)}</span>
                                                <span className="ml-2 text-green-600 font-semibold">{parseFloat(product.discount_price).toFixed(2)} د.إ</span>
                                            </>
                                        ) : (
                                            `${parseFloat(product.price).toFixed(2)} د.إ`
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock_level}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 space-x-reverse"> {/* space-x-reverse for RTL */}
                                        <button onClick={() => handleEditProduct(product)} className="text-indigo-600 hover:text-indigo-900 transition-colors p-1">
                                            <Edit size={18} />
                                        </button>
                                        <button onClick={() => handleDeleteProduct(product.id, product.name)} className="text-red-600 hover:text-red-900 transition-colors p-1">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TODO: Add/Edit Product Modal will go here */}
            
            {showProductModal && (
            <ProductFormModal
                isOpen={showProductModal}
                onClose={() => {
                    setShowProductModal(false);
                    setEditingProduct(null); // Clear editing state when closing
                }}
                onSave={handleSaveProduct}
                productToEdit={editingProduct}
                isLoading={isSubmitting} // Pass submitting state to modal for its buttons
            />
        )}
        {/* {showProductModal && <ProductFormModal product={editingProduct} onClose={() => setShowProductModal(false)} onSave={fetchSupplierProducts} />} */}
        </div>
    );
};

export default ProductsPage;