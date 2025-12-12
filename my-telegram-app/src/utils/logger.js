
const IS_DEV = import.meta.env.DEV;

export const logger = {
    log: (message, ...args) => {
        if (IS_DEV) {
            console.log(message, ...args);
        }
    },
    error: (message, error, ...args) => {
        // Placeholder for future Sentry integration
        if (IS_DEV) {
            console.error(message, error, ...args);
        }
    },
    warn: (message, ...args) => {
        if (IS_DEV) {
            console.warn(message, ...args);
        }
    },
    info: (message, ...args) => {
        if (IS_DEV) {
            console.info(message, ...args);
        }
    }
};
