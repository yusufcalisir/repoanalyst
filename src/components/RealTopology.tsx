import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Map, AlertCircle, Box, GitBranch, TrendingUp, Activity, Loader2 } from 'lucide-react';
import ProjectContextHeader from './ProjectContextHeader';

import { API_BASE } from '../config';

interface TopologyModule {
    id: string;
    name: string;
    path: string;
    fileCount: number;
    language: string;
    dependsOn: string[];
    dependedBy: string[];
    fanOut: number;
    fanIn: number;
}

interface TopologyCluster {
    id: string;
    name: string;
    moduleIds: string[];
    fileCount: number;
    riskIndex: number;
    riskLevel: string;
}

interface TopologyEdge {
    source: string;
    target: string;
    weight: number;
}

interface TopologyMetrics {
    subDomainsTracked: number;
    regionalRiskIndex: number;
    entropyDensity: string;
    cascadingDebtStatus: string;
    totalModules: number;
    totalEdges: number;
}

interface TopologyAnalysis {
    available: boolean;
    reason?: string;
    modules: TopologyModule[];
    clusters: TopologyCluster[];
    edges: TopologyEdge[];
    metrics: TopologyMetrics;
}

const riskColors = {
    low: 'bg-green-500/20 border-green-500/30 text-green-400',
    medium: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    high: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
    critical: 'bg-red-500/20 border-red-500/30 text-red-400',
};

const languageColors: Record<string, string> = {
    Python: 'bg-green-500',
    JavaScript: 'bg-yellow-500',
    TypeScript: 'bg-blue-500',
    Go: 'bg-cyan-500',
    Java: 'bg-red-500',
    Rust: 'bg-orange-500',
    Ruby: 'bg-red-400',
    PHP: 'bg-indigo-500',
    'C/C++': 'bg-gray-500',
    'C#': 'bg-purple-500',
    Other: 'bg-gray-400',
};

interface Props {
    projectId: string;
    onLoadingChange?: (loading: boolean) => void;
}

