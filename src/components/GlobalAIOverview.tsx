import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Loader2, AlertTriangle, Sparkles, RefreshCw, ChevronRight, Info } from 'lucide-react';
import ProjectContextHeader from './ProjectContextHeader';
import { API_BASE } from '../config';

interface Props {
    projectId: string;
    onLoadingChange?: (loading: boolean) => void;
}

interface AIOverviewResponse {
    success: boolean;
    overview?: string;
    sections?: {
        systemType: string;
        riskSources: string;
        riskClassification: string;
        signalConvergence: string;
    };
    missingData?: string[];
    error?: string;
}

export default function GlobalAIOverview({ projectId, onLoadingChange }: Props) {
    const [overview, setOverview] = useState<AIOverviewResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Check if AI is connected
    const connectedProvider = localStorage.getItem('repoanalyst_ai_provider');

    useEffect(() => {
        onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

    useEffect(() => {
        if (connectedProvider) {
            fetchOverview();
        } else {
            setLoading(false);
        }
    }, [projectId, connectedProvider]);

    const fetchOverview = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_BASE}/api/ai/overview?project=${encodeURIComponent(projectId)}&provider=${connectedProvider}`);
            const data = await res.json();

            if (data.success) {
                setOverview(data);
            } else {
                setError(data.error || 'Failed to generate overview');
            }
        } catch (err) {
            setError('Failed to connect to AI service');
        }

        setLoading(false);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchOverview();
        setIsRefreshing(false);
    };

    // Not connected state
    if (!connectedProvider) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-6 px-8">
                <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Brain size={40} className="text-white/10" />
                </div>
                <div className="text-center max-w-md">
                    <h3 className="text-xl font-bold text-white mb-2">AI Analyst Inactive</h3>
                    <p className="text-sm text-white/40 leading-relaxed">
                        Connect an AI provider in the sidebar to enable the Global AI Analyst Overview.
                        This feature synthesizes insights from all analysis sections.
                    </p>
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-6 animate-in fade-in duration-500">
                <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <Brain size={32} className="text-purple-400 animate-pulse" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black border-2 border-purple-500 flex items-center justify-center">
                        <Loader2 size={12} className="text-purple-400 animate-spin" />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest">AI Analyst</h3>
                    <p className="text-sm text-white/40 font-medium">Synthesizing project intelligence...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-6 px-8">
                <div className="w-24 h-24 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertTriangle size={40} className="text-red-400" />
                </div>
                <div className="text-center max-w-md">
                    <h3 className="text-xl font-bold text-white mb-2">Analysis Failed</h3>
                    <p className="text-sm text-white/40 leading-relaxed mb-4">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm font-bold hover:bg-white/20 transition-all"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-700 w-full px-4 md:px-6">
            <ProjectContextHeader title="AI Analyst" projectId={projectId} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <Brain size={20} className="text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-white/50">Global Overview</h2>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">
                            Powered by {connectedProvider?.toUpperCase()}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs font-bold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                >
                    <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                    Regenerate
                </button>
            </div>

            {/* Missing Data Warning */}
            {overview?.missingData && overview.missingData.length > 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                    <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                        <div className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-1">Incomplete Data</div>
                        <p className="text-xs text-white/50 leading-relaxed">
                            The following sections have insufficient data: {overview.missingData.join(', ')}.
                            Conclusions are limited accordingly.
                        </p>
                    </div>
                </div>
            )}

            {/* Main Overview */}
            <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-500/5 to-transparent rounded-full blur-3xl" />

                {/* Fact vs Interpretation Legend */}
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Metric-Derived</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                        <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">AI Interpretation</span>
                    </div>
                </div>

                {/* Narrative */}
                <div className="prose prose-invert prose-sm max-w-none">
                    <p className="text-white/80 leading-relaxed text-sm whitespace-pre-wrap">
                        {overview?.overview || 'No overview generated.'}
                    </p>
                </div>

                {/* Section Breakdown */}
                {overview?.sections && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        <SectionCard
                            title="System Classification"
                            content={overview.sections.systemType}
                            icon={Sparkles}
                        />
                        <SectionCard
                            title="Risk Origins"
                            content={overview.sections.riskSources}
                            icon={AlertTriangle}
                        />
                        <SectionCard
                            title="Risk Typology"
                            content={overview.sections.riskClassification}
                            icon={ChevronRight}
                        />
                        <SectionCard
                            title="Signal Analysis"
                            content={overview.sections.signalConvergence}
                            icon={Info}
                        />
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-2 py-4">
                <Info size={12} className="text-white/20" />
                <span className="text-[10px] text-white/20 uppercase tracking-wider">
                    This overview interprets existing metrics. It does not generate new scores.
                </span>
            </div>
        </div>
    );
}

function SectionCard({ title, content, icon: Icon }: { title: string; content: string; icon: React.ElementType }) {
    return (
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
            <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className="text-purple-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{title}</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">{content}</p>
        </div>
    );
}
