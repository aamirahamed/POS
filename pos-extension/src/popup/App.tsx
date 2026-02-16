import { AuthProvider, useAuth } from '@/components/AuthContext';
import { Login } from '@/components/Login';
import { Loader2, Settings as SettingsIcon, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Settings } from '@/components/Settings';
import { aiService, JobData, AIProviderType } from '@/lib/ai';
import { JobForm } from '@/components/JobForm';
import { supabase } from '@/lib/supabase';

const AppContent = () => {
    const { user, loading } = useAuth();
    const [view, setView] = useState<'idle' | 'settings' | 'capturing' | 'preview' | 'success'>('idle');
    const [extractedData, setExtractedData] = useState<JobData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCapture = async () => {
        setView('capturing');
        setError(null);
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.id) throw new Error("No active tab");

            // Try sending message first
            let response;
            try {
                response = await chrome.tabs.sendMessage(tab.id, { action: "CAPTURE_JOB" });
            } catch (err) {
                console.log("Content script not ready, injecting manually...");
            }

            // If message failed or no response, inject script manually
            if (!response || !response.text) {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        const siteSelectors: { [key: string]: string[] } = {
                            'linkedin.com': ['.jobs-description__content', '.jobs-details__main-content', '.job-view-layout', 'article'],
                            'indeed.com': ['#jobDescriptionText', '.jobsearch-JobComponent'],
                            'prosple.com': ['.prosple-job-details', '#job-details', 'article'],
                            'gradconnection.com': ['.job-details', 'main']
                        };

                        let container: HTMLElement | null = null;
                        const hostname = window.location.hostname;
                        const domain = Object.keys(siteSelectors).find(d => hostname.includes(d));
                        let structuredInfo = "";

                        if (domain) {
                            for (const selector of siteSelectors[domain]) {
                                const found = document.querySelector(selector);
                                if (found) {
                                    container = found.cloneNode(true) as HTMLElement;
                                    break;
                                }
                            }

                            // LinkedIn metadata scraping
                            if (hostname.includes('linkedin.com')) {
                                const companySelectors = ['.job-details-jobs-unified-top-card__company-name', '.jobs-unified-top-card__company-name', '.topcard__org-name-link'];
                                const titleSelectors = ['.job-details-jobs-unified-top-card__job-title', '.jobs-unified-top-card__job-title', '.t-24'];
                                const company = companySelectors.map(s => document.querySelector(s)?.textContent?.trim()).find(t => t);
                                const title = titleSelectors.map(s => document.querySelector(s)?.textContent?.trim()).find(t => t);
                                if (company) structuredInfo += `Likely Company Name: ${company}\n`;
                                if (title) structuredInfo += `Likely Job Title: ${title}\n`;
                            }
                        }

                        if (!container) {
                            container = document.body.cloneNode(true) as HTMLElement;
                        }

                        const scripts = container.querySelectorAll('script, style, noscript, iframe, svg, button, input, [aria-hidden="true"]');
                        scripts.forEach(script => script.remove());

                        let text = container.innerText || container.textContent || "";
                        text = text.replace(/\s+/g, ' ').trim();

                        if (structuredInfo) {
                            text = `METADATA_HINTS:\n${structuredInfo}\n\nJOB_CONTENT:\n${text}`;
                        }

                        return {
                            text,
                            metadata: {
                                url: window.location.href,
                                title: document.title,
                                source: window.location.hostname
                            }
                        };
                    }
                });
                response = results[0]?.result;
            }

            if (!response || !response.text) {
                throw new Error("Failed to capture page text. Please refresh the page and try again.");
            }

            const { text, metadata } = response;

            // Get settings
            const settings = await chrome.storage.local.get(['ai_provider', 'ai_api_key']);
            const provider = (settings.ai_provider as AIProviderType) || 'chrome_builtin';
            const apiKey = settings.ai_api_key as string;

            // Extract with AI
            const data = await aiService.extract(text, provider, apiKey);

            // Merge metadata
            data.url = metadata.url;
            data.source = metadata.source;

            setExtractedData(data);
            setView('preview');

        } catch (e: any) {
            console.error(e);
            setError(e.message || "Capture failed");
            setView('idle');
        }
    };

    const handleSave = async (data: JobData) => {
        try {
            if (!user) throw new Error("Not authenticated");

            // Check for duplicates
            const { data: existing } = await supabase
                .from('jobs')
                .select('id')
                .eq('url', data.url)
                .is('user_id', user.id) // Ensure RLS context
                .single();

            if (existing) {
                // Update
                const confirmUpdate = confirm("This job URL already exists. Update it?");
                if (!confirmUpdate) return;

                await supabase.from('jobs').update({
                    company: data.company,
                    role: data.role,
                    location: data.location,
                    work_mode: data.work_mode,
                    employment_type: data.employment_type,
                    salary_range: data.salary_range,
                    description: data.description,
                    // notes: data.description, // Keep existing notes?
                    updated_at: new Date().toISOString()
                }).eq('id', existing.id);

            } else {
                // Insert
                await supabase.from('jobs').insert({
                    user_id: user.id,
                    company: data.company,
                    role: data.role,
                    location: data.location,
                    work_mode: data.work_mode,
                    employment_type: data.employment_type,
                    salary_range: data.salary_range,
                    description: data.description,
                    url: data.url,
                    source: data.source,
                    status: 'wishlist'
                });
            }

            setView('success');
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Save failed");
        }
    };

    if (loading) {
        return (
            <div className="h-[400px] w-[350px] flex items-center justify-center bg-background text-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return <div className="h-[400px] w-[350px]"><Login /></div>;
    }

    if (view === 'settings') {
        return <div className="h-[600px] w-[400px]"><Settings onBack={() => setView('idle')} /></div>;
    }

    if (view === 'capturing') {
        return (
            <div className="h-[400px] w-[350px] flex flex-col items-center justify-center bg-background text-foreground space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analyzing page with AI...</p>
            </div>
        );
    }

    if (view === 'preview' && extractedData) {
        return (
            <div className="h-[600px] w-[400px] bg-background text-foreground flex flex-col pt-4">
                <h2 className="px-4 text-md font-semibold mb-2">Review & Save</h2>
                <JobForm
                    initialData={extractedData}
                    onSave={handleSave}
                    onCancel={() => setView('idle')}
                />
            </div>
        );
    }

    if (view === 'success') {
        return (
            <div className="h-[400px] w-[350px] flex flex-col items-center justify-center bg-background text-foreground space-y-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <h2 className="text-xl font-bold">Saved to POS!</h2>
                <Button variant="outline" onClick={() => setView('idle')}>Capture Another</Button>
            </div>
        );
    }

    return (
        <div className="h-[600px] w-[400px] bg-background text-foreground p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col">
                    <h2 className="font-semibold">Job Tracker</h2>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setView('settings')}>
                    <SettingsIcon className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                {error && <div className="text-destructive text-sm text-center px-4">{error}</div>}

                <Button onClick={handleCapture} size="lg" className="w-full max-w-[200px]">
                    Capture Job
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                    Navigate to a job post and click capture.<br />
                    AI will extract details automatically.
                </p>
            </div>
        </div>
    );
};

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
