/**
 * YouTubeAPIModule - Handles loading the YouTube Iframe Player API script.
 * Avoids duplicate script injection and triggers queued player initializations.
 */
(function(window) {
    'use strict';

    const YouTubeAPIModule = {
        isLoaded: false,
        isError: false,
        callbacks: [],
        errorCallbacks: [],

        /**
         * Loads the API script and executes the callback once the API is ready or error occurs.
         * @param {Function} callback - Function to run once API is loaded.
         * @param {Function} errorCallback - Function to run if API fails to load.
         */
        loadAPI: function(callback, errorCallback) {
            if (this.isLoaded) {
                if (typeof callback === 'function') callback();
                return;
            }

            if (this.isError) {
                if (typeof errorCallback === 'function') errorCallback();
                return;
            }

            if (typeof callback === 'function') {
                this.callbacks.push(callback);
            }

            if (typeof errorCallback === 'function') {
                this.errorCallbacks.push(errorCallback);
            }

            // Check if script tag already exists in document
            if (document.getElementById('youtube-iframe-api-script')) {
                return;
            }

            // Create and inject the YouTube API script
            const tag = document.createElement('script');
            tag.id = 'youtube-iframe-api-script';
            tag.src = 'https://www.youtube.com/iframe_api';
            
            tag.onerror = () => {
                this.isError = true;
                console.error('[YouTube API] Failed to load the YouTube API script (possibly blocked by network/ad-blocker).');
                
                // Execute all queued error callbacks
                this.errorCallbacks.forEach(ecb => {
                    try {
                        ecb();
                    } catch (err) {
                        console.error('[YouTube API] Error callback execution failed:', err);
                    }
                });
                this.errorCallbacks = [];
                this.callbacks = [];
            };

            const firstScriptTag = document.getElementsByTagName('script')[0];
            if (firstScriptTag && firstScriptTag.parentNode) {
                firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            } else {
                document.head.appendChild(tag);
            }

            // Bind the global handler called by YouTube when ready
            window.onYouTubeIframeAPIReady = () => {
                this.isLoaded = true;
                console.log('[YouTube API] Script loaded and ready.');
                
                // Execute all queued callbacks
                this.callbacks.forEach(cb => {
                    try {
                        cb();
                    } catch (err) {
                        console.error('[YouTube API] Callback error:', err);
                    }
                });
                this.callbacks = [];
                this.errorCallbacks = [];
            };
        }
    };

    window.YouTubeAPIModule = YouTubeAPIModule;

})(window);
