import { useState, useEffect } from 'react';
import { Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthWrapperProps {
    children: React.ReactNode;
}

const AuthWrapper = ({ children }: AuthWrapperProps) => {
    const [session, setSession] = useState<Session | null>(null);
    const [isConfigured, setIsConfigured] = useState(true);
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (!isSupabaseConfigured()) {
            setIsConfigured(false);
            setCheckingSession(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setCheckingSession(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setCheckingSession(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin,
                },
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Check your email for the login link!' });
        } catch (error: unknown) {
            const authError = error as AuthError;
            setMessage({ type: 'error', text: authError.message || 'An error occurred' });
        } finally {
            setLoading(false);
        }
    };

    // While checking for an existing session, show a minimal loader — not the login screen
    if (checkingSession) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!isConfigured) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-text-primary p-4 text-center">
                <h2 className="text-xl font-bold mb-4 text-accent">Supabase Not Configured</h2>
                <p>Please add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.</p>
                <div className="mt-8 border border-white/10 p-4 rounded bg-surface">
                    <p className="text-sm font-mono text-left">
                        VITE_SUPABASE_URL=...<br />
                        VITE_SUPABASE_ANON_KEY=...
                    </p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-text-primary">
                <div className="w-full max-w-md p-8 bg-surface rounded-xl shadow-2xl border border-white/10">
                    <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Sign In
                    </h1>
                    <p className="text-center text-text-secondary mb-8">
                        Enter your email to receive a magic link
                    </p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-accent transition-colors"
                                required
                            />
                        </div>

                        {message && (
                            <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {message.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Sending link...' : 'Send Magic Link'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default AuthWrapper;
