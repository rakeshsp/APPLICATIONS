import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Settings, X } from 'lucide-react';
import { AI_PROVIDERS } from '@/lib/ai';

export default function SettingsDialog({ open, onOpenChange }) {
    const [provider, setProvider] = useState(AI_PROVIDERS.GEMINI);
    const [apiKey, setApiKey] = useState('');

    // Load settings on mount
    useEffect(() => {
        const savedProvider = localStorage.getItem('ai_provider') || AI_PROVIDERS.GEMINI;
        const savedKey = localStorage.getItem('ai_api_key') || '';
        setProvider(savedProvider);
        setApiKey(savedKey);
    }, [open]);

    const handleSave = () => {
        localStorage.setItem('ai_provider', provider);
        localStorage.setItem('ai_api_key', apiKey);
        onOpenChange(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl focus:outline-none">

                    <div className="flex items-center justify-between mb-4">
                        <Dialog.Title className="text-lg font-semibold text-slate-100">
                            Settings
                        </Dialog.Title>
                        <Dialog.Close className="text-slate-400 hover:text-slate-200">
                            <X className="w-5 h-5" />
                        </Dialog.Close>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">AI Provider</label>
                            <select
                                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                            >
                                <option value={AI_PROVIDERS.GEMINI}>Google Gemini (Free Tier Available)</option>
                                <option value={AI_PROVIDERS.OPENAI}>OpenAI (GPT-3.5/4)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">API Key</label>
                            <input
                                type="password"
                                placeholder="sk-..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                            />
                            <p className="text-xs text-slate-500">
                                Your key is stored locally in your browser.
                                {provider === AI_PROVIDERS.GEMINI && (
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline ml-1">
                                        Get Gemini Key
                                    </a>
                                )}
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-md transition-colors"
                            >
                                Save Settings
                            </button>
                        </div>
                    </div>

                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
