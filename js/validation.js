/**
 * ValidationModule - Handles input field validations and formats errors inline.
 * Replaces React inline state validations.
 */
(function(window) {
    'use strict';

    const ValidationModule = {
        /**
         * Validates a person's name.
         * @param {string} name - Name input.
         * @returns {Object} { isValid, message }
         */
        validateName: function(name) {
            const trimmed = (name || '').trim();
            if (!trimmed) {
                return { isValid: false, message: 'Name is required' };
            }
            if (trimmed.length < 2) {
                return { isValid: false, message: 'Name must be at least 2 characters long' };
            }
            return { isValid: true, message: '' };
        },

        /**
         * Validates email syntax.
         * @param {string} email - Email input.
         * @returns {Object} { isValid, message }
         */
        validateEmail: function(email) {
            const trimmed = (email || '').trim();
            if (!trimmed) {
                return { isValid: false, message: 'Email address is required' };
            }
            // Standard RFC 5322 regex
            const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
            if (!emailRegex.test(trimmed)) {
                return { isValid: false, message: 'Please enter a valid email address' };
            }
            return { isValid: true, message: '' };
        },

        /**
         * Validates Indian phone numbers (10 digits starting with 6-9).
         * @param {string} phone - Phone input.
         * @returns {Object} { isValid, message }
         */
        validatePhone: function(phone) {
            const trimmed = (phone || '').trim();
            if (!trimmed) {
                return { isValid: false, message: 'Phone number is required' };
            }
            // Match 10 digit mobile numbers (Indian telecom standard)
            const phoneRegex = /^[6-9]\d{9}$/;
            if (!phoneRegex.test(trimmed)) {
                return { isValid: false, message: 'Please enter a valid 10-digit mobile number' };
            }
            return { isValid: true, message: '' };
        }
    };

    // Expose ValidationModule globally
    window.ValidationModule = ValidationModule;

})(window);
