import { useState, useEffect } from 'react';
import { Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

interface AuthWrapperProps {
    children: React.ReactNode;
}

const AuthWrapper = ({ children }: AuthWrapperProps) => {
    const [session, setSession] = useState<Session | null>(null);
    const [isConfigured, setIsConfigured] = useState(true);
    const [checkingSession, setCheckingSession] = useState(true);
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSaveGoogleTokens = async (session: Session) => {
        if (!session || !session.user) return;
        const { provider_token, provider_refresh_token } = session;
        if (!provider_token) return;

        const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

        try {
            const tokenData: any = {
                user_id: session.user.id,
                access_token: provider_token,
                expires_at: expiresAt,
                updated_at: new Date().toISOString(),
            };

            if (provider_refresh_token) {
                tokenData.refresh_token = provider_refresh_token;
            }

            const { error } = await supabase
                .from('user_google_tokens')
                .upsert(tokenData, { onConflict: 'user_id' });

            if (error) {
                console.error('Failed to save Google OAuth tokens:', error);
            }
        } catch (err) {
            console.error('Error saving Google tokens:', err);
        }
    };

    useEffect(() => {
        if (!isSupabaseConfigured()) {
            setIsConfigured(false);
            setCheckingSession(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                handleSaveGoogleTokens(session);
            }
            setSession(session);
            setCheckingSession(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                handleSaveGoogleTokens(session);
            }
            setSession(session);
            setCheckingSession(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Account created! You are now logged in.' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (error: unknown) {
            const authError = error as AuthError;
            setMessage({ type: 'error', text: authError.message || 'An error occurred' });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                    scopes: 'https://www.googleapis.com/auth/calendar.readonly',
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent'
                    }
                }
            });
            if (error) throw error;
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to sign in with Google' });
            setLoading(false);
        }
    };

    // Loading — checking for existing session
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
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-text-primary px-4">
                <div className="w-full max-w-sm">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl font-bold text-text-primary tracking-tight mb-1">POS</h1>
                        <p className="text-text-secondary text-sm">
                            {isSignUp ? 'Create your account' : 'Welcome back'}
                        </p>
                    </div>

                    {/* Card */}
                    <div className="bg-surface border border-border/60 rounded-2xl p-6 shadow-xl">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-[16px]"
                                    required
                                    autoComplete="email"
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-11 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all text-[16px]"
                                        required
                                        minLength={6}
                                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Error / Success message */}
                            {message && (
                                <div className={`p-3 rounded-lg text-sm ${
                                    message.type === 'success'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                    {message.text}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-accent to-indigo-400 text-white font-semibold py-3 rounded-xl transition-all hover:from-accent-hover hover:to-indigo-500 hover:shadow-lg hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 mt-2"
                            >
                                {loading
                                    ? (isSignUp ? 'Creating account...' : 'Signing in...')
                                    : (isSignUp ? 'Create Account' : 'Sign In')
                                }
                            </button>

                            <div className="relative my-4 flex items-center justify-center">
                                <span className="absolute left-0 right-0 h-[1px] bg-border/40" />
                                <span className="relative bg-surface px-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                    or
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="w-full bg-background hover:bg-surface-elevated text-text-primary font-semibold py-3 rounded-xl border border-border transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        style={{ fill: '#4285F4' }}
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        style={{ fill: '#34A853' }}
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                        style={{ fill: '#FBBC05' }}
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                        style={{ fill: '#EA4335' }}
                                    />
                                </svg>
                                Continue with Google
                            </button>
                        </form>
                    </div>

                    {/* Toggle Sign up / Sign in */}
                    <p className="text-center text-sm text-text-secondary mt-6">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button
                            onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
                            className="text-accent hover:text-accent-hover font-medium transition-colors"
                        >
                            {isSignUp ? 'Sign in' : 'Create one'}
                        </button>
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default AuthWrapper;
