import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertCircle,
    Loader2,
    Target,
    ChevronDown,
    ChevronUp,
    Zap,
    Shield,
    TrendingUp,
    TrendingDown,
    Minus,
    Layers,
    FileCode
} from 'lucide-react';
import ProjectContextHeader from './ProjectContextHeader';

import { API_BASE } from '../config';

interface ImpactUnit {
    name: string;
    filePaths: string[];
    fileCount: number;
    fragilityScore: number;
    exposureScope: string;
    blastRadius: number;
    trend: string;
    fanIn: number;
    fanOut: number;
    isCyclic: boolean;
}

interface ImpactAnalysis {
    available: boolean;
    reason?: string;
    impactUnits: ImpactUnit[];
    totalModules: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    mostFragile?: string;
    largestBlast?: string;
}

interface Props {
    projectId: string;
    onLoadingChange?: (loading: boolean) => void;
}

export default function RealImpact({ projectId, onLoadingChange }: Props) {
    const [impact, setImpact] = useState<ImpactAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

    useEffect(() => {
        onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

    useEffect(() => {
        fetchImpact();
    }, [projectId]);

    const fetchImpact = async () => {
        // Reset state to prevent stale data
        setImpact(null);
        setError('');
        setLoading(true);

        try {
            // PAGE-SPECIFIC ENDPOINT: Fetches only impact-relevant data
            const res = await fetch(`${API_BASE}/api/analysis/impact`);
            const data = await res.json();

            // CRITICAL: Validate project context matches expected
            const returnedFullName = data.project?.fullName;
            if (returnedFullName && returnedFullName !== projectId) {
                console.warn(`[RealImpact] Project mismatch: expected ${projectId}, got ${returnedFullName}. Retrying...`);
                setTimeout(() => fetchImpact(), 300);
                return;
            }

            if (data.selected && data.analysis?.impact) {
                setImpact(data.analysis.impact);
            } else {
                setError('No impact data available');
            }
        } catch (err) {
            setError('Failed to fetch impact data');
        }
        setLoading(false);
    };

    if (loading) return <LoadingState />;
    if (error || !impact || !impact.available) {
        return <UnavailableState reason={error || impact?.reason} />;
    }

    const getSeverityColor = (fragility: number) => {
        if (fragility >= 75) return { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400', label: 'Critical' };
        if (fragility >= 50) return { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', label: 'High' };
        if (fragility >= 25) return { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400', label: 'Medium' };
        return { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400', label: 'Low' };
    };

    const TrendIcon = ({ trend }: { trend: string }) => {
        if (trend === 'accelerating') return <TrendingUp size={14} className="text-red-400" />;
        if (trend === 'improving') return <TrendingDown size={14} className="text-green-400" />;
        return <Minus size={14} className="text-white/40" />;
    };

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-700 w-full px-4 md:px-6">
            <ProjectContextHeader title="Impact Surface" projectId={projectId} />

            {/* Header / Context */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Target className="text-orange-400" size={20} />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white/50">Structural Fragility</h2>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    label="Critical"
                    value={impact.criticalCount}
                    color="red"
                    icon={Shield}
                    description="fragility ≥ 75%"
                />
                <StatCard
                    label="High"
                    value={impact.highCount}
                    color="orange"
                    icon={Zap}
                    description="fragility ≥ 50%"
                />
                <StatCard
                    label="Medium"
                    value={impact.mediumCount}
                    color="yellow"
                    icon={Layers}
                    description="fragility ≥ 25%"
                />
                <StatCard
                    label="Low"
                    value={impact.lowCount}
                    color="green"
                    icon={FileCode}
                    description="fragility < 25%"
                />
            </div>

            {/* Key Insights */}
            {(impact.mostFragile || impact.largestBlast) && (
                <div className="glass-panel rounded-2xl p-6 border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {impact.mostFragile && (
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                <Shield size={20} className="text-red-400" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Most Fragile Module</div>
                                <div className="text-lg font-bold text-white">{impact.mostFragile}</div>
                            </div>
                        </div>
                    )}
                    {impact.largestBlast && (
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <Target size={20} className="text-orange-400" />
                            </div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-white/30 tracking-widest">Largest Blast Radius</div>
                                <div className="text-lg font-bold text-white">{impact.largestBlast}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Impact Units */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 px-2">Impact Units ({impact.impactUnits.length})</h3>

                {impact.impactUnits.map((unit, i) => {
                    const severity = getSeverityColor(unit.fragilityScore);
                    const isExpanded = expandedUnit === unit.name;

                    return (
                        <motion.div
                            key={unit.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`glass-panel rounded-2xl border ${severity.border} overflow-hidden`}
                        >
                            <div
                                className="p-4 cursor-pointer hover:bg-white/5 transition-all"
                                onClick={() => setExpandedUnit(isExpanded ? null : unit.name)}
                            >
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${severity.bg} flex items-center justify-center shrink-0`}>
                                            <span className={`text-base md:text-lg font-black ${severity.text}`}>
                                                {unit.fragilityScore.toFixed(0)}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm md:text-base text-white flex items-center gap-2 truncate">
                                                {unit.name}
                                                {unit.isCyclic && (
                                                    <span className="text-[8px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full uppercase font-black shrink-0">
                                                        Cyclic
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-white/40 flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                                                <span>{unit.fileCount} files</span>
                                                <span className="capitalize">{unit.exposureScope}</span>
                                                <span className="flex items-center gap-1">
                                                    <TrendIcon trend={unit.trend} />
                                                    {unit.trend}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-8 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5">
                                        <div className="text-left sm:text-right sm:w-16 shrink-0">
                                            <div className="text-[9px] uppercase font-bold text-white/20">Blast</div>
                                            <div className="text-base font-black text-white">{unit.blastRadius}</div>
                                        </div>
                                        <div className="text-left sm:text-right sm:w-20 shrink-0">
                                            <div className="text-[9px] uppercase font-bold text-white/20">Fan In/Out</div>
                                            <div className="text-xs font-mono text-white/40">{unit.fanIn}/{unit.fanOut}</div>
                                        </div>
                                        <div className="sm:w-24 shrink-0 flex justify-end">
                                            <div className={`px-2 md:px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase whitespace-nowrap ${severity.bg} ${severity.text}`}>
                                                {severity.label}
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp size={16} className="text-white/40 shrink-0" /> : <ChevronDown size={16} className="text-white/40 shrink-0" />}
                                    </div>
                                </div>

                            </div>

                            <AnimatePresence>
                                {isExpanded && unit.filePaths.length > 0 && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-white/10"
                                    >
                                        <div className="p-4 bg-black/20">
                                            <div className="text-[10px] uppercase font-bold text-white/30 mb-2">Files ({unit.filePaths.length})</div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 max-h-48 overflow-y-auto items-start">
                                                {unit.filePaths.slice(0, 15).map((path, pi) => (
                                                    <div key={pi} className="text-xs text-white/50 font-mono truncate hover:text-white transition-colors">
                                                        {path}
                                                    </div>
                                                ))}
                                                {unit.filePaths.length > 15 && (
                                                    <div className="text-xs text-white/30 italic">
                                                        +{unit.filePaths.length - 15} more files
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Data Source */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Impact computed from {impact.totalModules} modules • Fragility derived from real dependency topology
            </div>
        </div>
    );
}

function StatCard({ label, value, color, icon: Icon, description }: {
    label: string;
    value: number;
    color: 'red' | 'orange' | 'yellow' | 'green';
    icon: React.ElementType;
    description: string;
}) {
    const colors = {
        red: 'from-red-500/20 to-red-500/5 border-red-500/20 text-red-400',
        orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/20 text-orange-400',
        yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20 text-yellow-400',
        green: 'from-green-500/20 to-green-500/5 border-green-500/20 text-green-400'
    };

    return (
        <div className={`rounded-2xl p-3 md:p-4 bg-gradient-to-br ${colors[color]} border`}>
            <div className="flex items-center gap-2 mb-2">
                <Icon size={14} />
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">{label}</span>
            </div>
            <div className="text-3xl font-black text-white">{value}</div>
            <div className="text-[10px] text-white/30 mt-1">{description}</div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-6 animate-in fade-in duration-500">
            {/* Blast radius / ripple animation */}
            <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Expanding rings */}
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="absolute rounded-full border-2 border-orange-500/50"
                        style={{
                            animation: 'ripple 2s ease-out infinite',
                            animationDelay: `${(i - 1) * 0.5}s`
                        }}
                    />
                ))}
                {/* Center core */}
                <div className="w-4 h-4 bg-orange-500 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.8)] z-10" />
            </div>
            <style>{`
                @keyframes ripple {
                    0% { width: 16px; height: 16px; opacity: 1; }
                    100% { width: 96px; height: 96px; opacity: 0; }
                }
            `}</style>
            <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-white uppercase tracking-widest">Impact Surface</h3>
                <p className="text-sm text-white/40 font-medium">Calculating blast radius...</p>
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
                <h3 className="text-xl font-bold text-white mb-2">Impact Surface Unavailable</h3>
                <p className="text-sm text-white/40 leading-relaxed">
                    {reason || 'Unable to compute impact from repository structure.'}
                </p>
            </div>
        </div>
    );
}
