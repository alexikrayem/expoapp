export interface Product {
    id: string;
    name: string;
    description?: string;
    price?: number;
    effective_selling_price: number;
    image_url?: string;
    imageUrl?: string;
    supplier_name?: string;
    supplier_id?: string;
    supplier_location?: string;
    category?: string;
    is_on_sale?: boolean;
    discount_percentage?: number;
    discount_price?: number;
    stock_quantity?: number;
    original_price?: number;
    created_at?: string;
}

export interface UserProfile {
    id?: string | number;
    userId?: string | number;
    username?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    photo_url?: string;
    language_code?: string;
    role?: string;
    phone_number?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    clinic_name?: string;
    clinic_phone?: string;
    clinic_address_line1?: string;
    clinic_address_line2?: string;
    clinic_city?: string;
    selected_city_id?: string;
    selected_city_name?: string;
    professional_role?: string;
    years_of_experience?: string;
    education_background?: string;
    professional_license_number?: string;
}

export interface Supplier {
    id: string;
    name: string;
    image_url?: string;
    imageUrl?: string;
    logo_url?: string;
    logoUrl?: string;
    logo?: string;
    category?: string;
    location?: string;
    city?: string;
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

/** A deal/promotion returned by the /deals endpoint. */
export interface Deal {
    id: string;
    name?: string;
    title?: string;
    description?: string;
    image_url?: string;
    imageUrl?: string;
    discount_percentage?: number;
    discountPercentage?: number;
    discount_price?: number;
    end_date?: string;
    endDate?: string;
    days_remaining?: number;
    daysRemaining?: number;
    [key: string]: unknown;
}

/** An item in the featured carousel. */
export interface FeaturedItem {
    id: string;
    name?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    image_url?: string;
    imageUrl?: string;
    type?: string;
    [key: string]: unknown;
}

/**
 * Wrapper type for paginated/list API responses.
 * Some endpoints return `{ items: T[] }`, others return a bare `T[]`.
 */
export interface ApiListResponse<T> {
    items?: T[];
    total?: number;
}

/** Structured error object produced by the API client. */
export interface ApiError {
    message: string;
    status?: number;
    error?: string;
    details?: { message?: string; msg?: string }[];
    isTimeout?: boolean;
    [key: string]: unknown;
}

/** Data required to create an order from the cart. */
export interface CreateOrderPayload {
    items: {
        product_id: string;
        quantity: number;
        effective_selling_price?: string | number;
        price_at_time_of_order?: string | number;
        name?: string;
    }[];
    shipping_address?: string;
    payment_method?: string;
    total_amount?: number;
    customer_info?: {
        name: string;
        phone: string;
        address1: string;
        address2: string;
        city: string;
    };
    [key: string]: unknown;
}

/** Profile data sent during phone registration. */
export interface RegistrationProfileData {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    professional_role?: string;
    clinic_name?: string;
    city?: string;
    [key: string]: unknown;
}

/** Shape of the response from getFavorites. */
export interface FavoritesResponse {
    favorite_ids: (string | number)[];
}

/** Delivery address data used in checkout and order confirmation. */
export interface AddressData {
    fullName: string;
    phoneNumber: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
}

/** A single item in the shopping cart. */
export interface CartItem {
    product_id: string;
    name: string;
    image_url?: string;
    supplier_name?: string;
    effective_selling_price: number | string;
    quantity: number;
    original_price?: number;
    category?: string;
}

/** A city record from the cityService. */
export interface City {
    id: string;
    name: string;
    name_ar?: string;
}

/** Extended deal with product/supplier details shown in DealDetailModal. */
export interface DealDetail extends Deal {
    product_id?: string;
    product_name?: string;
    product_image_url?: string;
    product_price?: number;
    product?: Product;
    supplier_name?: string;
    supplier_id?: string;
    supplier_location?: string;
    start_date?: string;
    created_at?: string;
}

/** An item shown in the FeaturedListModal. */
export interface FeaturedListItem {
    id: string;
    name?: string;
    title?: string;
    description?: string;
    imageUrl?: string;
    image_url?: string;
    image?: string;
    price?: number;
    type?: string;
    [key: string]: unknown;
}

/** Order details displayed in the OrderConfirmationModal. */
export interface OrderConfirmationDetails {
    orderId: string;
    [key: string]: unknown;
}

/** Profile data payload sent when saving profile edits. */
export interface ProfileFormPayload {
    full_name?: string;
    phone_number?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    clinic_name?: string;
    clinic_phone?: string;
    clinic_address_line1?: string;
    clinic_address_line2?: string;
    clinic_city?: string;
    selected_city_id?: string | null;
    professional_role?: string;
    years_of_experience?: string;
    education_background?: string;
    professional_license_number?: string;
    [key: string]: unknown;
}

/** Filter state used by ProductFilterBar. */
export interface ProductFilters {
    category?: string;
    [key: string]: unknown;
}
