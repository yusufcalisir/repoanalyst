import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    AlertCircle,
    Loader2,
    Target,
    BarChart3,
    Clock,
    Flame,
    Users,
    ShieldAlert
} from 'lucide-react';
import ProjectContextHeader from './ProjectContextHeader';
import AIConcentrationReasoning from './AIConcentrationReasoning';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

import { API_BASE } from '../config';

interface ChurnFile {
    path: string;
    commitCount: number;
    percent: number;
}

interface FileOwnership {
    path: string;
    topContributor: string;
    ownershipPercentage: number;
    riskSignal: 'silo' | 'shared' | 'distributed';
    isCritical: boolean;
}

interface ContributorSurface {
    name: string;
    criticalFilesCount: number;
    ownedRiskArea: number;
    knowledgeSilos: string[];
}

interface BusFactorAnalysis {
    available: boolean;
    reason?: string;
    riskLevel: 'Low' | 'Moderate' | 'High' | 'Undetermined';
    explanation?: string;
    confidence?: number;
    dataQuality?: 'sufficient' | 'limited' | 'insufficient';
    fileOwnerships: FileOwnership[];
    contributorSurfaces: ContributorSurface[];
    totalContributors: number;
    busFactor: number;
    criticalSiloCount?: number;
    distributedFileCount?: number;
    dominantContributor?: string;
    dominantOwnership?: number;
}

interface ConcentrationAnalysis {
    available: boolean;
    reason?: string;
    window: string;
    totalCommitsAnalyzed: number;
    totalFilesTouched: number;
    concentrationIndex: number;
    hotspots: ChurnFile[];
    ownershipRisk?: BusFactorAnalysis;
}

interface Props {
    projectId: string;
    onLoadingChange?: (loading: boolean) => void;
}

