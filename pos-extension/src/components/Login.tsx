import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export const Login = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSync = async () => {
        setLoading(true);
        setError(null);

        try {
            // Check for POS tab
            const tabs = await chrome.tabs.query({ url: ["http://localhost:5173/*", "https://pos-system-three.vercel.app/*"] });

            if (tabs.length === 0) {
                await chrome.tabs.create({ url: 'http://localhost:5173' });
                setError("Opened POS App. Please log in there, then click 'Sync' again.");
                setLoading(false);
                return;
            }

            const tab = tabs[0];
            if (!tab.id) throw new Error("Could not access POS tab");

            // Direct injection to read localStorage
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // Search for supabase token
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                            try {
                                return JSON.parse(localStorage.getItem(key) || '{}');
                            } catch (e) { return null; }
                        }
                    }
                    return null;
                }
            });

            console.log("Script execution results:", results);

            const session = results[0]?.result;

            if (session && session.access_token) {
                const { access_token, refresh_token } = session;

                // Set session in extension Supabase client
                const { error } = await supabase.auth.setSession({
                    access_token,
                    refresh_token
                });

                if (error) throw error;
            } else {
                throw new Error("No active Supabase session found in the POS tab. Please ensure you are logged in.");
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to sync session");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 space-y-6 h-full bg-background text-foreground">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Save to POS</h1>
                <p className="text-sm text-muted-foreground">Connect to your POS Account</p>
            </div>

            <div className="w-full space-y-4">
                <div className="text-sm text-muted-foreground text-center bg-secondary/50 p-3 rounded-md">
                    Since POS uses Magic Links, please log in to the web app first.
                </div>

                {error && (
                    <div className="text-destructive text-xs text-center">{error}</div>
                )}

                <Button onClick={handleSync} className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sync from POS App'}
                </Button>
            </div>
        </div>
    );
};
