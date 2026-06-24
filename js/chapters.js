/**
 * ChaptersModule - Renders chapters as premium Spotify-style playlist rows
 * and hooks seekTo clicks and playhead tracking.
 */
(function(window) {
    'use strict';

    const DEFAULT_VIDEO_CHAPTERS = {
        'RJTCAL1DRro': [
            { time: 0, timeStr: '00:00', title: 'Introduction to ICICI Credit Cards' },
            { time: 90, timeStr: '01:30', title: 'Card Activation & Offer Setup' },
            { time: 225, timeStr: '03:45', title: 'Core Benefits & Reward Multipliers' },
            { time: 372, timeStr: '06:12', title: 'Apple Promotion & Voucher Terms' },
            { time: 480, timeStr: '08:00', title: 'Summary & Application Walkthrough' }
        ],
        'jj_aUFX8SV8': [
            { time: 0, timeStr: '00:00', title: 'Welcome and Activation Vouchers' },
            { time: 135, timeStr: '02:15', title: 'Exclusive Travel Voucher Overview' },
            { time: 310, timeStr: '05:10', title: 'BookMyShow Discounts & Card Features' },
            { time: 510, timeStr: '08:30', title: 'Annual Savings & Outro' }
        ],
        'xmmxkmVSiq0': [
            { time: 0, timeStr: '00:00', title: 'Card Onboarding & Setup Guide' },
            { time: 105, timeStr: '01:45', title: 'Managing Settings in iMobile' },
            { time: 260, timeStr: '04:20', title: 'Security features and Limits' },
            { time: 435, timeStr: '07:15', title: 'Final Summary of Fees and T&C' }
        ]
    };

    const ChaptersModule = {
        trackerInterval: null,

        /**
         * Renders the chapter list in a premium Spotify-style playlist interface.
         */
        renderChapters: function(containerEl, videoId, playerInstance) {
            if (!containerEl) return;

            const chapters = DEFAULT_VIDEO_CHAPTERS[videoId] || [];
            containerEl.innerHTML = '';

            // Render Header
            const header = document.createElement('div');
            header.className = 'chapters-header';
            header.innerHTML = `
                <div class="chapters-header-title">Timeline</div>
                <div class="chapters-header-meta">${chapters.length} segments</div>
            `;
            containerEl.appendChild(header);

            // Container list
            const list = document.createElement('div');
            list.className = 'spotify-playlist';
            
            if (chapters.length === 0) {
                list.innerHTML = '<div class="empty-state-text">No chapters available for this tutorial.</div>';
                containerEl.appendChild(list);
                return;
            }

            chapters.forEach((chapter, index) => {
                const row = document.createElement('div');
                row.className = 'spotify-row';
                if (index === 0) row.classList.add('active');
                
                row.setAttribute('role', 'button');
                row.setAttribute('tabindex', '0');
                row.setAttribute('aria-label', `Play chapter ${chapter.title} starting at ${chapter.timeStr}`);

                row.innerHTML = `
                    <div class="spotify-col-index">
                        <span class="row-num">${index + 1}</span>
                        <span class="row-play-icon">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </span>
                        <span class="row-active-icon">
                            <svg class="playing-equalizer" viewBox="0 0 10 12" width="10" height="12">
                                <rect class="eq-bar bar1" x="0" y="0" width="2" height="12" fill="currentColor"/>
                                <rect class="eq-bar bar2" x="4" y="0" width="2" height="12" fill="currentColor"/>
                                <rect class="eq-bar bar3" x="8" y="0" width="2" height="12" fill="currentColor"/>
                            </svg>
                        </span>
                    </div>
                    <div class="spotify-col-title">
                        <div class="row-title">${chapter.title}</div>
                    </div>
                    <div class="spotify-col-duration">${chapter.timeStr}</div>
                `;

                // Event bindings for seek action
                const triggerSeek = () => {
                    this.setActiveRow(list, row);
                    playerInstance.seekTo(chapter.time);
                    playerInstance.play(); // Auto play on segment click
                };

                row.addEventListener('click', triggerSeek);
                row.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        triggerSeek();
                    }
                });

                list.appendChild(row);
            });

            containerEl.appendChild(list);

            // Initialize playhead tracking to auto-highlight active rows during playback
            this.startPlayheadTracker(list, chapters, playerInstance);
        },

        setActiveRow: function(playlistEl, targetRow) {
            const rows = playlistEl.querySelectorAll('.spotify-row');
            rows.forEach(r => r.classList.remove('active'));
            targetRow.classList.add('active');
        },

        startPlayheadTracker: function(playlistEl, chapters, playerInstance) {
            if (this.trackerInterval) {
                clearInterval(this.trackerInterval);
            }

            this.trackerInterval = setInterval(() => {
                // Confirm player has active playhead API
                if (!playerInstance || typeof playerInstance.getCurrentTime !== 'function') return;

                const state = playerInstance.getPlayerState();
                
                // Track visual changes primarily when playing (1)
                const currentTime = playerInstance.getCurrentTime();
                let activeIndex = 0;

                // Determine active segment index
                for (let i = 0; i < chapters.length; i++) {
                    if (currentTime >= chapters[i].time) {
                        activeIndex = i;
                    }
                }

                const rows = playlistEl.querySelectorAll('.spotify-row');
                rows.forEach((row, idx) => {
                    const equalizer = row.querySelector('.playing-equalizer');
                    if (idx === activeIndex) {
                        row.classList.add('active');
                        // Pause visualizer animation if player is paused
                        if (state === 1) {
                            row.classList.add('playing');
                        } else {
                            row.classList.remove('playing');
                        }
                    } else {
                        row.classList.remove('active');
                        row.classList.remove('playing');
                    }
                });
            }, 500);
        }
    };

    window.ChaptersModule = ChaptersModule;

})(window);
