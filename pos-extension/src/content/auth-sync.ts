// auth-sync.ts
console.log('[POS Extension] Auth Sync Script Loaded');

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "CHECK_POS_SESSION") {
        console.log('[POS Extension] Content Script received session check request');

        try {
            // Find Supabase token in localStorage
            let session = null;

            console.log(`[POS Extension] Scanning ${localStorage.length} localStorage items...`);

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    const item = localStorage.getItem(key);
                    if (item) {
                        try {
                            session = JSON.parse(item);
                            console.log('[POS Extension] Session found!', key);
                            break;
                        } catch (e) {
                            console.error('[POS Extension] Failed to parse session', e);
                        }
                    }
                }
            }

            if (!session) {
                console.warn('[POS Extension] No session found. Keys present:', Object.keys(localStorage));
            }

            sendResponse({ session });
        } catch (e) {
            console.error('[POS Extension] Error accessing localStorage:', e);
            sendResponse({ session: null, error: (e as Error).message });
        }
    }
    return true; // Keep channel open for async response
});
