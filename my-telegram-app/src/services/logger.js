/**
 * Centralized logger service for the application.
 * In development, it logs to the console with structured formatting.
 * In production, this can be easily extended to send logs to an external service like Sentry or Datadog.
 */

const IS_PRODUCTION = import.meta.env.PROD;

const formatMessage = (level, context, message) => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}]${context ? ` [${context}]` : ''}: ${message}`;
};

export const logger = {
    info: (message, context = '', data = null) => {
        const formatted = formatMessage('info', context, message);
        if (!IS_PRODUCTION) {
            if (data) console.info(formatted, data);
            else console.info(formatted);
        }
    },

    warn: (message, context = '', data = null) => {
        const formatted = formatMessage('warn', context, message);
        if (!IS_PRODUCTION) {
            if (data) console.warn(formatted, data);
            else console.warn(formatted);
        }
        // In production, we might want to track warnings in an analytics service
    },

    error: (message, context = '', error = null) => {
        const formatted = formatMessage('error', context, message);

        // Always log errors to console in non-production
        if (!IS_PRODUCTION) {
            if (error) console.error(formatted, error);
            else console.error(formatted);
        }

        // This is the place to send errors to Sentry/external monitoring
        if (IS_PRODUCTION) {
            // example: Sentry.captureException(error, { extra: { context, message } });
        }
    },

    debug: (message, context = '', data = null) => {
        if (!IS_PRODUCTION) {
            const formatted = formatMessage('debug', context, message);
            if (data) console.debug(formatted, data);
            else console.debug(formatted);
        }
    }
};

export default logger;
