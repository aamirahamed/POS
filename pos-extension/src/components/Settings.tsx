import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AIProviderType } from '@/lib/ai';

export const Settings = ({ onBack }: { onBack: () => void }) => {
    const [provider, setProvider] = useState<AIProviderType>('chrome_builtin');
    const [apiKey, setApiKey] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        chrome.storage.local.get(['ai_provider', 'ai_api_key'], (result) => {
            if (result.ai_provider) setProvider(result.ai_provider as AIProviderType);
            if (result.ai_api_key) setApiKey(result.ai_api_key as string);
        });
    }, []);

    const handleSave = () => {
        chrome.storage.local.set({
            ai_provider: provider,
            ai_api_key: apiKey
        }, () => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        });
    };

    return (
        <div className="p-4 space-y-6 bg-background text-foreground h-full flex flex-col">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Settings</h2>
                <Button variant="ghost" size="sm" onClick={onBack}>Close</Button>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>AI Provider</Label>
                    <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value as AIProviderType)}
                        className="w-full p-2 rounded-md border border-input bg-background"
                    >
                        <option value="chrome_builtin">Chrome Built-in AI (Nano)</option>
                        <option value="external_openai">OpenAI (GPT-4o)</option>
                        <option value="external_gemini">Google Gemini</option>
                    </select>
                </div>

                {provider !== 'chrome_builtin' && (
                    <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                        />
                    </div>
                )}

                <Button onClick={handleSave} className="w-full">
                    {saved ? 'Saved!' : 'Save Settings'}
                </Button>
            </div>

            <div className="mt-auto text-xs text-muted-foreground text-center">
                POS Extension v0.1
            </div>
        </div>
    );
};
