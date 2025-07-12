// telegram-app-backend/src/utils/validators.js - Input validation utilities
const { ValidationError } = require('./errorHandler');

const validateRequired = (value, fieldName) => {
    if (value === undefined || value === null || value === '') {
        throw new ValidationError(`${fieldName} is required`, fieldName);
    }
    return value;
};

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email format', 'email');
    }
    return email.toLowerCase().trim();
};

const validatePhone = (phone) => {
    const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(phone)) {
        throw new ValidationError('Invalid phone number format', 'phone');
    }
    return phone.trim();
};

const validatePositiveNumber = (value, fieldName) => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) {
        throw new ValidationError(`${fieldName} must be a positive number`, fieldName);
    }
    return num;
};

const validateInteger = (value, fieldName) => {
    const num = parseInt(value);
    if (isNaN(num)) {
        throw new ValidationError(`${fieldName} must be an integer`, fieldName);
    }
    return num;
};

const validateStringLength = (value, fieldName, minLength = 0, maxLength = 255) => {
    if (typeof value !== 'string') {
        throw new ValidationError(`${fieldName} must be a string`, fieldName);
    }
    if (value.length < minLength) {
        throw new ValidationError(`${fieldName} must be at least ${minLength} characters`, fieldName);
    }
    if (value.length > maxLength) {
        throw new ValidationError(`${fieldName} must be no more than ${maxLength} characters`, fieldName);
    }
    return value.trim();
};

const validateUrl = (url, fieldName) => {
    try {
        new URL(url);
        return url;
    } catch {
        throw new ValidationError(`${fieldName} must be a valid URL`, fieldName);
    }
};

const sanitizeInput = (input) => {
    if (typeof input === 'string') {
        return input.trim().replace(/[<>]/g, '');
    }
    return input;
};

module.exports = {
    validateRequired,
    validateEmail,
    validatePhone,
    validatePositiveNumber,
    validateInteger,
    validateStringLength,
    validateUrl,
    sanitizeInput,
};