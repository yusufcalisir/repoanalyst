import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, Loader2, AlertTriangle } from 'lucide-react';
import AIDisclosure from './AIDisclosure';
import { API_BASE } from '../config';

interface DependencyNode {
    id: string;
    name: string;
    category: 'internal' | 'external';
    volatility: number;
    riskAmplification: number;
    fanIn: number;
    fanOut: number;
    centrality: number;
    isCyclic: boolean;
}

interface ManifestDependency {
    name: string;
    versionHealth: 'up-to-date' | 'minor-lag' | 'major-lag' | 'unknown';
    type: 'production' | 'development' | 'optional';
}

interface DependencyData {
    nodes: DependencyNode[];
    totalNodes: number;
    totalEdges: number;
    cyclicNodes: number;
    highRiskNodes?: string[];
    maxFanIn: number;
}

interface Props {
    projectId: string;
    deps: DependencyData;
    manifestDeps: ManifestDependency[];
}

interface InterpretationResponse {
    success: boolean;
    interpretation?: string;
    warnings?: string[];
    error?: string;
}

export default function AIDependencyReasoning({ projectId, deps, manifestDeps }: Props) {
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
            const res = await fetch(`${API_BASE}/api/ai/dependency-interpretation?project=${encodeURIComponent(projectId)}&provider=${aiProvider}`);
            const data = await res.json();
            setInterpretation(data);
            setHasLoaded(true);
        } catch (err) {
            // Fallback to local interpretation on network error
            console.warn('[AIDependencyReasoning] API unavailable, using local interpretation');
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

    // Generate refined analytical dependency reasoning following high-fidelity contract
    const generateLocalReasoning = (): string => {
        const reasoningBlocks: string[] = [];
        const { nodes, cyclicNodes, totalEdges } = deps;

        // Dependencies: exposure, maintenance pressure, volatility

        const avgCentrality = nodes.length > 0
            ? nodes.reduce((sum, n) => sum + n.centrality, 0) / nodes.length
            : 0;

        // 1. Dependency Surface Area
        reasoningBlocks.push(`${nodes.length > 50
            ? 'The system dependency surface area exhibits high structural complexity.'
            : 'Operational dependencies are maintained within a compact, navigable surface area.'} 
Tracking ${nodes.length} nodes identifies ${nodes.length > 100 ? 'substantial' : 'manageable'} inter-module exposure. 
This surface area determines the cognitive overhead required for systemic architectural reviews.`);

        // 2. Connectivity Pulse (Edges)
        const avgConnections = nodes.length > 0 ? (totalEdges / nodes.length).toFixed(1) : '0';
        reasoningBlocks.push(`${parseFloat(avgConnections) > 3.0
            ? 'Dense internal connectivity signals high maintenance pressure and coupling volatility.'
            : 'Sparse connection patterns reflect a highly decoupled internal module structure.'} 
An average of ${avgConnections} edges per node suggests that ${parseFloat(avgConnections) > 2.5 ? 'dependencies are becoming transitive bottlenecks' : 'interaction patterns remain predictable'}. 
Reducing these connections will lower the ripple effect during core logic modifications.`);

        // 3. Centralization & Hierarchy
        const centralityPercent = ((avgCentrality || 0) * 100).toFixed(1);
        reasoningBlocks.push(`${avgCentrality > 0.15
            ? 'Structural hierarchy is heavily centralized around specific hub nodes.'
            : 'Systemic organization remains relatively flat, distributing influence across the graph.'} 
Average centrality (${centralityPercent}%) indicates ${avgCentrality > 0.1 ? 'concentrated structural reliance' : 'balanced knowledge distribution'}. 
Stability in these central nodes is critical for maintaining overall system availability.`);

        // 4. Structural Interlock (Cycles)
        const cyclicPercent = nodes.length > 0 ? Math.round((cyclicNodes / nodes.length) * 100) : 0;
        reasoningBlocks.push(`${cyclicNodes === 0
            ? 'Unidirectional dependency flow ensures predictable change propagation and containment.'
            : 'Cyclic dependencies introduce structural interlocks that amplify modification risk.'} 
A recorded ${cyclicPercent}% cyclic link density suggests ${cyclicNodes > 2 ? 'emergent architectural debt' : 'localized bidirectional coupling'}. 
Breaking these cycles will improve the system's ability to undergo isolated refactors.`);

        // 5. Anchorage Analysis
        const anchors = nodes.filter(n => n.centrality >= 0.2 || n.fanIn >= 5);
        reasoningBlocks.push(`${anchors.length > 0
            ? `Critical structural anchors have been identified within ${anchors.length} key modules.`
            : 'The system lacks dominant anchorage points, favoring a decentralized dependency map.'} 
${anchors.length > 0 ? `Nodes such as ${anchors.slice(0, 2).map(n => n.name).join(' and ')} anchor the dependency graph` : 'Dependency influence is evenly distributed'}. 
Architectural shifts within these anchors will have amplified consequences for downstream paths.`);

        // 6. Volatility & Churn
        const volatileNodes = nodes.filter(n => n.volatility > 0.3);
        reasoningBlocks.push(`${volatileNodes.length > 0
            ? 'High-volatility segments indicate active development churn in core dependencies.'
            : 'Dependency volatility is currently low, reflecting stable maintenance cycles.'} 
Tracking ${volatileNodes.length} volatile nodes identifies areas of ${volatileNodes.length > 5 ? 'high frequency change' : 'controlled iteration'}. 
High volatility in central nodes compounds systemic risk and should be monitored for drift.`);

        // 7. External Supply Chain (Manifest)
        if (manifestDeps.length > 0) {
            const majorLag = manifestDeps.filter(d => d.versionHealth === 'major-lag');
            reasoningBlocks.push(`${majorLag.length === 0
                ? 'The external supply chain remains current with minimal version lag recorded.'
                : 'External maintenance pressure is increasing due to accumulated version lag.'} 
Analysis of ${manifestDeps.length} manifest items shows ${majorLag.length} modules require ${majorLag.length > 3 ? 'urgent' : 'routine'} updates. 
Proactive version management is critical for containing transitive security and stability risks.`);
        }

        // 8. Risk Amplification
        const highRisk = nodes.filter(n => n.riskAmplification >= 50);
        reasoningBlocks.push(`${highRisk.length > 0
            ? 'Risk amplification is concentrated within specific structural amplifiers.'
            : 'Systemic risk remains evenly distributed across the dependency graph.'} 
Tracking ${highRisk.length} high-amplification nodes identifies paths where ${highRisk.length > 2 ? 'failure consequences are significant' : 'impact is well-understood'}. 
Containing risk within these nodes prevents broad-scale instability during modification.`);

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
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Dependency Decision Support</h3>
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
                                    <span className="text-sm text-white/40">Analyzing dependency patterns...</span>
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

                                    {/* Warnings for missing data */}
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
