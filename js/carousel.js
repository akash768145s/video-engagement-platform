/**
 * VanillaCarousel - A custom 3D Coverflow Carousel built from scratch.
 * Replaces Swiper.js bundle.
 */
class VanillaCarousel {
    constructor(containerEl, options = {}) {
        if (!containerEl) return;

        this.container = containerEl;
        this.track = this.container.querySelector('.swiper-wrapper');
        this.slides = Array.from(this.track.querySelectorAll('.swiper-slide'));
        
        // Query buttons and pagination from the parent wrapper to support placing them outside
        const parent = this.container.parentElement;
        this.btnPrev = parent ? parent.querySelector('.swiper-button-prev') : null;
        this.btnNext = parent ? parent.querySelector('.swiper-button-next') : null;
        this.paginationContainer = parent ? parent.querySelector('.swiper-pagination') : null;

        if (this.slides.length === 0) return;

        // Default Configuration
        this.options = {
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
            },
            ...options
        };

        // State variables
        this.originalSlideCount = this.slides.length;
        this.cloneCount = 3; // Clone 3 slides on each side to support loop and coverflow overlap visibility
        this.activeIndex = 0; // 0-based relative to original slides
        this.autoplayTimer = null;
        this.isTransitioning = false;
        
        // Touch & Drag state
        this.isDragging = false;
        this.isMoved = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.deltaX = 0;
        this.baseTranslateX = 0;

