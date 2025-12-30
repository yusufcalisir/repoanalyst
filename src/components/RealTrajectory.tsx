import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    TrendingDown,
    Minus,
    Activity,
    Loader2,
    Zap,
    History,
    ArrowUpRight,
    Info
} from 'lucide-react';
import ProjectContextHeader from './ProjectContextHeader';

import { API_BASE } from '../config';

interface TrajectorySnapshot {
    date: string;
    weekStart: string;
    commitCount: number;
    additions: number;
    deletions: number;
    churnScore: number;
    riskScore: number;
    riskDelta: number;
}

interface TrajectoryAnalysis {
    available: boolean;
    reason?: string;
    snapshots: TrajectorySnapshot[];
    velocityTrend: string;
    velocityFactor: number;
    overallTrend: string;
    confidenceLevel: string;
    totalWeeks: number;
    peakRiskWeek?: string;
    peakRiskScore: number;
}

type TimeWindow = '7d' | '30d' | 'all';

interface Props {
    projectId: string;
    onLoadingChange?: (loading: boolean) => void;
}

export default function RealTrajectory({ projectId, onLoadingChange }: Props) {
    const [trajectory, setTrajectory] = useState<TrajectoryAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeWindow, setTimeWindow] = useState<TimeWindow>('all');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    useEffect(() => {
        onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

    useEffect(() => {
        fetchTrajectory();
    }, [projectId]);

    const fetchTrajectory = async () => {
        // Reset state to prevent stale data
        setTrajectory(null);
        setError('');
        setLoading(true);

        try {
            // PAGE-SPECIFIC ENDPOINT: Fetches only trajectory-relevant data
            const res = await fetch(`${API_BASE}/api/analysis/trajectory`);
            const data = await res.json();

            // CRITICAL: Validate project context matches expected
            const returnedFullName = data.project?.fullName;
            if (returnedFullName && returnedFullName !== projectId) {
                console.warn(`[RealTrajectory] Project mismatch: expected ${projectId}, got ${returnedFullName}. Retrying...`);
                setTimeout(() => fetchTrajectory(), 300);
                return;
            }

            if (data.selected && data.analysis?.trajectory) {
                setTrajectory(data.analysis.trajectory);
            } else {
                setError('No trajectory data available');
            }
        } catch (err) {
            setError('Failed to fetch trajectory data');
        }
        setLoading(false);
    };

    const filteredSnapshots = useMemo(() => {
        if (!trajectory) return [];
        if (timeWindow === 'all') return trajectory.snapshots;
        const weeks = timeWindow === '7d' ? 2 : 5;
        return trajectory.snapshots.slice(-weeks);
    }, [trajectory, timeWindow]);

    if (loading) return <LoadingState />;
    if (error || !trajectory || !trajectory.available) return <UnavailableState reason={error || trajectory?.reason} />;

    const maxRisk = Math.max(...filteredSnapshots.map(s => s.riskScore), 100);

    const width = 1000;
    const height = 300;

    const getX = (index: number) => (filteredSnapshots.length <= 1) ? width / 2 : (index / (filteredSnapshots.length - 1)) * width;
    const getY = (val: number) => height - ((val / maxRisk) * height);

    const points = filteredSnapshots.map((s, i) => `${getX(i)},${getY(s.riskScore)}`).join(' ');
    const areaPoints = filteredSnapshots.length > 0
        ? `${points} ${getX(filteredSnapshots.length - 1)},${height} 0,${height}`
        : '';

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-700">
            <ProjectContextHeader title="Risk Trajectory" projectId={projectId} />

            {/* Velocity Controls (Integrated into Header Row) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <History className="text-purple-400" size={18} />
                        <h2 className="text-[10px] md:text-sm font-black uppercase tracking-widest text-white/30">Architectural Pulse</h2>
                    </div>
                </div>


                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 self-start overflow-x-auto max-w-full no-scrollbar">
                    {(['7d', '30d', 'all'] as TimeWindow[]).map((w) => (
                        <button
                            key={w}
                            onClick={() => setTimeWindow(w)}
                            className={`px-4 sm:px-6 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${timeWindow === w
                                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                                : 'text-white/40 hover:text-white/70'
                                }`}
                        >
                            {w.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Graph */}
            <div className="glass-panel rounded-3xl p-8 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 flex gap-4 opacity-50">
                    <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-white/40">
                        <div className="w-2 h-2 rounded-full bg-purple-500" /> Pulse
                    </div>
                </div>

                <div className="relative h-[300px] w-full mt-8">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(168, 85, 247, 0.4)" />
                                <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
                            </linearGradient>
                        </defs>

                        {filteredSnapshots.length > 0 && (
                            <>
                                <motion.polygon
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    points={areaPoints}
                                    fill="url(#areaGradient)"
                                />
                                <motion.polyline
                                    fill="none"
                                    stroke="#a855f7"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    points={points}
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                />
                            </>
                        )}

                        {filteredSnapshots.map((s, i) => (
                            <g key={i} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                                <rect
                                    x={getX(i) - (width / Math.max(filteredSnapshots.length, 1) / 2)}
                                    y="0"
                                    width={width / Math.max(filteredSnapshots.length, 1)}
                                    height={height}
                                    fill="transparent"
                                    className="cursor-pointer"
                                />
                                <circle
                                    cx={getX(i)}
                                    cy={getY(s.riskScore)}
                                    r={hoveredIndex === i ? 6 : 0}
                                    fill="#a855f7"
                                    className="pointer-events-none transition-all duration-200"
                                />
                                {hoveredIndex === i && (
                                    <line x1={getX(i)} y1="0" x2={getX(i)} y2={height} stroke="rgba(255,255,255,0.1)" strokeDasharray="4" />
                                )}
                            </g>
                        ))}
                    </svg>

                    <AnimatePresence>
                        {hoveredIndex !== null && filteredSnapshots[hoveredIndex] && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-0 pointer-events-none"
                                style={{ left: `${(hoveredIndex / Math.max(filteredSnapshots.length - 1, 1)) * 100}%`, transform: 'translateX(-50%)' }}
                            >
                                <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-3 sm:p-4 shadow-2xl min-w-[140px] sm:min-w-[180px] max-w-[calc(100vw-40px)]">
                                    <div className="text-white/40 text-[10px] font-bold uppercase mb-1">{filteredSnapshots[hoveredIndex].date}</div>
                                    <div className="flex items-end gap-2">
                                        <div className="text-2xl font-black text-white">{filteredSnapshots[hoveredIndex].riskScore.toFixed(1)}</div>
                                        <div className={`text-[10px] font-bold mb-1 ${filteredSnapshots[hoveredIndex].riskDelta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                            {filteredSnapshots[hoveredIndex].riskDelta > 0 ? '+' : ''}{filteredSnapshots[hoveredIndex].riskDelta.toFixed(1)}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/10 uppercase font-bold text-[9px] text-white/50">
                                        <div>
                                            <div className="text-white/20">Commits</div>
                                            <div className="text-white">{filteredSnapshots[hoveredIndex].commitCount}</div>
                                        </div>
                                        <div>
                                            <div className="text-white/20">Churn</div>
                                            <div className="text-white">{(filteredSnapshots[hoveredIndex].churnScore / 1000).toFixed(1)}k</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex justify-between items-center mt-6 text-[10px] font-bold uppercase tracking-widest text-white/20">
                    <span>{filteredSnapshots[0]?.date || '-'}</span>
                    <span className="flex items-center gap-2">
                        <Info size={12} /> Hover for details
                    </span>
                    <span>{filteredSnapshots[filteredSnapshots.length - 1]?.date || '-'}</span>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Computed Velocity"
                    value={`${trajectory.velocityFactor.toFixed(1)}x`}
                    trend={trajectory.velocityTrend}
                    description="Change frequency relative to baseline"
                    icon={Zap}
                />
                <MetricCard
                    title="Risk Direction"
                    value={trajectory.overallTrend.replace('_', ' ')}
                    trend={trajectory.overallTrend === 'increasing_risk' ? 'down' : 'up'}
                    description={`Confidence: ${trajectory.confidenceLevel}`}
                    icon={Activity}
                />
                <MetricCard
                    title="Peak Risk"
                    value={trajectory.peakRiskScore.toFixed(0)}
                    trend="neutral"
                    description={`Week: ${trajectory.peakRiskWeek || 'N/A'}`}
                    icon={TrendingUp}
                />
            </div>

            {/* Context */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <History className="text-white/40" />
                </div>
                <div className="flex-1">
                    <h3 className="text-white font-bold mb-1">Historical Context</h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                        Analysis of <span className="text-white font-bold">{trajectory.totalWeeks}</span> weeks shows
                        <span className="text-white font-bold"> {trajectory.overallTrend.replace('_', ' ')}</span> trend with
                        <span className="text-white font-bold"> {trajectory.velocityTrend}</span> velocity.
                    </p>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, trend, description, icon: Icon }: { title: string; value: string; trend: string; description: string; icon: React.ElementType }) {
    const isUp = trend === 'accelerating' || trend === 'up';
    const isDown = trend === 'decelerating' || trend === 'down' || trend === 'increasing_risk';

    return (
        <div className="glass-panel rounded-3xl p-6 border border-white/10 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <Icon size={18} className="text-purple-400" />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-full ${isDown ? 'bg-red-500/10 text-red-500' : isUp ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-white/50'
                    }`}>
                    {trend === 'neutral' ? <Minus size={10} /> : isDown ? <TrendingDown size={10} /> : <ArrowUpRight size={10} />}
                    {trend.replace('_', ' ')}
                </div>
            </div>
            <div className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1">{title}</div>
            <div className="text-3xl font-black text-white mb-2 capitalize">{value}</div>
            <p className="text-[11px] leading-relaxed text-white/40">{description}</p>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-6 animate-in fade-in duration-500">
            {/* Ascending line chart animation */}
            <div className="relative w-32 h-20">
                <svg viewBox="0 0 100 50" className="w-full h-full">
                    <path
                        d="M0,45 Q20,40 30,35 T50,25 T70,15 T100,5"
                        fill="none"
                        stroke="url(#trajectoryGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="animate-pulse"
                        style={{ strokeDasharray: 200, strokeDashoffset: 0, animation: 'drawLine 2s ease-in-out infinite' }}
                    />
                    <defs>
                        <linearGradient id="trajectoryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#6366f1" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute right-0 top-0 w-3 h-3 bg-purple-500 rounded-full animate-ping" />
            </div>
            <style>{`
                @keyframes drawLine {
                    0% { stroke-dashoffset: 200; }
                    50% { stroke-dashoffset: 0; }
                    100% { stroke-dashoffset: 200; }
                }
            `}</style>
            <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-white uppercase tracking-widest">Risk Trajectory</h3>
                <p className="text-sm text-white/40 font-medium">Mapping historical risk vectors...</p>
            </div>
        </div>
    );
}

function UnavailableState({ reason }: { reason?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-6 px-12">
            <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Activity size={40} className="text-white/10" />
            </div>
            <div className="text-center max-w-sm">
                <h3 className="text-xl font-bold text-white mb-2">Insufficient Signal</h3>
                <p className="text-sm text-white/40 leading-relaxed">
                    {reason || 'History may be too shallow or API rate limits were reached.'}
                </p>
            </div>
        </div>
    );
}
