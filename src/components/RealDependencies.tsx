import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertCircle,
    Loader2,
    GitBranch,
    ChevronDown,
    ChevronUp,
    Circle,
    ArrowRight,
    Code,
    Package,
    CheckCircle
} from 'lucide-react';
import ProjectContextHeader from './ProjectContextHeader';

import { API_BASE } from '../config';

interface DependencyNode {
    id: string;
    name: string;
    language: string;
    category: 'internal' | 'external';
    version: string;
    volatility: number;
    lag: string;
    riskAmplification: number;
    fanIn: number;
    fanOut: number;
    centrality: number;
    riskScore: number;
    isCyclic: boolean;
}

interface DependencyEdge {
    source: string;
    target: string;
    importLine: string;
}

interface DependencyAnalysis {
    available: boolean;
    reason?: string;
    nodes: DependencyNode[];
    edges: DependencyEdge[];
    totalNodes: number;
    totalEdges: number;
    cyclicNodes: number;
    highRiskNodes?: string[];
    maxFanIn: number;
}

// Direct dependencies from package.json, go.mod, requirements.txt
interface ManifestDependency {
    name: string;
    declaredVersion: string;
    latestVersion: string;
    type: 'production' | 'development' | 'optional';
    manifest: string;
    versionHealth: 'up-to-date' | 'minor-lag' | 'major-lag' | 'unknown';
    language: 'npm' | 'go' | 'python';
}

interface Props {
    projectId: string;
    onLoadingChange?: (loading: boolean) => void;
}