        this.init();
    }

    init() {
        // Apply 3D perspective to container and preserve-3d to track
        this.container.style.perspective = '1200px';
        this.track.style.transformStyle = 'preserve-3d';
        this.track.style.display = 'flex';
        this.track.style.width = '100%';

        if (this.options.loop) {
            this.createClones();
        } else {
            this.allSlides = [...this.slides];
        }

        this.createPagination();
        this.updateBreakpoints();
        this.goToSlide(0, false); // Start at slide index 0, no transition animation

        this.bindEvents();

        if (this.options.autoplay) {
            this.startAutoplay();
        }
    }

    createClones() {
        const startClones = [];
        const endClones = [];

        // Clone last C slides to prepend
        for (let i = 0; i < this.cloneCount; i++) {
            const index = (this.originalSlideCount - this.cloneCount + i) % this.originalSlideCount;
            const clone = this.slides[index].cloneNode(true);
            clone.classList.add('swiper-slide-clone');
            startClones.push(clone);
        }

        // Clone first C slides to append
        for (let i = 0; i < this.cloneCount; i++) {
            const index = i % this.originalSlideCount;
            const clone = this.slides[index].cloneNode(true);
            clone.classList.add('swiper-slide-clone');
            endClones.push(clone);
        }

        // Insert clones in DOM
        startClones.forEach(clone => this.track.insertBefore(clone, this.track.firstChild));
        endClones.forEach(clone => this.track.appendChild(clone));

        // Get updated list of all slides (including clones)
        this.allSlides = Array.from(this.track.querySelectorAll('.swiper-slide'));

        // Apply styles to all slides
        this.allSlides.forEach(slide => {
            slide.style.flexShrink = '0';
            slide.style.transformStyle = 'preserve-3d';
            slide.style.backfaceVisibility = 'hidden';
        });
    }

    createPagination() {
        if (!this.paginationContainer) return;

        this.paginationContainer.innerHTML = '';
        this.paginationDots = [];

        for (let i = 0; i < this.originalSlideCount; i++) {
            const dot = document.createElement('span');
            dot.classList.add('swiper-pagination-bullet');
            dot.setAttribute('data-index', i);
            dot.setAttribute('role', 'button');
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);

            dot.addEventListener('click', (e) => {
                const targetIndex = parseInt(e.target.getAttribute('data-index'), 10);
                this.goToSlide(targetIndex);
                if (this.options.autoplay) this.startAutoplay();
            });

            this.paginationContainer.appendChild(dot);
            this.paginationDots.push(dot);
        }
    }

    updateBreakpoints() {
        const width = window.innerWidth;
        let activeBreakpoint = { slidesPerView: 1, spaceBetween: 20, rotate: 20, stretch: 50, depth: 100 };

        // Find matches in breakpoints object
        const sortedBreakpoints = Object.keys(this.options.breakpoints)
            .map(Number)
            .sort((a, b) => a - b);

        for (let bp of sortedBreakpoints) {
            if (width >= bp) {
                activeBreakpoint = this.options.breakpoints[bp];
            }
        }

        this.activeBreakpoint = activeBreakpoint;
        this.calculateSizes();
    }

    calculateSizes() {
        const { slidesPerView, spaceBetween } = this.activeBreakpoint;
        const containerWidth = this.container.offsetWidth;

        // Formula: containerWidth = slidesPerView * slideWidth + (slidesPerView - 1) * spaceBetween
        this.slideWidth = (containerWidth - (slidesPerView - 1) * spaceBetween) / slidesPerView;

        // Apply widths to slides and space out
        this.allSlides.forEach((slide, idx) => {
            slide.style.width = `${this.slideWidth}px`;
            if (idx < this.allSlides.length - 1) {
                slide.style.marginRight = `${spaceBetween}px`;
            } else {
                slide.style.marginRight = '0px';
            }
        });
    }

    bindEvents() {
        // Prev / Next Buttons
        if (this.btnPrev) {
            this.btnPrev.addEventListener('click', () => {
                this.prev();
                if (this.options.autoplay) this.startAutoplay();
            });
        }

        if (this.btnNext) {
            this.btnNext.addEventListener('click', () => {
                this.next();
                if (this.options.autoplay) this.startAutoplay();
            });
        }

        // Transition End
        this.track.addEventListener('transitionend', () => this.handleTransitionEnd());

        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            const rect = this.container.getBoundingClientRect();
            const inViewport = (
                rect.top >= -rect.height &&
                rect.bottom <= window.innerHeight + rect.height
            );

            if (inViewport) {
                if (e.key === 'ArrowLeft') {
                    this.prev();
                    if (this.options.autoplay) this.startAutoplay();
                } else if (e.key === 'ArrowRight') {
                    this.next();
                    if (this.options.autoplay) this.startAutoplay();
                }
            }
        });

        // Hover events
        if (this.options.pauseOnHover && this.options.autoplay) {
            this.container.addEventListener('mouseenter', () => this.stopAutoplay());
            this.container.addEventListener('mouseleave', () => this.startAutoplay());
        }

        // Touch & Mouse Drag Events
        const track = this.track;
        track.addEventListener('mousedown', (e) => this.dragStart(e));
        track.addEventListener('mousemove', (e) => this.dragMove(e));
        document.addEventListener('mouseup', (e) => this.dragEnd(e));
        
        track.addEventListener('touchstart', (e) => this.dragStart(e), { passive: true });
        track.addEventListener('touchmove', (e) => this.dragMove(e), { passive: false });
        track.addEventListener('touchend', (e) => this.dragEnd(e));
        track.addEventListener('touchcancel', (e) => this.dragEnd(e));
    }

    getEventX(e) {
        return e.touches ? e.touches[0].clientX : e.clientX;
    }

    getEventY(e) {
        return e.touches ? e.touches[0].clientY : e.clientY;
    }

    dragStart(e) {
        if (this.isTransitioning) return;
        
        // Only trigger on left-click for mouse
        if (e.type === 'mousedown' && e.button !== 0) return;

        this.isDragging = true;
        this.isMoved = false;
        this.startX = this.getEventX(e);
        this.startY = this.getEventY(e);
        
        this.stopAutoplay();

        // Calculate current translateX base
        const domIndex = this.options.loop ? this.activeIndex + this.cloneCount : this.activeIndex;
        this.baseTranslateX = this.getTranslateXForIndex(domIndex);

        // Turn off transitions
        this.track.style.transition = 'none';
        this.allSlides.forEach(slide => slide.style.transition = 'none');
        
        this.container.style.cursor = 'grabbing';
    }

    dragMove(e) {
        if (!this.isDragging) return;

        this.currentX = this.getEventX(e);
        const currentY = this.getEventY(e);
        
        this.deltaX = this.currentX - this.startX;
        const deltaY = currentY - this.startY;

        // Check if user is scrolling page or dragging slide
        if (!this.isMoved) {
            if (Math.abs(this.deltaX) > Math.abs(deltaY) && Math.abs(this.deltaX) > 5) {
                this.isMoved = true;
            } else if (Math.abs(deltaY) > 5) {
                this.isDragging = false;
                return;
            }
        }

        if (this.isMoved) {
            if (e.cancelable) e.preventDefault(); // Stop page scroll
            
            // Move track
            const currentTranslate = this.baseTranslateX + this.deltaX;
            this.setTrackTranslate(currentTranslate);

            // Interpolate virtual index
            const spaceBetween = this.activeBreakpoint.spaceBetween;
            const step = this.slideWidth + spaceBetween;
            const virtualOffset = this.deltaX / step;
            const domIndex = this.options.loop ? this.activeIndex + this.cloneCount : this.activeIndex;
            const virtualIndex = domIndex - virtualOffset;

            // Instantly update Coverflow transforms for all slides
            this.updateCoverflowTransforms(virtualIndex);
        }
    }

    dragEnd() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.container.style.cursor = 'grab';

        const spaceBetween = this.activeBreakpoint.spaceBetween;
        const step = this.slideWidth + spaceBetween;
        const threshold = step * 0.25;

        // Restore transitions
        this.track.style.transition = `transform ${this.options.speed}ms ease`;
        this.allSlides.forEach(slide => slide.style.transition = `transform ${this.options.speed}ms ease`);

        if (this.isMoved) {
            let targetIndex = this.activeIndex;

            if (this.deltaX < -threshold) {
                // Dragged left -> Next slide
                targetIndex = this.activeIndex + 1;
            } else if (this.deltaX > threshold) {
                // Dragged right -> Prev slide
                targetIndex = this.activeIndex - 1;
            }

            // Go to target slide
            this.goToSlide(targetIndex, true);
        } else {
            // Re-snap to current slide
            this.goToSlide(this.activeIndex, true);
        }

        if (this.options.autoplay) {
            this.startAutoplay();
        }

        this.deltaX = 0;
    }

    getTranslateXForIndex(domIndex) {
        const spaceBetween = this.activeBreakpoint.spaceBetween;
        const containerWidth = this.container.offsetWidth;

        // Translate required to center the slide at index `domIndex`
        const centerOffset = (containerWidth - this.slideWidth) / 2;
        return centerOffset - domIndex * (this.slideWidth + spaceBetween);
    }

    setTrackTranslate(translateX) {
        this.track.style.transform = `translate3d(${translateX}px, 0, 0)`;
    }

    updateCoverflowTransforms(virtualIndex) {
        const { rotate, stretch, depth } = this.activeBreakpoint;
        const spaceBetween = this.activeBreakpoint.spaceBetween;

        this.allSlides.forEach((slide, idx) => {
            const diff = idx - virtualIndex;
            const absDiff = Math.abs(diff);

            // Swiper Coverflow progress is based on slide index distance
            const progress = diff;
            const absProgress = Math.abs(progress);

            // Calculate rotation (scales linearly with progress to match original Swiper)
            const rotateYVal = progress * rotate;

            // Calculate scale & translations (scales linearly with progress to match original Swiper)
            const translateZVal = -absProgress * depth;
            const translateXVal = -progress * stretch;

            // Apply style transforms
            slide.style.transform = `translate3d(${translateXVal}px, 0, ${translateZVal}px) rotateY(${rotateYVal}deg) scale(1)`;
            
            // Set active slide opacity class
            if (absDiff < 0.5) {
                slide.classList.add('swiper-slide-active');
            } else {
                slide.classList.remove('swiper-slide-active');
            }

            // Layer slides based on proximity to center
            slide.style.zIndex = Math.round(100 - absDiff * 10);
        });
    }

    goToSlide(index, animate = true) {
        if (this.isTransitioning && animate) return;

        let targetDOMIndex = index;
        if (this.options.loop) {
            targetDOMIndex = index + this.cloneCount;
        }

        if (animate) {
            this.isTransitioning = true;
            this.track.style.transition = `transform ${this.options.speed}ms ease`;
            this.allSlides.forEach(slide => slide.style.transition = `transform ${this.options.speed}ms ease`);
        } else {
            this.track.style.transition = 'none';
            this.allSlides.forEach(slide => slide.style.transition = 'none');
        }

        // Set base active index
        this.activeIndex = index;

        // Position track
        const targetTranslate = this.getTranslateXForIndex(targetDOMIndex);
        this.setTrackTranslate(targetTranslate);

        // Update coverflow 3D offsets
        this.updateCoverflowTransforms(targetDOMIndex);

        // Update pagination dots
        this.updatePagination();

        if (!animate) {
            // Trigger reflow to apply transformations instantly
            this.track.offsetHeight;
        }
    }

    prev() {
        if (this.isTransitioning) return;
        this.goToSlide(this.activeIndex - 1);
    }

    next() {
        if (this.isTransitioning) return;
        this.goToSlide(this.activeIndex + 1);
    }

    handleTransitionEnd() {
        this.isTransitioning = false;

        if (!this.options.loop) return;

        // Loop check and seamless jump
        if (this.activeIndex < 0) {
            // Jump from clone before start to the actual last slide
            const lastIndex = this.originalSlideCount - 1;
            this.goToSlide(lastIndex, false);
        } else if (this.activeIndex >= this.originalSlideCount) {
            // Jump from clone after end to the actual first slide
            this.goToSlide(0, false);
        }
    }

    updatePagination() {
        if (!this.paginationDots) return;

        // Normalize active index for pagination dots (since loop can index out-of-bounds temporarily)
        let normalizedIndex = this.activeIndex % this.originalSlideCount;
        if (normalizedIndex < 0) {
            normalizedIndex += this.originalSlideCount;
        }

        this.paginationDots.forEach((dot, idx) => {
            if (idx === normalizedIndex) {
                dot.classList.add('swiper-pagination-bullet-active');
                dot.setAttribute('aria-selected', 'true');
            } else {
                dot.classList.remove('swiper-pagination-bullet-active');
                dot.setAttribute('aria-selected', 'false');
            }
        });
    }

    startAutoplay() {
        this.stopAutoplay();
        this.autoplayTimer = setInterval(() => {
            this.next();
        }, this.options.autoplayDelay);
    }

    stopAutoplay() {
        if (this.autoplayTimer) {
            clearInterval(this.autoplayTimer);
            this.autoplayTimer = null;
        }
    }

    update() {
        // Redraw sizes & positions
        this.updateBreakpoints();
        const domIndex = this.options.loop ? this.activeIndex + this.cloneCount : this.activeIndex;
        const targetTranslate = this.getTranslateXForIndex(domIndex);
        
        // Instantly snap to position
        this.track.style.transition = 'none';
        this.allSlides.forEach(slide => slide.style.transition = 'none');
        
        this.setTrackTranslate(targetTranslate);
        this.updateCoverflowTransforms(domIndex);
        
        // Force reflow
        this.track.offsetHeight;
    }
}

// Expose to window object for global availability (supports file:// protocol without CORS issues)
window.VanillaCarousel = VanillaCarousel;
