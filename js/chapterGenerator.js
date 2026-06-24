/**
 * ChapterGeneratorModule - Handles mock AI chapter generation, collapsible code snippets,
 * custom download actions, and sliding success toasts.
 */
(function(window) {
    'use strict';

    /**
     * Isolated Mock Transcript Service.
     */
    async function mockTranscriptAPI(videoId) {
        // Simulate network delay to demonstrate loading state
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (videoId === 'error') {
            throw new Error('Server returned 500: Failed to fetch transcript.');
        }
        if (!videoId || videoId.length < 5) {
            throw new Error('Invalid YouTube video ID or transcript unavailable.');
        }

        const hash = videoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        return [
            { time: 0, timeStr: '00:00', title: 'Video Overview & Welcome' },
            { time: Math.round(hash % 30 + 15), timeStr: formatTimeStr(Math.round(hash % 30 + 15)), title: 'Core Credit Features' },
            { time: Math.round(hash % 50 + 90), timeStr: formatTimeStr(Math.round(hash % 50 + 90)), title: 'Redeeming Activation Rewards' },
            { time: Math.round(hash % 80 + 200), timeStr: formatTimeStr(Math.round(hash % 80 + 200)), title: 'Configuring Security Limits' },
            { time: Math.round(hash % 100 + 350), timeStr: formatTimeStr(Math.round(hash % 100 + 350)), title: 'How to Apply & Outro' }
        ];
    }

    function formatTimeStr(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function extractVideoId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    function highlightJSON(jsonStr) {
        let escaped = jsonStr
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        return escaped.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'number';
            if (/^"/.test(match)) {
                if (/:$/.test(match)) {
                    cls = 'key';
                } else {
                    cls = 'string';
                }
            } else if (/true|false/.test(match)) {
                cls = 'boolean';
            } else if (/null/.test(match)) {
                cls = 'null';
            }
            return `<span class="code-${cls}">${match}</span>`;
        });
    }

    function highlightHTML(htmlStr) {
        let escaped = htmlStr
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
            
        return escaped.replace(/(&lt;\/?[a-zA-Z0-9\-]+)(.*?)(&gt;)/g, function(match, p1, p2, p3) {
            let attrs = p2.replace(/(\s[a-zA-Z0-9\-]+=)("[^"]*")/g, ' <span class="code-attr">$1</span><span class="code-val">$2</span>');
            return `<span class="code-tag">${p1}</span>${attrs}<span class="code-tag">${p3}</span>`;
        });
    }

    function highlightJS(jsStr) {
        let escaped = jsStr
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        let tokens = [];
        let tempStr = escaped;
        
        tempStr = tempStr.replace(/(\/\/[^\n]*)/g, function(match) {
            tokens.push(`<span class="code-comment">${match}</span>`);
            return `__TOKEN_${tokens.length - 1}__`;
        });
        
        tempStr = tempStr.replace(/("[^"]*"|'[^']*')/g, function(match) {
            tokens.push(`<span class="code-string">${match}</span>`);
            return `__TOKEN_${tokens.length - 1}__`;
        });
        
        tempStr = tempStr.replace(/\b(const|let|var|function|if|return)\b/g, '<span class="code-keyword">$1</span>');
        tempStr = tempStr.replace(/\b(\d+)\b/g, '<span class="code-number">$1</span>');
        
        for (let i = 0; i < tokens.length; i++) {
            tempStr = tempStr.replace(`__TOKEN_${i}__`, tokens[i]);
        }
        
        return tempStr;
    }


    const ChapterGeneratorModule = {
        init: function(generatorContainerEl) {
            if (!generatorContainerEl) return;

            this.container = generatorContainerEl;
            this.inputUrl = this.container.querySelector('#generator-url');
            this.btnGenerate = this.container.querySelector('#generator-btn');
            
            // State wrappers
            this.loadingState = this.container.querySelector('#generator-loading');
            this.errorState = this.container.querySelector('#generator-error');
            this.successState = this.container.querySelector('#generator-success');
            
            // Output elements
            this.chaptersDisplay = this.container.querySelector('#generated-chapters-list');
            this.jsonOutput = this.container.querySelector('#output-json');
            this.htmlOutput = this.container.querySelector('#output-html');
            this.jsOutput = this.container.querySelector('#output-js');

            this.createToast();
            this.bindEvents();
            this.initCollapsibles();
        },

        createToast: function() {
            // Create sliding success toast if not already present
            let toast = document.getElementById('copy-success-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'copy-success-toast';
                toast.className = 'copy-toast';
                toast.innerHTML = `
                    <span class="toast-icon">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                    </span>
                    <span class="toast-message">Copied to clipboard successfully!</span>
                `;
                document.body.appendChild(toast);
            }
            this.toast = toast;
        },

        bindEvents: function() {
            if (this.btnGenerate) {
                this.btnGenerate.addEventListener('click', () => this.handleGenerate());
            }

            // Copy buttons
            const copyButtons = this.container.querySelectorAll('.copy-btn');
            copyButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Avoid triggering accordion toggle
                    const targetSelector = btn.getAttribute('data-clipboard-target');
                    const targetEl = this.container.querySelector(targetSelector);
                    if (targetEl) {
                        this.copyToClipboard(targetEl.textContent || targetEl.value, btn);
                    }
                });
            });

            // Download buttons
            const downloadButtons = this.container.querySelectorAll('.download-btn');
            downloadButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Avoid triggering accordion toggle
                    const targetSelector = btn.getAttribute('data-download-target');
                    const filename = btn.getAttribute('data-filename');
                    const type = btn.getAttribute('data-type') || 'text/plain';
                    const targetEl = this.container.querySelector(targetSelector);
                    if (targetEl) {
                        this.triggerDownload(targetEl.textContent || targetEl.value, filename, type);
                    }
                });
            });
        },

        initCollapsibles: function() {
            const headers = this.container.querySelectorAll('.snippet-header');
            headers.forEach(header => {
                header.addEventListener('click', () => {
                    const block = header.closest('.collapsible-code-block');
                    if (block) {
                        block.classList.toggle('expanded');
                    }
                });

                header.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const block = header.closest('.collapsible-code-block');
                        if (block) {
                            block.classList.toggle('expanded');
                        }
                    }
                });
            });
        },

        handleGenerate: async function() {
            const url = this.inputUrl.value.trim();
            if (!url) {
                this.showError('Please paste a YouTube URL first.');
                return;
            }

            const videoId = extractVideoId(url);
            if (!videoId) {
                this.showError('Could not parse Video ID. Please enter a valid YouTube URL.');
                return;
            }

            this.showLoading();
            
            try {
                const chapters = await mockTranscriptAPI(videoId);
                this.showSuccess(chapters, videoId);
            } catch (err) {
                this.showError(err.message || 'Error occurred while generating chapters.');
            }
        },

        showLoading: function() {
            this.loadingState.style.display = 'block';
            this.errorState.style.display = 'none';
            this.successState.style.display = 'none';
            this.btnGenerate.disabled = true;

            // Trigger linear loader animation
            const progressLine = this.loadingState.querySelector('.progress-bar-line');
            if (progressLine) {
                progressLine.style.width = '0%';
                // Animate progress line mock updates
                let progress = 0;
                this.loaderInterval = setInterval(() => {
                    progress += Math.random() * 15;
                    if (progress >= 100) {
                        progress = 95; // Hold at 95 until success completes
                    }
                    progressLine.style.width = `${progress}%`;
                }, 150);
            }
        },

        showError: function(message) {
            if (this.loaderInterval) clearInterval(this.loaderInterval);
            this.loadingState.style.display = 'none';
            this.successState.style.display = 'none';
            this.errorState.style.display = 'block';
            this.errorState.querySelector('.error-message').textContent = message;
            this.btnGenerate.disabled = false;
        },

        showSuccess: function(chapters, videoId) {
            if (this.loaderInterval) {
                clearInterval(this.loaderInterval);
                const progressLine = this.loadingState.querySelector('.progress-bar-line');
                if (progressLine) progressLine.style.width = '100%';
            }

            // Small delay to let progress bar finish filling
            setTimeout(() => {
                this.loadingState.style.display = 'none';
                this.errorState.style.display = 'none';
                this.successState.style.display = 'grid';
                this.btnGenerate.disabled = false;

                // Render chapters inside elegant timeline cards
                this.chaptersDisplay.innerHTML = '';
                chapters.forEach((ch, idx) => {
                    const card = document.createElement('div');
                    card.className = 'timeline-card-item';
                    card.innerHTML = `
                        <div class="timeline-dot"></div>
                        <div class="timeline-card-content">
                            <span class="timeline-time">${ch.timeStr}</span>
                            <h4 class="timeline-title">${ch.title}</h4>
                        </div>
                    `;
                    this.chaptersDisplay.appendChild(card);
                });

                // Populate Code Blocks with Highlighting
                const jsonText = JSON.stringify(chapters, null, 4);
                this.jsonOutput.innerHTML = highlightJSON(jsonText);

                let htmlBlock = `<nav class="chapters-nav" aria-label="Video Chapters">\n    <ul class="chapters-list">\n`;
                chapters.forEach(ch => {
                    htmlBlock += `        <li><button onclick="seekToSeconds(${ch.time})"><time>${ch.timeStr}</time> ${ch.title}</button></li>\n`;
                });
                htmlBlock += `    </ul>\n</nav>`;
                this.htmlOutput.innerHTML = highlightHTML(htmlBlock);

                let jsBlock = `// YouTube Player Seek Integration Script\n`;
                jsBlock += `const chapters = ${JSON.stringify(chapters, null, 4)};\n\n`;
                jsBlock += `function seekToSeconds(seconds) {\n`;
                jsBlock += `    if (window.ytPlayer && typeof window.ytPlayer.seekTo === 'function') {\n`;
                jsBlock += `        window.ytPlayer.seekTo(seconds, true);\n`;
                jsBlock += `    }\n`;
                jsBlock += `}`;
                this.jsOutput.innerHTML = highlightJS(jsBlock);

                // Expand first accordion by default
                const blocks = this.container.querySelectorAll('.collapsible-code-block');
                blocks.forEach((b, idx) => {
                    if (idx === 0) {
                        b.classList.add('expanded');
                    } else {
                        b.classList.remove('expanded');
                    }
                });

            }, 250);
        },

        copyToClipboard: function(text, buttonEl) {
            navigator.clipboard.writeText(text).then(() => {
                // Show sliding toast feedback
                this.showToast();
                
                // Show visual state on button
                const origText = buttonEl.textContent;
                buttonEl.textContent = 'Copied!';
                buttonEl.classList.add('copied');
                
                setTimeout(() => {
                    buttonEl.textContent = origText;
                    buttonEl.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('[Clipboard] Copy failed:', err);
            });
        },

        triggerDownload: function(content, filename, type) {
            try {
                const blob = new Blob([content], { type: type });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
                console.log(`[Generator] File downloaded: ${filename}`);
            } catch (err) {
                console.error('[Generator] Download failed:', err);
            }
        },

        showToast: function() {
            if (!this.toast) return;
            this.toast.classList.add('show');
            
            if (this.toastTimeout) {
                clearTimeout(this.toastTimeout);
            }
            
            this.toastTimeout = setTimeout(() => {
                this.toast.classList.remove('show');
            }, 2500);
        }
    };

    window.ChapterGeneratorModule = ChapterGeneratorModule;

})(window);