export default function RealConcentration({ projectId, onLoadingChange }: Props) {
    const [data, setData] = useState<ConcentrationAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

    useEffect(() => {
        fetchConcentration();
    }, [projectId]);

    const fetchConcentration = async () => {
        // Reset state to prevent stale data
        setData(null);
        setError('');
        setLoading(true);

        try {
            // PAGE-SPECIFIC ENDPOINT: Fetches only concentration-relevant data
            const res = await fetch(`${API_BASE}/api/analysis/concentration`);
            const json = await res.json();

            // CRITICAL: Validate project context matches expected
            const returnedFullName = json.project?.fullName;
            if (returnedFullName && returnedFullName !== projectId) {
                console.warn(`[RealConcentration] Project mismatch: expected ${projectId}, got ${returnedFullName}. Retrying...`);
                setTimeout(() => fetchConcentration(), 300);
                return;
            }

            if (json.selected && json.analysis?.concentration) {
                setData(json.analysis.concentration);
            } else {
                setError('No concentration data available');
            }
        } catch (err) {
            setError('Failed to fetch concentration analysis');
        }
        setLoading(false);
    };

    if (loading) return <LoadingState />;
    if (error || !data || !data.available) {
        return <UnavailableState reason={error || data?.reason} />;
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-700 w-full px-4 md:px-6">
            <ProjectContextHeader title="Change Concentration" projectId={projectId} />

            {/* Header / Sub-Context */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Activity className="text-risk-high" size={20} />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">Structural Hotspots</h2>
                    </div>
                    <p className="text-white/40 mt-1 font-medium italic">Derived from real commit diffs across {data.window}</p>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:flex md:flex-wrap gap-4 md:gap-6">
                <div className="glass-panel rounded-2xl p-4 md:p-6 border border-white/10 relative overflow-hidden group md:flex-1 md:min-w-[320px] max-w-full flex flex-col justify-between min-h-[160px] md:min-h-[220px]">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Target size={60} />
                    </div>
                    <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1">Concentration Index</div>

                    <div className="flex-1 flex flex-col justify-center">
                        <div className="text-2xl md:text-6xl font-black text-white truncate">{data.concentrationIndex.toFixed(1)}%</div>
                    </div>

                    <p className="text-xs text-white/40 leading-relaxed font-medium">
                        Top 10% of files account for this percentage of all analyzed changes.
                    </p>
                </div>

                <div className="glass-panel rounded-2xl p-4 md:p-6 border border-white/10 relative overflow-hidden group md:flex-1 md:min-w-[320px] max-w-full flex flex-col justify-between min-h-[160px] md:min-h-[220px]">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={60} />
                    </div>
                    <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-3">Analysis Scope</div>

                    <div className="flex-1 flex flex-col justify-center">
                        <div className="space-y-4">
                            <div>
                                <div className="text-3xl md:text-4xl font-black text-white leading-none">{data.totalCommitsAnalyzed}</div>
                                <div className="text-[10px] uppercase font-bold text-white/30 mt-1">Commits Analyzed</div>
                            </div>
                            <div>
                                <div className="text-xl md:text-2xl font-black text-risk-high leading-none">{data.totalFilesTouched}</div>
                                <div className="text-[10px] uppercase font-bold text-white/30 mt-1">Files Touched</div>
                            </div>
                        </div>
                    </div>

                    <p className="text-[10px] text-white/20 font-medium italic">
                        Window: {data.window}
                    </p>
                </div>

                <div className={cn(
                    "glass-panel rounded-2xl p-4 md:p-6 border transition-all relative overflow-hidden group md:flex-1 md:min-w-[320px] max-w-full flex flex-col justify-between min-h-[180px] md:min-h-[220px]",
                    data.ownershipRisk?.riskLevel === 'High' ? "border-risk-critical/30 bg-risk-critical/5 shadow-lg shadow-risk-critical/5" : "border-white/10"
                )}>
                    <div className="flex items-center justify-between">
                        <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Bus Factor Risk</div>
                        {data.ownershipRisk && (
                            <div className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                                data.ownershipRisk?.riskLevel === 'High' ? "bg-risk-critical text-white" :
                                    data.ownershipRisk?.riskLevel === 'Moderate' ? "bg-risk-medium text-black" :
                                        data.ownershipRisk?.riskLevel === 'Undetermined' ? "bg-white/20 text-white/60" :
                                            "bg-health-good text-black"
                            )}>
                                {data.ownershipRisk?.riskLevel || 'N/A'}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                        {data.ownershipRisk?.riskLevel === 'Undetermined' ? (
                            <div className="flex flex-col gap-2">
                                <div className="text-2xl md:text-3xl font-black text-white/40 leading-none">-</div>
                                <div className="text-xs md:text-sm font-bold text-white/30 uppercase tracking-tight">Insufficient Data</div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <div className="text-5xl md:text-7xl font-black text-white leading-none">{data.ownershipRisk?.busFactor || 0}</div>
                                <div className="text-xs md:text-sm font-bold text-white/40 uppercase tracking-tight">Primary Contributors</div>
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-[10px] text-white/40 leading-relaxed font-medium">
                            {data.ownershipRisk?.explanation || (
                                data.ownershipRisk?.riskLevel === 'High'
                                    ? "Extreme dependency detected on a single point of failure in critical modules."
                                    : "Knowledge is relatively distributed across the contributing team."
                            )}
                        </p>
                    </div>

                    {data.ownershipRisk?.dataQuality === 'limited' && data.ownershipRisk?.riskLevel !== 'Undetermined' && (
                        <div className="mt-2 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20">
                            <span className="text-[9px] text-yellow-500/80 font-bold uppercase">Limited data confidence</span>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Ownership & Bus Factor Reasoning - Collapsible, only when AI connected */}
            <AIConcentrationReasoning
                projectId={projectId}
                data={data}
            />

            {/* Hotspots & Ownership List */}
            <div className="flex flex-col gap-6 w-full">
                <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                    <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="text-white/40" size={20} />
                            <h3 className="font-bold text-white">Top High-Churn Hotspots</h3>
                        </div>
                    </div>
                    <div className="divide-y divide-white/5">
                        {(data.hotspots || []).map((file, i) => {
                            const ownership = data.ownershipRisk?.fileOwnerships.find(o => o.path === file.path);
                            return (
                                <motion.div
                                    key={file.path}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="p-4 hover:bg-white/5 transition-colors group flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center font-black text-xs text-white/40">
                                            {i + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-white font-mono truncate group-hover:text-risk-high transition-colors">
                                                {file.path}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="text-[10px] text-white/30 uppercase font-black">Hotspot Rank #{i + 1}</div>
                                                {ownership && (
                                                    <div className={cn(
                                                        "text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tight",
                                                        ownership.riskSignal === 'silo' ? "bg-risk-critical/20 text-risk-critical" :
                                                            ownership.riskSignal === 'shared' ? "bg-risk-medium/20 text-risk-medium" : "bg-white/5 text-white/40"
                                                    )}>
                                                        {ownership.riskSignal === 'silo' ? 'Knowledge Silo' : ownership.riskSignal}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 md:gap-8 pl-4">
                                        {ownership && (
                                            <div className="text-right hidden md:block sm:w-32 shrink-0">
                                                <div className="text-[10px] font-black text-white/30 uppercase">Primary Owner</div>
                                                <div className="text-xs font-bold text-white truncate">{ownership.topContributor}</div>
                                            </div>
                                        )}
                                        <div className="text-right sm:w-20 shrink-0">
                                            <div className="text-xs font-bold text-white">{file.commitCount}</div>
                                            <div className="text-[10px] text-white/30 uppercase font-black">Commits</div>
                                        </div>
                                        <div className="text-right sm:w-24 shrink-0">
                                            <div className="text-xs font-bold text-white">{file.percent.toFixed(1)}%</div>
                                            <div className="text-[10px] text-white/30 uppercase font-black">Weight</div>
                                        </div>
                                        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden hidden xl:block shrink-0">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${file.percent}%` }}
                                                transition={{ duration: 1, delay: i * 0.1 }}
                                                className="h-full bg-risk-high"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Contributor Dependency Surface - Now Below hotspots and content-fit */}
                <div className="w-full md:self-center md:min-w-[500px] max-w-full">
                    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden h-full">
                        <div className="p-6 border-b border-white/10 bg-white/5 flex items-center gap-3">
                            <Users className="text-white/40" size={20} />
                            <h3 className="font-bold text-white">Contributor Surface</h3>
                        </div>
                        <div className="p-2 divide-y divide-white/5">
                            {data.ownershipRisk?.contributorSurfaces.map((contributor, i) => (
                                <motion.div
                                    key={contributor.name}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-4 space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-bold text-white">{contributor.name}</div>
                                        <div className="text-[10px] font-bold text-white/40 uppercase">
                                            {contributor.ownedRiskArea.toFixed(1)}% Risk Area
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-white/30">
                                            <span>System Ownership</span>
                                            <span>{contributor.ownedRiskArea.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${contributor.ownedRiskArea}%` }}
                                                className={cn(
                                                    "h-full",
                                                    contributor.ownedRiskArea > 50 ? "bg-risk-critical" :
                                                        contributor.ownedRiskArea > 30 ? "bg-risk-medium" : "bg-white/40"
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 px-3 py-2 bg-white/5 rounded-lg border border-white/5">
                                            <div className="text-[9px] uppercase font-black text-white/20 mb-0.5">Critical Modules</div>
                                            <div className="text-xs font-bold text-white">{contributor.criticalFilesCount}</div>
                                        </div>
                                        <div className="flex-1 px-3 py-2 bg-white/5 rounded-lg border border-white/5">
                                            <div className="text-[9px] uppercase font-black text-white/20 mb-0.5">Silos</div>
                                            <div className="text-xs font-bold text-white">{contributor.knowledgeSilos.length}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-6 animate-in fade-in duration-500">
            {/* Pie chart filling animation */}
            <div className="relative w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                    <circle
                        cx="18" cy="18" r="16" fill="none"
                        stroke="url(#concentrationGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray="100"
                        style={{ animation: 'fillCircle 2s ease-in-out infinite' }}
                    />
                    <defs>
                        <linearGradient id="concentrationGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="100%" stopColor="#f97316" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
                </div>
            </div>
            <style>{`
                @keyframes fillCircle {
                    0% { stroke-dashoffset: 100; }
                    50% { stroke-dashoffset: 20; }
                    100% { stroke-dashoffset: 100; }
                }
            `}</style>
            <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-white uppercase tracking-widest">Concentration</h3>
                <p className="text-sm text-white/40 font-medium">Measuring ownership distribution...</p>
            </div>
        </div>
    );
}

function UnavailableState({ reason }: { reason?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-6 px-12">
            <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                <AlertCircle size={40} className="text-white/10" />
            </div>
            <div className="text-center max-w-sm">
                <h3 className="text-xl font-bold text-white mb-2">Analysis Unavailable</h3>
                <p className="text-sm text-white/40 leading-relaxed font-medium">
                    {reason || 'Insufficient commit history to compute change concentration. Try a more active repository.'}
                </p>
            </div>
        </div>
    );
}
