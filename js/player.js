/**
 * VideoPlayer - A modular class wrapping YT.Player from the YouTube Iframe API.
 * Replaces React player state tracking and exposes direct seek, load, play, and pause controls.
 */
(function(window) {
    'use strict';

    class VideoPlayer {
        /**
         * Creates a YouTube Player instance.
         * @param {string|HTMLElement} elementId - Target DOM element or ID to replace with iframe.
         * @param {string} videoId - YouTube Video ID or URL.
         * @param {Object} options - Custom options (events, playerVars).
         */
        constructor(elementId, videoId, options = {}) {
            this.elementId = elementId;
            this.videoId = videoId;
            
            // Standard campaign player settings
            this.options = {
                playerVars: {
                    autoplay: 0,
                    rel: 0,
                    controls: 1,
                    showinfo: 0,
                    modestbranding: 1,
                    fs: 1,
                    iv_load_policy: 3
                },
                events: {},
                ...options
            };
            
            this.player = null;
            this.isReady = false;

            // Avoid race conditions: check if DOM element exists first, otherwise wait for load
            const container = document.getElementById(this.elementId);
            if (!container) {
                document.addEventListener('DOMContentLoaded', () => this.init());
            } else {
                this.init();
            }
        }

        /**
         * Triggers YouTube API loading and registers initialization.
         */
        init() {
            const cleanId = this.extractVideoId(this.videoId);
            if (!cleanId) {
                this.showVideoError('Invalid Video ID or URL.');
                return;
            }

            // Log local file protocol warning to console
            if (window.location.protocol === 'file:') {
                console.warn('Open the project using a local HTTP server.');
                this.showVideoError('YouTube player cannot load under the local file:/// protocol. Please run this project using a local HTTP server.');
                return;
            }

            window.YouTubeAPIModule.loadAPI(
                () => {
                    const iframe = this.initializeIframe();
                    if (!iframe) return;

                    this.player = new window.YT.Player(this.elementId, {
                        events: {
                            onReady: (event) => {
                                this.isReady = true;
                                console.log(`[Player] ${this.elementId} is ready.`);
                                if (typeof this.options.events.onReady === 'function') {
                                    this.options.events.onReady(event);
                                }
                            },
                            onStateChange: (event) => {
                                if (typeof this.options.events.onStateChange === 'function') {
                                    this.options.events.onStateChange(event);
                                }
                            },
                            onError: (event) => {
                                console.error(`[Player] Error on player ${this.elementId}:`, event.data);
                                this.handlePlayerError(event.data);
                                if (typeof this.options.events.onError === 'function') {
                                    this.options.events.onError(event);
                                }
                            }
                        }
                    });
                },
                () => {
                    // API Load failure
                    this.showVideoError('Failed to load YouTube player script. Please check your connection or ad-blocker.');
                }
            );
        }

        /**
         * Extracts 11-digit video ID from a YouTube link or raw ID string.
         * @param {string} urlOrId - YouTube URL or ID.
         * @returns {string} Clean 11-character Video ID.
         */
        extractVideoId(urlOrId) {
            if (!urlOrId || typeof urlOrId !== 'string') return '';
            const trimmed = urlOrId.trim();
            if (trimmed.length === 11) return trimmed; // already an ID
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
            const match = trimmed.match(regExp);
            return (match && match[2].length === 11) ? match[2] : '';
        }

        /**
         * Formats correct YouTube Embed URL with API query parameters.
         * @param {string} videoId - YouTube Video ID.
         * @returns {string} YouTube Embed URL.
         */
        createEmbedUrl(videoId) {
            const cleanId = this.extractVideoId(videoId);
            if (!cleanId) return '';
            const origin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : '';
            let url = `https://www.youtube.com/embed/${cleanId}?enablejsapi=1`;
            if (origin) {
                url += `&origin=${encodeURIComponent(origin)}`;
            }
            return url;
        }

        /**
         * Replaces the target container element with a fully configured iframe dynamically.
         * @returns {HTMLIFrameElement|null} The created iframe element.
         */
        initializeIframe() {
            const container = document.getElementById(this.elementId);
            if (!container) {
                console.error(`[VideoPlayer] Target element #${this.elementId} not found.`);
                return null;
            }

            const cleanId = this.extractVideoId(this.videoId);
            const iframe = document.createElement('iframe');
            iframe.id = this.elementId;
            iframe.src = this.createEmbedUrl(cleanId);
            iframe.className = container.className; // Maintain styles/classes
            
            // Apply mandatory iframe attributes
            iframe.setAttribute('allowfullscreen', 'true');
            iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
            
            // Set styles to fill aspect container
            iframe.style.position = 'absolute';
            iframe.style.top = '0';
            iframe.style.left = '0';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';

            // Replace element
            if (container.parentNode) {
                container.parentNode.replaceChild(iframe, container);
            }

            return iframe;
        }

        /**
         * Validates and loads a video URL or ID.
         * Only updates when the selected video ID changes to avoid unnecessary recreation.
         * @param {string} urlOrId - YouTube URL or ID.
         */
        loadVideo(urlOrId) {
            const newId = this.extractVideoId(urlOrId);
            if (!newId) {
                this.showVideoError('Invalid Video ID or URL.');
                return;
            }

            if (window.location.protocol === 'file:') {
                this.showVideoError('YouTube player cannot load under the local file:/// protocol. Please run this project using a local HTTP server.');
                return;
            }

            // Restore the player visibility if it was hidden by previous errors
            const playerEl = document.getElementById(this.elementId);
            if (playerEl) {
                playerEl.style.display = 'block';
                const parent = playerEl.parentNode;
                if (parent) {
                    const fallback = parent.querySelector('.player-fallback-ui');
                    if (fallback) fallback.remove();
                }
            }

            // Performance optimization: only load if it is a different video
            if (this.videoId === newId) {
                return;
            }

            this.videoId = newId;

            if (this.player && typeof this.player.loadVideoById === 'function') {
                try {
                    this.player.loadVideoById(newId);
                } catch (e) {
                    console.error('[VideoPlayer] loadVideoById failed, fallback to iframe replacement:', e);
                    const iframe = document.getElementById(this.elementId);
                    if (iframe) {
                        iframe.src = this.createEmbedUrl(newId);
                    }
                }
            } else {
                const iframe = document.getElementById(this.elementId);
                if (iframe) {
                    iframe.src = this.createEmbedUrl(newId);
                }
            }
        }

        /**
         * Alias matching main.js triggers to load video.
         * @param {string} videoId - YouTube Video ID.
         */
        loadVideoById(videoId) {
            this.loadVideo(videoId);
        }

        /**
         * Handles individual error codes from YouTube Player API.
         * @param {number} errorCode - YouTube error code.
         */
        handlePlayerError(errorCode) {
            let message = 'An error occurred loading the video player.';
            if (errorCode === 2) {
                message = 'The request contains an invalid parameter value.';
            } else if (errorCode === 5) {
                message = 'The requested content cannot be played in an HTML5 player.';
            } else if (errorCode === 100) {
                message = 'The video requested was not found or has been removed.';
            } else if (errorCode === 101 || errorCode === 150) {
                message = 'Embedding is restricted by the video owner (Error 153/150).';
            }
            this.showVideoError(message);
        }

        /**
         * Hides the player and displays a clean fallback UI.
         * @param {string} message - Explanatory error message.
         */
        showVideoError(message) {
            const playerEl = document.getElementById(this.elementId);
            if (!playerEl) return;

            playerEl.style.display = 'none';

            const parent = playerEl.parentNode;
            if (!parent) return;

            // Remove any existing fallback
            const existingFallback = parent.querySelector('.player-fallback-ui');
            if (existingFallback) {
                existingFallback.remove();
            }

            // Create fallback container
            const fallback = document.createElement('div');
            fallback.className = 'player-fallback-ui';

            let protocolWarning = '';
            if (window.location.protocol === 'file:') {
                protocolWarning = `<div class="player-fallback-warning">Open the project using a local HTTP server.</div>`;
            }

            fallback.innerHTML = `
                <div class="player-fallback-icon">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <div class="player-fallback-title">Playback Error</div>
                <div class="player-fallback-msg">${message}</div>
                ${protocolWarning}
            `;

            parent.appendChild(fallback);
        }

        /**
         * Seeks player to a specified timestamp in seconds.
         * @param {number} seconds - Playback timestamp.
         */
        seekTo(seconds) {
            if (this.player && typeof this.player.seekTo === 'function') {
                this.player.seekTo(seconds, true);
                console.log(`[Player] Seeking to ${seconds}s.`);
            } else {
                console.warn('[Player] Cannot seek; YT player not initialized.');
            }
        }

        /**
         * Initiates video playback.
         */
        play() {
            if (this.player && typeof this.player.playVideo === 'function') {
                this.player.playVideo();
            }
        }

        /**
         * Pauses video playback.
         */
        pause() {
            if (this.player && typeof this.player.pauseVideo === 'function') {
                this.player.pauseVideo();
            }
        }

        /**
         * Retrieves the current video playhead time in seconds.
         * @returns {number} Current playback time.
         */
        getCurrentTime() {
            if (this.player && typeof this.player.getCurrentTime === 'function') {
                return this.player.getCurrentTime();
            }
            return 0;
        }

        /**
         * Retrieves current playback state of player.
         * @returns {number} Playback status constant (e.g. YT.PlayerState.PLAYING).
         */
        getPlayerState() {
            if (this.player && typeof this.player.getPlayerState === 'function') {
                return this.player.getPlayerState();
            }
            return -1;
        }

        /**
         * Retrieves total video duration in seconds.
         * @returns {number} Duration in seconds.
         */
        getDuration() {
            if (this.player && typeof this.player.getDuration === 'function') {
                return this.player.getDuration();
            }
            return 0;
        }
    }

    // Expose VideoPlayer globally
    window.VideoPlayer = VideoPlayer;

})(window);
