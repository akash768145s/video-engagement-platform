/**
 * Debounce helper function to improve performance on window resize events.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The delay in milliseconds.
 * @returns {Function} - The debounced function.
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Tracks CTA clicks and pushes them to the Adobe Data Layer.
 * Replaces the React import from Services/adobeDataLayer.
 * 
 * @param {string} ctaName - Name of the clicked CTA.
 * @param {string} ctaRegion - Region of the CTA (e.g., 'carousel').
 * @param {string} ctaType - Type of CTA (e.g., 'accordian').
 * @param {number} faqClick - FAQ clicks count (default 0).
 * @param {string} ctaUrl - URL target (default 'na').
 */
function ctaClickEvent(ctaName, ctaRegion, ctaType, faqClick = 0, ctaUrl = 'na') {
    // Log to console for local verification and debugging
    console.log(`[Tracking] ctaClick: name="${ctaName}", region="${ctaRegion}", type="${ctaType}"`);

    // Ensure the data layer array exists
    window.adobeDataLayer = window.adobeDataLayer || [];

    // Construct standard Adobe Data Layer structure
    const adobeDataLayerObj = {
        "event": "ctaClick",
        "web": {
            "webInteraction": {
                "linkClicks": {
                    "value": 1
                },
                "name": "cta",
                "URL": window.location.href,
                "type": "other"
            }
        },
        "_icicibank": {
            "channelInfo": {
                "version": "1.0.0", // Mock build version
                "name": "nli"
            },
            "dateTime": {
                "unixTimestamp": Date.now()
            },
            "ctaInfo": {
                "ctaName": ctaName,
                "ctaRegion": ctaRegion,
                "ctaType": ctaType,
                "ctaURL": ctaUrl,
                "faqClicks": faqClick
            },
            "pageInfo": {
                "language": "en",
                "pageType": "campaign",
                "virtualPageView": "no vpv",
                "journey": "na",
                "subJourney": "na",
                "subSubJourney": "na"
            },
            "productInfo": {
                "productName": "no fee credit card",
                "productCategory": "credit cards",
                "productSubCategory": "all credit cards"
            }
        }
    };

    window.adobeDataLayer.push(adobeDataLayerObj);
}

// Expose to window object for global availability (supports file:// protocol without CORS issues)
window.debounce = debounce;
window.ctaClickEvent = ctaClickEvent;
