// Content script

console.log('POS Extension content script loaded');

// Listener for messages from Popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "CAPTURE_JOB") {
        const text = extractPageText();
        const metadata = {
            url: window.location.href,
            title: document.title,
            source: window.location.hostname
        };
        sendResponse({ text, metadata });
    }
    return true; // Keep channel open for async response if needed
});

function extractPageText(): string {
    // Define selectors for specific sites where full body extraction is too noisy
    const siteSelectors: { [key: string]: string[] } = {
        'linkedin.com': [
            '.jobs-description__content',
            '.jobs-details__main-content',
            '.job-view-layout',
            'article'
        ],
        'indeed.com': [
            '#jobDescriptionText',
            '.jobsearch-JobComponent'
        ],
        'prosple.com': [
            '.prosple-job-details',
            '#job-details',
            'article'
        ],
        'gradconnection.com': [
            '.job-details',
            'main'
        ]
    };

    let container: HTMLElement | null = null;
    const hostname = window.location.hostname;

    // Check if we have specific selectors for this site
    const domain = Object.keys(siteSelectors).find(d => hostname.includes(d));
    let structuredInfo = "";

    if (domain) {
        const selectors = siteSelectors[domain];
        for (const selector of selectors) {
            const found = document.querySelector(selector);
            if (found) {
                console.log(`Found specific content container: ${selector}`);
                container = found.cloneNode(true) as HTMLElement;
                break;
            }
        }

        // Try to scrape specific metadata for better accuracy
        if (hostname.includes('linkedin.com')) {
            const companySelectors = [
                '.job-details-jobs-unified-top-card__company-name',
                '.jobs-unified-top-card__company-name',
                '.topcard__org-name-link',
                '.jobs-details-top-card__company-url'
            ];
            const titleSelectors = [
                '.job-details-jobs-unified-top-card__job-title',
                '.jobs-unified-top-card__job-title',
                '.t-24'
            ];

            const company = companySelectors.map(s => document.querySelector(s)?.textContent?.trim()).find(t => t);
            const title = titleSelectors.map(s => document.querySelector(s)?.textContent?.trim()).find(t => t);

            if (company) structuredInfo += `Likely Company Name: ${company}\n`;
            if (title) structuredInfo += `Likely Job Title: ${title}\n`;
        }
    }

    // Fallback to body if no specific container found
    if (!container) {
        container = document.body.cloneNode(true) as HTMLElement;
    }

    // Remove scripts, styles, and hidden elements to clean up text
    const scripts = container.querySelectorAll('script, style, noscript, iframe, svg, button, input, [aria-hidden="true"]');
    scripts.forEach(script => script.remove());

    // Get text content
    let text = container.innerText || container.textContent || "";

    // Basic cleanup
    text = text.replace(/\s+/g, ' ').trim();

    // Prepend structured info if available to guide the AI
    if (structuredInfo) {
        text = `METADATA_HINTS:\n${structuredInfo}\n\nJOB_CONTENT:\n${text}`;
    }

    return text;
}
