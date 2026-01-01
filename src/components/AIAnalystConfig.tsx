import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Cpu, Sparkles, Wand2, Check, ExternalLink, X, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface AIProvider {
    id: 'gpt' | 'deepseek' | 'gemini';
    name: string;
    icon: React.ElementType;
    color: string;
}

const PROVIDERS: AIProvider[] = [
    { id: 'gpt', name: 'GPT', icon: Sparkles, color: 'text-emerald-400' },
    { id: 'deepseek', name: 'DeepSeek', icon: Cpu, color: 'text-indigo-400' },
    { id: 'gemini', name: 'Gemini', icon: Wand2, color: 'text-purple-400' }
];

interface Props {
    isSidebarCollapsed: boolean;
    onActivate?: () => void;
}

export default function AIAnalystConfig({ isSidebarCollapsed, onActivate }: Props) {
    const [selectedId, setSelectedId] = useState<'gpt' | 'deepseek' | 'gemini' | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectedProvider, setConnectedProvider] = useState<'gpt' | 'deepseek' | 'gemini' | null>(() => {
        const saved = localStorage.getItem('repoanalyst_ai_provider');
        return saved as any || null;
    });

    const handleConnect = () => {
        if (!apiKey || !selectedId) return;
        setIsConnecting(true);
        // Simulate connection
        setTimeout(() => {
            setIsConnecting(false);
            setConnectedProvider(selectedId);
            localStorage.setItem('repoanalyst_ai_provider', selectedId);
            setApiKey('');
            setSelectedId(null);
            // Navigate to projects on activation
            if (onActivate) {
                onActivate();
            }
        }, 1500);
    };

    const handleDisconnect = () => {
        setConnectedProvider(null);
        localStorage.removeItem('repoanalyst_ai_provider');
    };

    if (isSidebarCollapsed) {
        return (
            <div className="px-3 flex justify-center py-4 border-t border-white/5">
                <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500",
                    connectedProvider ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-white/20"
                )}>
                    <Brain size={18} />
                </div>
            </div>
        );
    }

    return (
        <div className="px-3 py-4 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <Brain size={16} className={cn("transition-colors duration-500", connectedProvider ? "text-purple-400" : "text-white/20")} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">AI Analyst</span>
                </div>
                {connectedProvider && (
                    <button
                        onClick={handleDisconnect}
                        className="text-[9px] font-bold text-red-400/50 hover:text-red-400 uppercase tracking-tighter transition-colors"
                    >
                        Disconnect
                    </button>
                )}
            </div>

            <div className="space-y-1">
                {PROVIDERS.map((provider) => {
                    const isSelected = selectedId === provider.id;
                    const isConnected = connectedProvider === provider.id;

                    return (
                        <div key={provider.id} className="space-y-2">
                            <button
                                onClick={() => setSelectedId(isSelected ? null : provider.id)}
                                disabled={!!connectedProvider && !isConnected}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all border",
                                    isConnected
                                        ? "bg-purple-500/10 border-purple-500/20 text-white shadow-lg shadow-purple-500/5"
                                        : isSelected
                                            ? "bg-white/10 border-white/10 text-white"
                                            : "bg-transparent border-transparent text-white/40 hover:bg-white/5 hover:text-white/60",
                                    connectedProvider && !isConnected && "opacity-20 grayscale pointer-events-none"
                                )}
                            >
                                <provider.icon size={14} className={cn(isConnected ? provider.color : "text-current")} />
                                <span className="flex-1 text-left text-xs font-bold tracking-tight">{provider.name}</span>
                                {isConnected && <Check size={12} className="text-purple-400" />}
                            </button>

                            <AnimatePresence>
                                {isSelected && !connectedProvider && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden bg-white/5 rounded-xl border border-white/5"
                                    >
                                        <div className="p-2 space-y-2">
                                            <input
                                                type="password"
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                placeholder={`Enter ${provider.name} API Key`}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                                            />
                                            <button
                                                onClick={handleConnect}
                                                disabled={!apiKey || isConnecting}
                                                className="w-full py-1.5 rounded-lg bg-white text-black text-[10px] font-black uppercase tracking-wider hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                            >
                                                {isConnecting ? (
                                                    <>
                                                        <Loader2 size={10} className="animate-spin" />
                                                        Connecting...
                                                    </>
                                                ) : (
                                                    'Connect'
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {!connectedProvider && !selectedId && (
                <p className="px-2 text-[10px] leading-relaxed text-white/20 font-medium">
                    Activate the AI Analyst layer to generate contextual insights and prioritization logic based on your system topology.
                </p>
            )}

            {connectedProvider && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-2 py-2 rounded-lg bg-green-500/5 border border-green-500/10 flex items-center gap-2"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-green-500/70 uppercase tracking-tighter">AI Analyst Active</span>
                </motion.div>
            )}
        </div>
    );
}
