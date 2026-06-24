/**
 * LeadFormModule - Manages circular countdown progress, Stripe/Apple modal overlays,
 * keyboard focus trapping, inline validation, and the checkmark success screen.
 */
(function(window) {
    'use strict';

    const defaultConfig = {
        showAfter: 6,           // Trigger modal after 6 seconds of actual playback
        allowClose: true,       // Allow closing/skipping
        overlayOpacity: 0.75,   // Transparent backdrop value
        theme: 'dark'           // 'dark' or 'light' modal styling
    };

    const LeadFormModule = {
        config: { ...defaultConfig },
        accumulatedTime: 0,
        timerInterval: null,
        hasTriggered: false,
        focusedElementBeforeModal: null,

        init: function(overlayEl, playerInstance, customConfig = {}) {
            if (!overlayEl || !playerInstance) return;

            this.overlay = overlayEl;
            this.player = playerInstance;
            this.config = { ...defaultConfig, ...customConfig };

            // Query DOM Elements
            this.modalBox = this.overlay.querySelector('.modal-box');
            this.formContainer = this.overlay.querySelector('#lead-capture-form');
            this.successScreen = this.overlay.querySelector('#lead-success-screen');
            
            this.inputName = this.overlay.querySelector('#lead-name');
            this.inputEmail = this.overlay.querySelector('#lead-email');
            this.inputPhone = this.overlay.querySelector('#lead-phone');
            this.inputCompany = this.overlay.querySelector('#lead-company');
            
            this.btnClose = this.overlay.querySelector('#modal-close-x');
            this.btnSkip = this.overlay.querySelector('#modal-skip-btn');
            this.btnSubmit = this.overlay.querySelector('#modal-submit-btn');
            this.btnContinue = this.overlay.querySelector('#modal-continue-btn');

            // Circular Countdown elements
            this.countdownWrapper = document.querySelector('.circular-countdown');
            this.countdownNumber = document.querySelector('#countdown-number');
            this.progressCircle = document.querySelector('.progress-ring-circle');

            this.hasTriggered = window.StorageModule.isLeadSubmitted();
            this.accumulatedTime = 0;

            // Calculate SVG circle properties
            if (this.progressCircle) {
                const radius = this.progressCircle.r.baseVal.value;
                this.circumference = radius * 2 * Math.PI; // 2 * pi * r
                this.progressCircle.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
                this.progressCircle.style.strokeDashoffset = this.circumference;
            }

            this.applyConfig();
            this.bindEvents();

            if (this.hasTriggered) {
                if (this.countdownWrapper) this.countdownWrapper.style.display = 'none';
            }
        },

        applyConfig: function() {
            this.overlay.style.backgroundColor = `rgba(0, 0, 0, ${this.config.overlayOpacity})`;

            // Hide/Show close buttons depending on permission
            if (this.btnClose) {
                this.btnClose.style.display = this.config.allowClose ? 'block' : 'none';
            }
            if (this.btnSkip) {
                this.btnSkip.style.display = this.config.allowClose ? 'inline-block' : 'none';
            }

            // Apply light or dark Vercel/Apple themes
            if (this.modalBox) {
                this.modalBox.classList.remove('theme-dark', 'theme-light');
                this.modalBox.classList.add(`theme-${this.config.theme}`);
            }
        },

        bindEvents: function() {
            // Form submission listener
            if (this.formContainer) {
                this.formContainer.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleSubmit();
                });
            }

            // Skip and Close triggers
            if (this.btnClose) {
                this.btnClose.addEventListener('click', () => this.closeOverlay());
            }
            if (this.btnSkip) {
                this.btnSkip.addEventListener('click', () => this.closeOverlay());
            }

            // Success screen continue button
            if (this.btnContinue) {
                this.btnContinue.addEventListener('click', () => {
                    this.closeOverlay();
                    this.player.play(); // Auto-resume playhead
                });
            }

            // Escape key dismiss
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isModalOpen() && this.config.allowClose) {
                    this.closeOverlay();
                }
            });

            // Focus trap Tab locks
            this.overlay.addEventListener('keydown', (e) => this.handleFocusTrap(e));
        },

        startPlaybackTracker: function() {
            if (this.hasTriggered) return;

            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }

            this.timerInterval = setInterval(() => {
                const state = this.player.getPlayerState();
                if (state === 1) { // YT.PlayerState.PLAYING
                    this.accumulatedTime += 0.1;
                    
                    this.updateCircularProgress();

                    if (this.accumulatedTime >= this.config.showAfter) {
                        this.triggerOverlay();
                    }
                }
            }, 100);
        },

        stopPlaybackTracker: function() {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
        },

        updateCircularProgress: function() {
            // Circular SVG calculations
            if (this.progressCircle && this.circumference) {
                const progress = Math.min(this.accumulatedTime / this.config.showAfter, 1);
                // Animate circle filling up
                const offset = this.circumference - (progress * this.circumference);
                this.progressCircle.style.strokeDashoffset = offset;
            }

            // Render numbers 6 down to 1 inside circle
            if (this.countdownNumber) {
                const secondsLeft = Math.max(Math.ceil(this.config.showAfter - this.accumulatedTime), 0);
                this.countdownNumber.textContent = secondsLeft;
                const statusText = document.querySelector('#countdown-status');
                if (statusText) {
                    statusText.textContent = `Unlocking in ${secondsLeft}s...`;
                }
            }
        },

        triggerOverlay: function() {
            this.stopPlaybackTracker();
            this.hasTriggered = true;

            // Pause the video immediately when modal shows (Apple UX guideline)
            this.player.pause();

            // Fade in overlay
            this.overlay.classList.add('show');
            
            // Register focused element to restore later
            this.focusedElementBeforeModal = document.activeElement;

            // Focus the first input field
            if (this.inputName) {
                this.inputName.focus();
            }

            // Fade out circular progress icon
            if (this.countdownWrapper) {
                this.countdownWrapper.style.opacity = '0';
                setTimeout(() => {
                    this.countdownWrapper.style.display = 'none';
                }, 400);
            }
        },

        closeOverlay: function() {
            this.overlay.classList.remove('show');
            
            if (this.focusedElementBeforeModal) {
                this.focusedElementBeforeModal.focus();
            }
        },

        isModalOpen: function() {
            return this.overlay.classList.contains('show');
        },

        handleSubmit: function() {
            const name = this.inputName.value;
            const email = this.inputEmail.value;
            const phone = this.inputPhone.value;
            const company = this.inputCompany.value;

            this.clearErrors();

            const nameCheck = window.ValidationModule.validateName(name);
            const emailCheck = window.ValidationModule.validateEmail(email);
            const phoneCheck = window.ValidationModule.validatePhone(phone);

            let hasErrors = false;

            if (!nameCheck.isValid) {
                this.showError('lead-name', nameCheck.message);
                hasErrors = true;
            }
            if (!emailCheck.isValid) {
                this.showError('lead-email', emailCheck.message);
                hasErrors = true;
            }
            if (!phoneCheck.isValid) {
                this.showError('lead-phone', phoneCheck.message);
                hasErrors = true;
            }

            if (hasErrors) return;

            // Save records
            const formData = { name, email, phone, company };
            window.StorageModule.saveLeadData(formData);

            // Redesign success transition: Hide Form, Display CSS checkmark
            if (this.formContainer) this.formContainer.style.display = 'none';
            if (this.successScreen) {
                this.successScreen.style.display = 'block';
                // Trigger CSS checkmark draw triggers
                const checkmark = this.successScreen.querySelector('.checkmark-svg');
                if (checkmark) {
                    checkmark.classList.add('animate');
                }
            }

            // Hide close button since user successfully unlocked tutorial
            if (this.btnClose) this.btnClose.style.display = 'none';
        },

        showError: function(fieldId, message) {
            const field = this.overlay.querySelector(`#${fieldId}`);
            if (field) {
                field.classList.add('input-error');
                const group = field.closest('.form-group');
                if (group) {
                    group.classList.add('error-active');
                    const errorSpan = group.querySelector('.error-text');
                    if (errorSpan) {
                        errorSpan.textContent = message;
                        errorSpan.style.display = 'block';
                    }
                }
            }
        },

        clearErrors: function() {
            const inputs = this.overlay.querySelectorAll('.form-group input');
            const groups = this.overlay.querySelectorAll('.form-group');
            const errorSpans = this.overlay.querySelectorAll('.error-text');
            
            inputs.forEach(input => input.classList.remove('input-error'));
            groups.forEach(group => group.classList.remove('error-active'));
            errorSpans.forEach(span => {
                span.textContent = '';
                span.style.display = 'none';
            });
        },

        handleFocusTrap: function(e) {
            if (e.key !== 'Tab') return;

            // Grab visible elements (inputs, buttons) inside the active card state
            const targetParent = this.successScreen.style.display === 'block' ? this.successScreen : this.formContainer;
            const selector = 'input:not([disabled]), button:not([disabled]), [tabindex="0"]';
            
            let focusableEls = Array.from(targetParent.querySelectorAll(selector));
            
            // Include close button if visible
            if (this.config.allowClose && this.btnClose && this.successScreen.style.display !== 'block') {
                focusableEls.unshift(this.btnClose);
            }

            if (focusableEls.length === 0) return;

            const firstFocusable = focusableEls[0];
            const lastFocusable = focusableEls[focusableEls.length - 1];

            if (e.shiftKey) { // Shift + Tab
                if (document.activeElement === firstFocusable) {
                    lastFocusable.focus();
                    e.preventDefault();
                }
            } else { // Tab
                if (document.activeElement === lastFocusable) {
                    firstFocusable.focus();
                    e.preventDefault();
                }
            }
        }
    };

    window.LeadFormModule = LeadFormModule;

})(window);
