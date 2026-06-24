/**
 * main.js - Main Application Orchestrator.
 * Handles premium initializations and state update bindings.
 */
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    console.log('[App] Starting premium redesign orchestrator...');

    // Video Meta Lookup for Task 2 floating player tags
    const VIDEO_METADATA = {
        'RJTCAL1DRro': { title: 'Card Onboarding Overview', duration: '08:00', category: 'Tutorial' },
        'jj_aUFX8SV8': { title: 'Reward Benefits Deep Dive', duration: '08:30', category: 'Savings Guide' },
        'xmmxkmVSiq0': { title: 'Security & Limit Controls', duration: '07:15', category: 'Security Guide' }
    };

    // ==========================================================================
    // 1. Task 1: Exclusive Privileges Carousel
    // ==========================================================================
    initPrivilegesCarousel();

    // ==========================================================================
    // 2. YouTube API Loader & Callback Chain
    // ==========================================================================
    if (window.YouTubeAPIModule) {
        window.YouTubeAPIModule.loadAPI(() => {
            console.log('[App] YouTube API initialized. Loading premium UI systems...');
            const chapterPlayer = initVideoChapters();
            initLeadCapture();
            initChapterGenerator(chapterPlayer);
        });
    }

    // ==========================================================================
    // Task 1 Privileges Carousel
    // ==========================================================================
    function initPrivilegesCarousel() {
        const swiperContainer = document.querySelector('.swiper-container');
        if (!swiperContainer || !window.VanillaCarousel) return;

        const privilegesCarousel = new window.VanillaCarousel(swiperContainer, {
            loop: true,
            speed: 1000,
            autoplayDelay: 2500,
            autoplay: true,
            pauseOnHover: true,
            breakpoints: {
                0: { slidesPerView: 1.2, spaceBetween: 60, rotate: 25, stretch: 50, depth: 100 },
                480: { slidesPerView: 1.3, spaceBetween: 30, rotate: 35, stretch: 30, depth: 180 },
                768: { slidesPerView: 1.7, spaceBetween: 100, rotate: 25, stretch: 70, depth: 200 },
                1200: { slidesPerView: 2, spaceBetween: 100, rotate: 25, stretch: 80, depth: 200 }
            }
        });

        const parent = swiperContainer.parentElement;
        const prevBtn = parent ? parent.querySelector('.swiper-button-prev') : null;
        const nextBtn = parent ? parent.querySelector('.swiper-button-next') : null;

        const handleButtonClick = () => {
            if (window.ctaClickEvent) {
                window.ctaClickEvent("privileges", "carousel", "accordian", 0, "na");
            }
        };

        if (prevBtn) prevBtn.addEventListener('click', handleButtonClick);
        if (nextBtn) nextBtn.addEventListener('click', handleButtonClick);

        if (window.debounce) {
            const handleResize = window.debounce(() => {
                privilegesCarousel.update();
            }, 150);
            window.addEventListener('resize', handleResize);
        }
    }

    // ==========================================================================
    // Task 2: Video Chapters Split-Screen & Carousel
    // ==========================================================================
    function initVideoChapters() {
        const videoWrapper = document.getElementById('video-chapters-section');
        if (!videoWrapper) return null;

        const defaultVideoId = 'RJTCAL1DRro';
        const chaptersContainer = document.getElementById('chapters-panel');

        // DOM elements for floating tags
        const labelTitle = document.getElementById('player-title');
        const labelDuration = document.getElementById('player-duration');
        const labelCategory = document.getElementById('player-category');
        const labelStatus = document.getElementById('player-status');

        const updateFloatingTags = (videoId, state) => {
            const meta = VIDEO_METADATA[videoId];
            if (meta) {
                if (labelTitle) labelTitle.textContent = meta.title;
                if (labelDuration) labelDuration.textContent = meta.duration;
                if (labelCategory) labelCategory.textContent = meta.category;
            }

            if (labelStatus) {
                // YT.PlayerState: PLAYING (1), PAUSED (2)
                if (state === 1) {
                    labelStatus.innerHTML = '<span class="status-pulse"></span>Playing';
                    labelStatus.className = 'status-tag playing';
                } else if (state === 2) {
                    labelStatus.innerHTML = 'Paused';
                    labelStatus.className = 'status-tag paused';
                } else {
                    labelStatus.innerHTML = 'Idle';
                    labelStatus.className = 'status-tag idle';
                }
            }
        };

        // Create Player Instance
        const chapterPlayer = new window.VideoPlayer('video-player-frame', defaultVideoId, {
            playerVars: {
                autoplay: 0,
                rel: 0,
                controls: 1,
                modestbranding: 1
            },
            events: {
                onReady: () => {
                    updateFloatingTags(defaultVideoId, -1);
                },
                onStateChange: (event) => {
                    updateFloatingTags(chapterPlayer.videoId, event.data);
                }
            }
        });

        // Initial chapters draw
        if (window.ChaptersModule) {
            window.ChaptersModule.renderChapters(chaptersContainer, defaultVideoId, chapterPlayer);
        }

        // Thumbnails carousel
        const carousel = document.querySelector('.video-thumbnails-carousel');
        const thumbs = Array.from(carousel.querySelectorAll('.thumbnail-card'));
        const btnPrev = videoWrapper.querySelector('.thumb-prev');
        const btnNext = videoWrapper.querySelector('.thumb-next');

        let activeThumbIdx = 0;

        const updateActiveThumbnail = (idx) => {
            thumbs.forEach((thumb, i) => {
                if (i === idx) {
                    thumb.classList.add('active');
                    thumb.setAttribute('aria-selected', 'true');
                    
                    const videoId = thumb.getAttribute('data-video-id');
                    chapterPlayer.loadVideoById(videoId);
                    updateFloatingTags(videoId, -1);

                    if (window.ChaptersModule) {
                        window.ChaptersModule.renderChapters(chaptersContainer, videoId, chapterPlayer);
                    }
                } else {
                    thumb.classList.remove('active');
                    thumb.setAttribute('aria-selected', 'false');
                }
            });
        };

        thumbs.forEach((thumb, idx) => {
            thumb.addEventListener('click', () => {
                activeThumbIdx = idx;
                updateActiveThumbnail(idx);
            });
            thumb.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activeThumbIdx = idx;
                    updateActiveThumbnail(idx);
                }
            });
        });

        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                activeThumbIdx = (activeThumbIdx - 1 + thumbs.length) % thumbs.length;
                updateActiveThumbnail(activeThumbIdx);
                scrollToActiveThumb();
            });
        }
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                activeThumbIdx = (activeThumbIdx + 1) % thumbs.length;
                updateActiveThumbnail(activeThumbIdx);
                scrollToActiveThumb();
            });
        }

        // Keep active thumbnail centered/visible inside scroll track
        const scrollToActiveThumb = () => {
            const activeThumb = thumbs[activeThumbIdx];
            if (activeThumb && carousel) {
                const scrollLeft = activeThumb.offsetLeft - (carousel.offsetWidth / 2) + (activeThumb.offsetWidth / 2);
                carousel.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        };

        // Arrow Keypress focus
        carousel.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                activeThumbIdx = (activeThumbIdx - 1 + thumbs.length) % thumbs.length;
                updateActiveThumbnail(activeThumbIdx);
                thumbs[activeThumbIdx].focus();
                scrollToActiveThumb();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                activeThumbIdx = (activeThumbIdx + 1) % thumbs.length;
                updateActiveThumbnail(activeThumbIdx);
                thumbs[activeThumbIdx].focus();
                scrollToActiveThumb();
            }
        });

        return chapterPlayer;
    }

    // ==========================================================================
    // Task 2: AI Chapter Generator
    // ==========================================================================
    function initChapterGenerator() {
        const generatorSection = document.getElementById('chapter-generator-section');
        if (generatorSection && window.ChapterGeneratorModule) {
            window.ChapterGeneratorModule.init(generatorSection);
        }
    }

    // ==========================================================================
    // Task 3: Playback-timed Lead Capture Form
    // ==========================================================================
    function initLeadCapture() {
        const leadSection = document.getElementById('lead-capture-section');
        const overlay = document.getElementById('lead-form-overlay');
        if (!leadSection || !overlay || !window.VideoPlayer || !window.LeadFormModule) return;

        const videoId = 'RJTCAL1DRro';

        // Configurable options (Stripe/Apple inspired settings)
        const leadConfig = {
            showAfter: 6,           // Pop form after 6 seconds watch time
            allowClose: true,       // Enable Escape/Skip close controls
            overlayOpacity: 0.82,   // Background overlay filter shadow depth
            theme: 'dark'           // Clean dark premium theme
        };

        const leadPlayer = new window.VideoPlayer('lead-video-player', videoId, {
            playerVars: {
                autoplay: 0,
                rel: 0,
                controls: 1,
                modestbranding: 1
            },
            events: {
                onStateChange: (event) => {
                    // YT.PlayerState: PLAYING (1)
                    if (event.data === 1) {
                        window.LeadFormModule.startPlaybackTracker();
                    } else {
                        window.LeadFormModule.stopPlaybackTracker();
                    }
                }
            }
        });

        window.LeadFormModule.init(overlay, leadPlayer, leadConfig);
    }
});
