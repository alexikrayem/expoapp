import Constants from "expo-constants"
import { Platform } from "react-native"

const DEFAULT_API_PORT = 3001
const DEFAULT_API_PATH = "/api"

const normalizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, "")

const getDevHost = () => {
    const hostUri =
        Constants.expoConfig?.hostUri ??
        (Constants as any).manifest2?.hostUri ??
        (Constants as any).manifest?.hostUri

    if (!hostUri) return null

    const normalized = hostUri.replace(/^https?:\/\//, "")
    const hostPort = normalized.split("/")[0]
    const host = hostPort.split(":")[0]
    return host || null
}

const replaceLocalhost = (baseUrl: string, host: string) => {
    return baseUrl
        .replace("://localhost", `://${host}`)
        .replace("://127.0.0.1", `://${host}`)
        .replace("://[::1]", `://${host}`)
}

const resolveBaseUrl = () => {
    const envBase = process.env.EXPO_PUBLIC_API_BASE_URL
    const shouldInferHost = (__DEV__ && Platform.OS !== "web")
    const inferredHost = shouldInferHost ? getDevHost() : null

    if (envBase) {
        const normalized = normalizeBaseUrl(envBase)
        if (inferredHost && /localhost|127\.0\.0\.1|\[::1\]/.test(normalized)) {
            return normalizeBaseUrl(replaceLocalhost(normalized, inferredHost))
        }
        return normalized
    }

    if (inferredHost) {
        return `http://${inferredHost}:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`
    }

    return `http://localhost:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`
}

export const API_CONFIG = {
    BASE_URL: resolveBaseUrl(),
    TIMEOUT: 30000,
    MAX_RETRIES: 3,
}

export const PAGINATION = {
    PRODUCTS_PER_PAGE: 10,
    SEARCH_LIMIT: 10,
};

export const SERVICEABLE_CITIES = [
    'Dubai',
    'Abu Dhabi',
    'Sharjah',
    'Ajman',
    'Umm Al-Quwain',
    'Ras Al-Khaimah',
    'Fujairah'
];

export const ORDER_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
};

export const ORDER_STATUS_LABELS = {
    [ORDER_STATUS.PENDING]: 'قيد الانتظار',
    [ORDER_STATUS.CONFIRMED]: 'مؤكد',
    [ORDER_STATUS.SHIPPED]: 'تم الشحن',
    [ORDER_STATUS.DELIVERED]: 'تم التوصيل',
    [ORDER_STATUS.CANCELLED]: 'ملغى',
};

export const CURRENCY = {
    SYMBOL: 'د.إ',
    CODE: 'AED',
};