export default function RealTopology({ projectId, onLoadingChange }: Props) {
    const [topology, setTopology] = useState<TopologyAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

    useEffect(() => {
        fetchTopology();
    }, [projectId]); // Re-fetch when projectId changes

    const fetchTopology = async () => {
        // Reset state to prevent stale data
        setTopology(null);
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/topology`);
            const data = await res.json();
            console.log('[RealTopology] Data for project:', projectId, data);

            // CRITICAL: Validate response matches expected project
            if (data.projectFullName && data.projectFullName !== projectId) {
                console.warn(`[RealTopology] Project mismatch: expected ${projectId}, got ${data.projectFullName}. Retrying...`);
                setTimeout(() => fetchTopology(), 300);
                return;
            }

            setTopology(data);
            setError('');
        } catch (err) {
            setError('Failed to fetch topology');
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-6 animate-in fade-in duration-500">
                {/* Folder tree structure animation */}
                <div className="relative">
                    {/* Animated folder structure */}
                    <div className="flex flex-col gap-1">
                        {/* Root */}
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-teal-500 rounded-sm animate-pulse" />
                            <div className="w-16 h-2 bg-white/20 rounded" />
                        </div>
                        {/* Children - staggered reveal */}
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-2 ml-6" style={{ animation: `fadeSlideIn 1s ease-out infinite`, animationDelay: `${i * 300}ms` }}>
                                <div className="w-px h-4 bg-teal-500/30" />
                                <div className="w-3 h-3 bg-teal-400/50 rounded-sm" />
                                <div className="h-2 bg-white/10 rounded" style={{ width: `${40 + i * 15}px` }} />
                            </div>
                        ))}
                        {/* Grandchildren */}
                        {[1, 2].map((i) => (
                            <div key={`gc-${i}`} className="flex items-center gap-2 ml-12" style={{ animation: `fadeSlideIn 1s ease-out infinite`, animationDelay: `${(i + 3) * 300}ms` }}>
                                <div className="w-px h-3 bg-teal-500/20" />
                                <div className="w-2 h-2 bg-teal-300/30 rounded-sm" />
                                <div className="h-1.5 bg-white/5 rounded" style={{ width: `${30 + i * 10}px` }} />
                            </div>
                        ))}
                    </div>
                </div>
                <style>{`
                    @keyframes fadeSlideIn {
                        0%, 100% { opacity: 0.3; transform: translateX(-5px); }
                        50% { opacity: 1; transform: translateX(0); }
                    }
                `}</style>
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest">System Topology</h3>
                    <p className="text-sm text-white/40 font-medium">Mapping directory structure...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-4">
                <AlertCircle size={48} className="text-red-400" />
                <div className="text-muted">{error}</div>
            </div>
        );
    }

    if (!topology || !topology.available) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-4">
                <Map size={48} className="text-muted" />
                <div className="text-muted text-center">
                    <p className="font-bold">Topology Unavailable</p>
                    <p className="text-sm mt-2">{topology?.reason || 'Unable to analyze system structure'}</p>
                </div>
            </div>
        );
    }

    const modules = topology.modules || [];
    const clusters = topology.clusters || [];
    const edges = topology.edges || [];
    const metrics = topology.metrics || {
        subDomainsTracked: 0,
        regionalRiskIndex: 0,
        entropyDensity: 'Unknown',
        cascadingDebtStatus: 'Unknown',
        totalModules: 0,
        totalEdges: 0
    };

    return (
        <div className="space-y-8 max-w-[1600px] mx-auto w-full px-4 md:px-6">
            <ProjectContextHeader title="System Topology" projectId={projectId} />

            {/* Inferred Context Description */}
            <div className="glass-panel rounded-2xl p-4 md:p-6 border border-white/5">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/20 shrink-0">
                        <Map size={24} className="text-blue-400" />
                    </div>
                    <p className="text-[10px] md:text-sm text-white/40 leading-relaxed italic">
                        Derived from real repository structure. Modules represent top-level directories,
                        clusters group modules by language, and metrics are deterministically calculated.
                    </p>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <MetricCard
                    label="Sub-Domains"
                    value={metrics.subDomainsTracked.toString()}
                    description="Clustered"
                    color="blue"
                />
                <MetricCard
                    label="Risk Index"
                    value={(metrics.regionalRiskIndex || 0).toFixed(0)}
                    description="Avg index"
                    color={(metrics.regionalRiskIndex || 0) >= 75 ? 'red' : (metrics.regionalRiskIndex || 0) >= 50 ? 'yellow' : 'green'}
                />
                <MetricCard
                    label="Entropy"
                    value={metrics.entropyDensity || 'Low'}
                    description="Distribution"
                    color={metrics.entropyDensity === 'High' ? 'red' : metrics.entropyDensity === 'Medium' ? 'yellow' : 'green'}
                />
                <MetricCard
                    label="Debt Status"
                    value={metrics.cascadingDebtStatus || 'Stable'}
                    description="Propagation"
                    color={metrics.cascadingDebtStatus === 'Active' ? 'red' : metrics.cascadingDebtStatus === 'Neutral' ? 'yellow' : 'green'}
                />
            </div>


            {/* Clusters */}
            <div className="glass-panel rounded-2xl p-6">
                <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                    <Box size={18} />
                    Domain Clusters
                    <span className="text-xs font-normal text-muted">({clusters.length} detected)</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clusters.map((cluster, i) => (
                        <motion.div
                            key={cluster.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`p-4 rounded-xl border ${riskColors[cluster.riskLevel as keyof typeof riskColors] || riskColors.medium}`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${languageColors[cluster.name] || languageColors.Other}`} />
                                    <span className="font-bold text-white">{cluster.name}</span>
                                </div>
                                <span className="text-xs uppercase font-bold">{cluster.riskLevel}</span>
                            </div>
                            <div className="space-y-1 text-xs text-muted">
                                <div className="flex justify-between">
                                    <span>Modules:</span>
                                    <span className="text-white font-bold">{cluster.moduleIds.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Files:</span>
                                    <span className="text-white font-bold">{cluster.fileCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Risk Index:</span>
                                    <span className="text-white font-bold">{cluster.riskIndex.toFixed(0)}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Modules */}
            <div className="glass-panel rounded-2xl p-6">
                <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                    <GitBranch size={18} />
                    Detected Modules
                    <span className="text-xs font-normal text-muted">({modules.length} top-level directories)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {modules.slice(0, 16).map((mod, i) => (
                        <motion.div
                            key={mod.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className="p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`w-2 h-2 rounded-full ${languageColors[mod.language] || languageColors.Other}`} />
                                <span className="font-mono text-sm text-white truncate">{mod.name}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted">
                                <span>{mod.fileCount} files</span>
                                <span>{mod.language}</span>
                            </div>
                            {(mod.fanIn > 0 || mod.fanOut > 0) && (
                                <div className="flex justify-between text-xs text-muted mt-1 pt-1 border-t border-white/10">
                                    <span>In: {mod.fanIn}</span>
                                    <span>Out: {mod.fanOut}</span>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
                {modules.length > 16 && (
                    <div className="text-center mt-4 text-xs text-muted">
                        +{modules.length - 16} more modules
                    </div>
                )}
            </div>

            {/* Dependencies */}
            {edges.length > 0 && (
                <div className="glass-panel rounded-2xl p-6">
                    <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                        <Activity size={18} />
                        Inferred Dependencies
                        <span className="text-xs font-normal text-muted">({edges.length} edges)</span>
                    </h3>
                    <div className="space-y-2">
                        {edges.slice(0, 10).map((edge, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm">
                                <span className="font-mono text-green-400 bg-green-400/10 px-2 py-1 rounded">{edge.source}</span>
                                <span className="text-muted">→</span>
                                <span className="font-mono text-blue-400 bg-blue-400/10 px-2 py-1 rounded">{edge.target}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Data Source */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Topology derived from repository file tree • All data is real
            </div>
        </div>
    );
}

function MetricCard({
    label,
    value,
    description,
    color
}: {
    label: string;
    value: string;
    description: string;
    color: 'blue' | 'green' | 'red' | 'yellow';
}) {
    const colors = {
        blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
        green: 'from-green-500/20 to-green-500/5 border-green-500/20',
        red: 'from-red-500/20 to-red-500/5 border-red-500/20',
        yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20'
    };

    return (
        <div className={`rounded-xl p-3 md:p-4 bg-gradient-to-br ${colors[color]} border min-w-0`}>
            <div className="text-[10px] text-muted uppercase tracking-wider font-bold mb-2 truncate">{label}</div>
            <div className="text-xl md:text-2xl font-black text-white truncate">{value}</div>
            <div className="text-[10px] text-muted mt-1 truncate">{description}</div>
        </div>
    );
}
