import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, Loader2, AlertTriangle } from 'lucide-react';
import AIDisclosure from './AIDisclosure';
import { API_BASE } from '../config';

interface TopologyCluster {
    id: string;
    name: string;
    moduleIds: string[];
    fileCount: number;
    riskIndex: number;
    riskLevel: string;
}

interface TopologyMetrics {
    subDomainsTracked: number;
    regionalRiskIndex: number;
    entropyDensity: string;
    cascadingDebtStatus: string;
    totalModules: number;
    totalEdges: number;
}

interface Props {
    projectId: string;
    clusters: TopologyCluster[];
    metrics: TopologyMetrics;
    moduleCount: number;
    edgeCount: number;
}

interface InterpretationResponse {
    success: boolean;
    interpretation?: string;
    warnings?: string[];
    error?: string;
}

export default function AITopologyReasoning({ projectId, clusters, metrics, moduleCount, edgeCount }: Props) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [interpretation, setInterpretation] = useState<InterpretationResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Check if AI is connected
    const aiProvider = localStorage.getItem('repoanalyst_ai_provider');
    const isAIConnected = !!aiProvider;

    // Don't render if AI is not connected
    if (!isAIConnected) {
        return null;
    }

    const fetchInterpretation = async () => {
        if (hasLoaded) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/ai/topology-interpretation?project=${encodeURIComponent(projectId)}&provider=${aiProvider}`);
            const data = await res.json();
            setInterpretation(data);
            setHasLoaded(true);
        } catch (err) {
            // Fallback to local interpretation on network error
            console.warn('[AITopologyReasoning] API unavailable, using local interpretation');
            setInterpretation({ success: true });
            setHasLoaded(true);
        }
        setLoading(false);
    };

    const handleToggle = () => {
        const newState = !isExpanded;
        setIsExpanded(newState);
        if (newState && !hasLoaded) {
            fetchInterpretation();
        }
    };

    // Generate refined analytical structural reasoning following high-fidelity contract
    const generateLocalReasoning = (): string => {
        const reasoningBlocks: string[] = [];

        // Topology: structural stability, coupling, entropy

        // 1. Domain Decomposition
        reasoningBlocks.push(`${metrics.subDomainsTracked > 4
            ? 'The system architecture reflects a mature, multi-domain decomposition strategy.'
            : 'Operational boundaries show high structural consolidation within limited domain clusters.'} 
Tracking ${metrics.subDomainsTracked} sub-domains provides ${metrics.subDomainsTracked > 2 ? 'clear isolation between core functional areas' : 'a unified but potentially tightly coupled logic surface'}. 
This modularity baseline is critical for localized changes and systemic stability.`);

        // 2. Structural Risk Baseline
        reasoningBlocks.push(`${metrics.regionalRiskIndex >= 60
            ? 'Structural stability is compromised by high aggregate risk across regional domains.'
            : 'The repository maintains a healthy structural baseline with low regional risk intensity.'} 
A risk index of ${metrics.regionalRiskIndex}/100 indicates ${metrics.regionalRiskIndex > 50 ? 'complex cross-domain interlocks' : 'favorable entropy distribution'}. 
Reducing index hotspots would likely improve predictability in downstream modification cycles.`);

        // 3. System Entropy
        reasoningBlocks.push(`${metrics.entropyDensity === 'Low'
            ? 'Low entropy density reflects intentional, balanced code distribution across architectural layers.'
            : 'Elevated entropy signals concentrated complexity and uneven domain distribution.'} 
The ${metrics.entropyDensity.toLowerCase()} entropy profile suggest that ${metrics.entropyDensity === 'High' ? 'specific modules are becoming overloaded containers' : 'functionality is evenly distributed to prevent structural bottlenecks'}. 
Maintaining low entropy ensures that architectural discoverability remains high as the system scales.`);

        // 4. Debt Propagation (Cascading Debt)
        reasoningBlocks.push(`${metrics.cascadingDebtStatus === 'Contained' || metrics.cascadingDebtStatus === 'Stable'
            ? 'Internal technical debt is high-quality and contained within domain boundaries.'
            : 'Active debt propagation suggests that architectural leaks are affecting adjacent domains.'} 
With a status of ${metrics.cascadingDebtStatus}, the system ${metrics.cascadingDebtStatus === 'Active' ? 'risks cascading failures' : 'effectively isolates complexity'} during cross-module updates. 
Strengthening boundaries in active domains will prevent systemic contagion.`);

        // 5. Module Scale & Density
        reasoningBlocks.push(`The topological surface consists of ${moduleCount} modules, defining the base level of system granularity. 
This ${moduleCount > 50 ? 'extensive' : 'controlled'} module count establishes a ${moduleCount > 80 ? 'high-cognitive-load' : 'navigable'} map for maintainers. 
Systemic efficiency is currently ${moduleCount > 100 ? 'strained' : 'balanced'} by the current module density.`);

        // 6. Coupling Intensity (Edges)
        const edgeRatio = moduleCount > 0 ? (edgeCount / moduleCount).toFixed(1) : '0';
        reasoningBlocks.push(`${parseFloat(edgeRatio) > 3.0
            ? 'Dense inter-module connectivity signals high structural coupling and propagation risk.'
            : 'Sparse connectivity indicates a highly decoupled architecture with clean boundaries.'} 
A coupling ratio of ${edgeRatio}x suggests that ${parseFloat(edgeRatio) > 2.5 ? 'dependencies are becoming transitive bottlenecks' : 'interaction patterns remain predictable'}. 
Decoupling efforts should prioritize high-fan-in modules to contain ripple effects.`);

        // 7. Domain Cluster Analysis
        if (clusters.length > 0) {
            const criticalClusters = clusters.filter(c => c.riskLevel === 'Critical' || c.riskLevel === 'High');
            const dominantCluster = clusters.length >= 2
                ? clusters.reduce((a, b) => a.fileCount > b.fileCount ? a : b)
                : null;
            const totalFiles = clusters.reduce((sum, c) => sum + c.fileCount, 0);
            const dominanceRatio = (dominantCluster && totalFiles > 0) ? (dominantCluster.fileCount / totalFiles) * 100 : 0;

            reasoningBlocks.push(`${criticalClusters.length > 0
                ? `High-risk hotspots are localized within ${criticalClusters.length} domain clusters.`
                : 'Structural health is uniformly distributed across all identified domain clusters.'} 
${dominantCluster && dominanceRatio > 40 ? `The ${dominantCluster.name} cluster exhibits architectural dominance (${dominanceRatio.toFixed(0)}% concentration)` : 'Domain clusters maintain balanced size and influence'}. 
Refining ${criticalClusters.length > 0 ? 'high-risk borders' : 'cluster interfaces'} will ensure long-term structural resilience.`);
        }

        return reasoningBlocks.join('\n\n');
    };

    return (
        <div className="glass-panel rounded-2xl border border-purple-500/20 overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between p-4 md:p-6 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <Brain size={18} className="text-purple-400" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Structural Reasoning</h3>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">
                            Powered by {aiProvider?.toUpperCase()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {loading && <Loader2 size={14} className="text-purple-400 animate-spin" />}
                    {isExpanded ? (
                        <ChevronUp size={18} className="text-white/40" />
                    ) : (
                        <ChevronDown size={18} className="text-white/40" />
                    )}
                </div>
            </button>

            {/* Content - Collapsible */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 md:px-6 pb-6 pt-2 border-t border-white/5">
                            {loading ? (
                                <div className="flex items-center justify-center py-8 gap-3">
                                    <Loader2 size={20} className="text-purple-400 animate-spin" />
                                    <span className="text-sm text-white/40">Analyzing topology structure...</span>
                                </div>
                            ) : interpretation?.error ? (
                                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                                    <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-400">{interpretation.error}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Contract-compliant AI disclosure */}
                                    <AIDisclosure provider={aiProvider || ''} />

                                    {/* Interpretation content */}
                                    <div className="prose prose-invert prose-sm max-w-none">
                                        <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                                            {interpretation?.interpretation || generateLocalReasoning()}
                                        </div>
                                    </div>

                                    {/* Warnings for incomplete data */}
                                    {interpretation?.warnings && interpretation.warnings.length > 0 && (
                                        <div className="space-y-2 pt-4 border-t border-white/5">
                                            <div className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Data Limitations</div>
                                            {interpretation.warnings.map((warning, i) => (
                                                <div key={i} className="flex items-start gap-2">
                                                    <AlertTriangle size={12} className="text-yellow-500/50 shrink-0 mt-0.5" />
                                                    <span className="text-xs text-white/40">{warning}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
