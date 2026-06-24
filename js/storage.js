/**
 * StorageModule - Manages local storage persistent data.
 * Replaces React local storage state hooks.
 */
(function(window) {
    'use strict';

    const STORAGE_KEY_SUBMITTED = 'nofee_lead_submitted';
    const STORAGE_KEY_DATA = 'nofee_lead_data';

    const StorageModule = {
        /**
         * Checks if the user has already submitted the lead form.
         * @returns {boolean} True if submitted, false otherwise.
         */
        isLeadSubmitted: function() {
            try {
                return localStorage.getItem(STORAGE_KEY_SUBMITTED) === 'true';
            } catch (e) {
                console.error('[Storage] Error reading from localStorage:', e);
                return false;
            }
        },

        /**
         * Saves lead form submission data to localStorage.
         * @param {Object} data - The form data object { name, email, phone, company }.
         */
        saveLeadData: function(data) {
            try {
                localStorage.setItem(STORAGE_KEY_SUBMITTED, 'true');
                localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify({
                    ...data,
                    submittedAt: new Date().toISOString()
                }));
                console.log('[Storage] Lead data successfully stored.');
            } catch (e) {
                console.error('[Storage] Error writing to localStorage:', e);
            }
        },

        /**
         * Resets lead storage state (useful for testing).
         */
        resetLeadStorage: function() {
            try {
                localStorage.removeItem(STORAGE_KEY_SUBMITTED);
                localStorage.removeItem(STORAGE_KEY_DATA);
                console.log('[Storage] Lead data cleared.');
            } catch (e) {
                console.error('[Storage] Error resetting storage:', e);
            }
        }
    };

    // Expose StorageModule globally
    window.StorageModule = StorageModule;

})(window);