export default function RealDependencies({ projectId, onLoadingChange }: Props) {
    const [deps, setDeps] = useState<DependencyAnalysis | null>(null);
    const [manifestDeps, setManifestDeps] = useState<ManifestDependency[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    useEffect(() => {
        onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

    useEffect(() => {
        fetchDependencies();
    }, [projectId]);

    const fetchDependencies = async () => {
        // Reset state to prevent stale data
        setDeps(null);
        setManifestDeps([]);
        setError('');
        setLoading(true);

        try {
            // PAGE-SPECIFIC ENDPOINT: Fetches only dependency-relevant data
            const res = await fetch(`${API_BASE}/api/analysis/dependencies`);
            const data = await res.json();

            // CRITICAL: Validate project context matches expected
            const returnedFullName = data.project?.fullName;
            if (returnedFullName && returnedFullName !== projectId) {
                console.warn(`[RealDependencies] Project mismatch: expected ${projectId}, got ${returnedFullName}. Retrying...`);
                setTimeout(() => fetchDependencies(), 300);
                return;
            }

            if (data.selected && data.analysis?.deps) {
                setDeps(data.analysis.deps);
            } else {
                setError('No dependency data available');
            }

            // Extract manifest dependencies (direct from package.json/go.mod)
            if (data.analysis?.manifestDependencies) {
                setManifestDeps(data.analysis.manifestDependencies);
            }
        } catch (err) {
            setError('Failed to fetch dependency data');
        }
        setLoading(false);
    };

    if (loading) return <LoadingState />;
    if (error || !deps || !deps.available) {
        return <UnavailableState reason={error || deps?.reason} />;
    }

    const getRiskColor = (risk: number) => {
        if (risk >= 70) return { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' };
        if (risk >= 50) return { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400' };
        if (risk >= 25) return { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400' };
        return { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' };
    };

    const getLanguageColor = (lang: string) => {
        switch (lang) {
            case 'python': return 'bg-blue-500/20 text-blue-400';
            case 'javascript': return 'bg-yellow-500/20 text-yellow-400';
            case 'typescript': return 'bg-blue-400/20 text-blue-300';
            case 'go': return 'bg-cyan-500/20 text-cyan-400';
            case 'package': return 'bg-purple-500/20 text-purple-400';
            default: return 'bg-white/10 text-white/40';
        }
    };

    const getNodeEdges = (nodeId: string) => {
        return deps.edges.filter(e => e.source === nodeId || e.target === nodeId);
    };

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-700">
            <ProjectContextHeader title="System Dependencies" projectId={projectId} />

            {/* Header / Engine Context */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <GitBranch className="text-purple-400" size={18} />
                        <h2 className="text-[10px] md:text-sm font-black uppercase tracking-widest text-white/30">Structural Risk Engine</h2>
                    </div>
                    <p className="text-[10px] md:text-sm text-white/40 mt-1 font-medium italic">Enriching dependency graph with real-time volatility signals</p>
                </div>

            </div>

            {/* Summary Stats */}
            {(() => {
                const avgCentrality = deps.nodes.length > 0
                    ? Number((deps.nodes.reduce((acc, n) => acc + (n.centrality || 0), 0) / deps.nodes.length).toFixed(3))
                    : 0;
                return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Total Nodes" value={deps.totalNodes} color="purple" />
                        <StatCard label="Internal Edges" value={deps.totalEdges} color="blue" />
                        <StatCard label="Avg Centrality" value={avgCentrality} color="orange" isPercent />
                        <StatCard label="Cyclic Links" value={deps.cyclicNodes} color="red" />
                    </div>
                );
            })()}

            {/* Direct Manifest Dependencies */}
            {manifestDeps.length > 0 && (
                <div className="glass-panel rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-3 mb-6">
                        <Package className="text-cyan-400" size={18} />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">
                            Manifest Dependencies ({manifestDeps.length})
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="hidden md:grid md:grid-cols-6 px-4 py-2 border-b border-white/5 text-[10px] uppercase font-bold text-white/20 tracking-widest">
                            <div className="col-span-2">Package</div>
                            <div>Versions</div>
                            <div>Health</div>
                            <div>Type</div>
                            <div className="text-right">Source</div>
                        </div>
                        {manifestDeps.map((dep, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all duration-300"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-6 items-center gap-4">
                                    {/* Package Info */}
                                    <div className="md:col-span-2 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
                                                <Package className="text-cyan-400/70" size={14} />
                                            </div>
                                            <div className="font-bold text-white text-base truncate pr-2" title={dep.name}>
                                                {dep.name}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Version Group */}
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase font-bold text-white/20 md:hidden">Declared:</span>
                                            <span className="font-mono text-xs text-white/60 bg-white/5 px-1.5 py-0.5 rounded leading-none">{dep.declaredVersion || 'any'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] uppercase font-bold text-white/20 md:hidden">Latest:</span>
                                            <span className="font-mono text-xs text-cyan-400/40 px-1.5 py-0.5 rounded leading-none">{dep.latestVersion || '—'}</span>
                                        </div>
                                    </div>

                                    {/* Health Badge */}
                                    <div className="flex items-center">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm ${dep.versionHealth === 'up-to-date'
                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                            : dep.versionHealth === 'minor-lag'
                                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                                : dep.versionHealth === 'major-lag'
                                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    : 'bg-white/5 text-white/40 border border-white/10'
                                            }`}>
                                            {dep.versionHealth === 'up-to-date' && <CheckCircle size={10} className="shrink-0" />}
                                            {dep.versionHealth}
                                        </span>
                                    </div>

                                    {/* Type Badge */}
                                    <div className="flex items-center">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter border ${dep.type === 'production'
                                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                            }`}>
                                            {dep.type}
                                        </span>
                                    </div>

                                    {/* Source */}
                                    <div className="md:text-right">
                                        <span className="text-[10px] uppercase font-bold text-white/20 md:hidden mr-2">From:</span>
                                        <span className="text-[10px] font-mono text-white/30 truncate group-hover:text-white/50 transition-colors">
                                            {dep.manifest}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Graph Visualization */}
            <div className="glass-panel rounded-2xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">
                        Analyzed Graph Nodes ({deps.nodes.length})
                    </h3>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-400" />
                            <span className="text-[10px] uppercase font-bold text-white/30">High Risk</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400" />
                            <span className="text-[10px] uppercase font-bold text-white/30">Stable</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    {(deps.nodes || []).map((node, i) => {
                        const riskStyle = getRiskColor(node.riskAmplification);
                        const nodeEdges = getNodeEdges(node.id);
                        const isExpanded = selectedNode === node.id;

                        return (
                            <motion.div
                                key={node.id}
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.02 }}
                                className={`rounded-xl border group transition-all duration-300 ${isExpanded ? 'ring-1 ring-white/20' : ''} ${riskStyle.border}`}
                            >
                                <div
                                    className={`p-4 cursor-pointer hover:bg-white/5 transition-all relative ${riskStyle.bg}`}
                                    onClick={() => setSelectedNode(isExpanded ? null : node.id)}
                                >
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex flex-col items-center justify-center border shrink-0 ${riskStyle.border} ${riskStyle.bg}`}>
                                                <span className={`text-sm md:text-base font-black ${riskStyle.text}`}>
                                                    {(node.riskAmplification || 0).toFixed(0)}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-white text-base md:text-lg truncate">
                                                    {node.name}
                                                </div>
                                                <div className="text-[9px] md:text-[10px] text-white/20 font-mono font-medium group-hover:text-white/40 transition-colors uppercase truncate">{node.id}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-8 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5">
                                            <div className="sm:w-20 shrink-0 flex justify-end">
                                                <span className={`text-[8px] px-1.5 py-0.5 rounded-md uppercase font-black tracking-tighter shrink-0 ${node.category === 'internal' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                    {node.category}
                                                </span>
                                            </div>
                                            <div className="text-left sm:text-right sm:w-16 shrink-0">
                                                <div className="text-[9px] uppercase font-bold text-white/20 mb-0.5">Centrality</div>
                                                <div className="text-sm font-black text-white/60">{((node.centrality || 0) * 100).toFixed(0)}%</div>
                                            </div>
                                            <div className="text-left sm:text-right sm:w-16 shrink-0">
                                                <div className="text-[9px] uppercase font-bold text-white/20 mb-0.5">Structural</div>
                                                <div className="text-sm font-black text-white/60">{node.fanIn + node.fanOut}</div>
                                            </div>
                                            <div className="w-6 flex justify-end">
                                                {isExpanded ? <ChevronUp size={18} className="text-white/20 shrink-0" /> : <ChevronDown size={18} className="text-white/20 shrink-0" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-white/5 bg-black/40 overflow-hidden"
                                        >
                                            <div className="p-6 space-y-6">
                                                {/* Risk Detail Grid - Only show metrics with real computed values */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    {/* Always show Dependency Type - always computed */}
                                                    <DetailCard label="Dependency Type" value={node.category} icon={<GitBranch size={14} />} />

                                                    {/* Only show Declared Version if it exists in manifest */}
                                                    {node.version && (
                                                        <DetailCard label="Declared Version" value={node.version} icon={<Code size={14} />} />
                                                    )}

                                                    {/* Only show Version Health for external deps with computed lag */}
                                                    {node.category === 'external' && node.lag && node.lag !== 'unknown' && node.lag !== 'n/a' && (
                                                        <DetailCard
                                                            label="Version Health"
                                                            value={node.lag === 'up-to-date' ? 'Up to Date' : node.lag === 'major-lag' ? 'Major Lag' : 'Minor Lag'}
                                                            status={node.lag === 'up-to-date' ? 'success' : node.lag === 'major-lag' ? 'danger' : 'warning'}
                                                        />
                                                    )}

                                                    {/* Only show Volatility if file was in churn hotspots (non-zero) */}
                                                    {node.volatility > 0 && (
                                                        <DetailCard
                                                            label="Volatility"
                                                            value={`${(node.volatility * 100).toFixed(1)}%`}
                                                            status={node.volatility > 0.3 ? 'danger' : 'success'}
                                                        />
                                                    )}
                                                </div>


                                                {/* Structural Trace */}
                                                <div className="space-y-3">
                                                    <div className="text-[10px] uppercase font-bold text-white/20 tracking-widest flex items-center gap-2">
                                                        <ArrowRight size={12} className="text-white/10" />
                                                        Active Import Analysis ({nodeEdges.length} Traceable Paths)
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {nodeEdges.map((edge, ei) => (
                                                            <div key={ei} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/[0.05] group/edge hover:border-white/10 transition-all">
                                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                                    <div className={`w-1 h-8 rounded-full ${edge.source === node.id ? 'bg-blue-400/30' : 'bg-purple-400/30'}`} />
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-2 font-mono text-[10px]">
                                                                            <span className={edge.source === node.id ? 'text-white/60' : 'text-white/30'}>{edge.source}</span>
                                                                            <ArrowRight size={10} className="text-white/10" />
                                                                            <span className={edge.target === node.id ? 'text-white/60' : 'text-white/30'}>{edge.target}</span>
                                                                        </div>
                                                                        <div className="text-[10px] text-white/20 italic truncate mt-1 group-hover/edge:text-white/40">{edge.importLine}</div>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[9px] font-black text-white/10 uppercase group-hover/edge:text-white/20 px-2">{edge.source === node.id ? 'Outbound' : 'Inbound'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Verification Footer */}
            <div className="flex items-center justify-center gap-4 py-8 opacity-40 hover:opacity-100 transition-opacity">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-[0.2em] text-white/40">
                    <Circle size={6} className="fill-green-500 text-green-500 animate-pulse" />
                    Verified Architectural Signal Extraction
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
            </div>
        </div>
    );
}

function DetailCard({ label, value, icon, status }: { label: string, value: string, icon?: React.ReactNode, status?: 'success' | 'warning' | 'danger' }) {
    const statusColors = {
        success: 'text-green-400',
        warning: 'text-orange-400',
        danger: 'text-red-400'
    };

    return (
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
            <div className="text-[9px] uppercase font-bold text-white/20 mb-2 flex items-center gap-2">
                {icon}
                {label}
            </div>
            <div className={`text-sm font-black uppercase tracking-tight ${status ? statusColors[status] : 'text-white'}`}>
                {value}
            </div>
        </div>
    );
}

function StatCard({ label, value, color, isPercent }: { label: string; value: number; color: 'purple' | 'blue' | 'red' | 'orange', isPercent?: boolean }) {
    const colors = {
        purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
        blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
        red: 'from-red-500/20 to-red-500/5 border-red-500/20 text-red-400',
        orange: 'from-orange-500/20 to-orange-500/5 border-orange-500/20 text-orange-400'
    };

    return (
        <div className={`rounded-2xl p-4 bg-gradient-to-br ${colors[color]} border shrink-0 min-w-0`}>
            <div className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1 truncate">{label}</div>
            <div className="text-2xl md:text-3xl font-black text-white truncate">
                {isPercent ? `${(value * 100).toFixed(1)}%` : value}
            </div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-6 animate-in fade-in duration-500">
            {/* Node graph animation */}
            <div className="relative w-24 h-24">
                {/* Center node */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]" />
                {/* Orbiting nodes */}
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="absolute w-3 h-3 bg-cyan-400 rounded-full"
                        style={{
                            animation: `orbit 3s linear infinite`,
                            animationDelay: `${i * 0.75}s`,
                            top: '50%',
                            left: '50%',
                            transformOrigin: '0 0'
                        }}
                    />
                ))}
                {/* Connection lines */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
                    <div className="absolute top-0 left-1/2 w-px h-1/2 bg-gradient-to-b from-blue-500/0 to-blue-500/50" />
                    <div className="absolute bottom-0 left-1/2 w-px h-1/2 bg-gradient-to-t from-blue-500/0 to-blue-500/50" />
                    <div className="absolute top-1/2 left-0 w-1/2 h-px bg-gradient-to-r from-blue-500/0 to-blue-500/50" />
                    <div className="absolute top-1/2 right-0 w-1/2 h-px bg-gradient-to-l from-blue-500/0 to-blue-500/50" />
                </div>
            </div>
            <style>{`
                @keyframes orbit {
                    0% { transform: rotate(0deg) translateX(40px) rotate(0deg); }
                    100% { transform: rotate(360deg) translateX(40px) rotate(-360deg); }
                }
            `}</style>
            <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-white uppercase tracking-widest">Dependencies</h3>
                <p className="text-sm text-white/40 font-medium">Tracing module connections...</p>
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
                <h3 className="text-xl font-bold text-white mb-2">Dependency Analysis Unavailable</h3>
                <p className="text-sm text-white/40 leading-relaxed">
                    {reason || 'Unable to extract imports from repository source files.'}
                </p>
            </div>
        </div>
    );
}
