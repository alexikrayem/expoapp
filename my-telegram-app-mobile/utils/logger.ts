
export const logger = {
    // eslint-disable-next-line no-console
    log: (message: string, ...args: unknown[]) => {
        if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log(message, ...args);
        }
    },
    error: (message: string, error: unknown, ...args: unknown[]) => {
        // In production, this would send to Sentry/Crashlytics
        if (__DEV__) {
            console.error(message, error, ...args);
        }
    },
    warn: (message: string, ...args: unknown[]) => {
        if (__DEV__) {
            console.warn(message, ...args);
        }
    },
    info: (message: string, ...args: unknown[]) => {
        if (__DEV__) {
            // eslint-disable-next-line no-console
            console.info(message, ...args);
        }
    }
};
