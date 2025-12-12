
export const logger = {
    log: (message: string, ...args: any[]) => {
        if (__DEV__) {
            console.log(message, ...args);
        }
    },
    error: (message: string, error: any, ...args: any[]) => {
        // In production, this would send to Sentry/Crashlytics
        if (__DEV__) {
            console.error(message, error, ...args);
        }
    },
    warn: (message: string, ...args: any[]) => {
        if (__DEV__) {
            console.warn(message, ...args);
        }
    },
    info: (message: string, ...args: any[]) => {
        if (__DEV__) {
            console.info(message, ...args);
        }
    }
};
