export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    effective_selling_price: number;
    image_url?: string;
    supplier_name?: string;
    supplier_id?: string;
    supplier_location?: string;
    category?: string;
    is_on_sale?: boolean;
    discount_percentage?: number;
    discount_price?: number;
    stock_quantity?: number;
    created_at?: string;
}

export interface UserProfile {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    photo_url?: string;
    language_code?: string;
    role?: string;
    phone_number?: string;
    selected_city_id?: string;
}

export interface Supplier {
    id: string;
    name: string;
    image_url?: string;
    category?: string;
    location?: string;
    rating?: number;
    description?: string;
    products?: Product[];
}

export interface OrderItem {
    product_id: string;
    product_name: string;
    quantity: number;
    price_at_time_of_order: number;
    image_url?: string;
    supplier_name?: string;
}

export interface Order {
    id: string;
    order_id?: string; // Handles backend legacy naming if any
    _id?: string;      // MongoDB id fallback
    user_id: number;
    total_amount: number | string;
    status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
    order_date: string;
    items: OrderItem[];
    shipping_address?: string;
    payment_method?: string;
}
