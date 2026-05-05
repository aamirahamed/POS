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
