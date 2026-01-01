import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, Loader2, AlertTriangle } from 'lucide-react';
import AIDisclosure, { AIDataLimitation, AISilence } from './AIDisclosure';
import { API_BASE } from '../config';

interface AnalysisMetrics {
    activityScore: number;
    stalenessScore: number;
    teamRiskScore: number;
    contributorCount: number;
    dependencyCount: number;
    fileCount: number;
    directoryCount: number;
    commitsLast30Days: number;
    commitsTrend: string;
    repoAgeMonths: number;
    daysSinceLastPush: number;
    docDrift?: {
        available: boolean;
        classification: string;
        driftRatio: number;
        temporalOffset: number;
    };
    volatility?: {
        available: boolean;
        classification: string;
        volatilityScore: number;
    };
    structuralDepth?: {
        available: boolean;
        maxDepth: number;
        structureStatus: string;
    };
}

interface Props {
    projectId: string;
    metrics: AnalysisMetrics;
    repoName: string;
    language: string;
}

interface InterpretationResponse {
    success: boolean;
    interpretation?: string;
    warnings?: string[];
    error?: string;
}

export default function AIAnalysisInterpretation({ projectId, metrics, repoName, language }: Props) {
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
            const res = await fetch(`${API_BASE}/api/ai/analysis-interpretation?project=${encodeURIComponent(projectId)}&provider=${aiProvider}`);
            const data = await res.json();
            setInterpretation(data);
            setHasLoaded(true);
        } catch (err) {
            // Fallback to local interpretation on network error
            console.warn('[AIAnalysisInterpretation] API unavailable, using local interpretation');
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

    // Generate refined analytical interpretation following high-fidelity contract
    const generateLocalInterpretation = (): string => {
        const interpretationBlocks: string[] = [];

        // Analysis: systemic patterns, alignment, imbalance

        // 1. Activity & Pulse
        interpretationBlocks.push(`${metrics.activityScore >= 7
            ? 'Development velocity shows high systemic alignment with recent delivery patterns.'
            : 'Activity patterns indicate a shift toward maintenance or lifecycle stabilization.'} 
Current commit frequency (${metrics.activityScore}/10) reflects ${metrics.activityScore >= 7 ? 'sustained engineering momentum' : 'reduced operational pulse'}. 
This cadence indicates ${metrics.activityScore >= 7 ? 'active feature expansion' : 'consistent but low-impact throughput'} within the observed window.`);

        // 2. Engagement Latency
        interpretationBlocks.push(`${metrics.daysSinceLastPush <= 7
            ? 'The system maintains a tight feedback loop with real-time operational engagement.'
            : 'Engagement latency is increasing as the system enters a dormant state.'} 
With the last push occurring ${metrics.daysSinceLastPush} days ago, the repository maintains ${metrics.daysSinceLastPush <= 14 ? 'high responsiveness' : 'extended latency'} relative to average change cycles. 
Continued dormancy may signal a transition into a preservation or archive state.`);

        // 3. Contributor Distribution
        interpretationBlocks.push(`${metrics.teamRiskScore <= 30
            ? 'Organizational knowledge is broadly distributed across a heterogeneous contributor base.'
            : 'High team concentration indicates significant structural knowledge imbalance.'} 
A risk score of ${metrics.teamRiskScore}/100 suggests that ${metrics.teamRiskScore >= 60 ? 'critical paths rely on limited expertise' : 'contribution diversity mitigates individual dependency risks'}. 
This distribution ensures that ${metrics.teamRiskScore <= 40 ? 'systemic resilience is high' : 'continuity depends heavily on a core contributor subset'}.`);

        // 4. Team Scale
        interpretationBlocks.push(`${metrics.contributorCount > 3
            ? `A diverse cohort of ${metrics.contributorCount} contributors provides varied perspective and review depth.`
            : `System ownership is concentrated within a small core team of ${metrics.contributorCount}.`} 
This scale allows for ${metrics.contributorCount > 5 ? 'distributed feature ownership' : 'unified but high-risk architectural control'}. 
Expanding the contributor base would likely improve review coverage and reduce bus-factor fragility.`);

        // 5. External Exposure (Dependencies)
        interpretationBlocks.push(`${metrics.dependencyCount <= 15
            ? 'Minimal external exposure reduces supply-chain surface area and maintenance pressure.'
            : 'Extensive dependency footprint increases systemic exposure to external volatility.'} 
The inclusion of ${metrics.dependencyCount} external packages introduces ${metrics.dependencyCount > 40 ? 'significant' : 'manageable'} secondary risk factors. 
Future stabilization should prioritize containment of transitive dependencies.`);

        // 6. Volumetric Structure
        interpretationBlocks.push(`The codebase structure shows an ${metrics.fileCount / (metrics.directoryCount || 1) > 10 ? 'unbalanced' : 'aligned'} distribution across ${metrics.fileCount} files and ${metrics.directoryCount} directories. 
Navigation complexity scales with this ${metrics.fileCount > 200 ? 'substantial' : 'compact'} density, requiring disciplined architectural conventions. 
Increased modularity may be required if file-to-directory ratios continue to diverge.`);

        // 7. Recent Momentum
        interpretationBlocks.push(`${metrics.commitsLast30Days > 20
            ? 'High momentum in the recent cycle indicates a period of intense structural evolution.'
            : 'Low recent volume suggests a deceleration in systemic changes.'} 
The ${metrics.commitsTrend} trend across ${metrics.commitsLast30Days} commits confirms ${metrics.commitsTrend === 'accelerating' ? 'increasing velocity' : 'a stabilizing pulse'}. 
This momentum signals ${metrics.commitsLast30Days > 50 ? 'imminent release pressure' : 'controlled iteration cycles'}.`);

        // 8. Lifecycle Maturity
        interpretationBlocks.push(`Repository maturity reflects ${metrics.repoAgeMonths} months of evolution, establishing stable behavioral baselines. 
Patterns observed are representative of ${metrics.repoAgeMonths >= 24 ? 'long-term institutional debt' : 'established development norms'}. 
Lifecycle stability implies that current metrics accurately reflect the system's operational equilibrium.`);

        // 9. Documentation Alignment
        if (metrics.docDrift?.available) {
            interpretationBlocks.push(`${metrics.docDrift.classification === 'Synchronous'
                ? 'Documentation and code evolution show high systemic alignment.'
                : 'Documentation drift indicates a growing imbalance between specification and implementation.'} 
The average offset of ${metrics.docDrift.temporalOffset.toFixed(1)} days suggests ${metrics.docDrift.classification === 'Code-leading' ? 'rapid implementation outpacing documentation' : 'disciplined specification tracking'}. 
Mitigating this drift is critical for maintaining systemic discoverability.`);
        }

        // 10. Change Volatility
        if (metrics.volatility?.available) {
            interpretationBlocks.push(`${metrics.volatility.volatilityScore < 0.3
                ? 'Systemic volatility remains within acceptable thresholds for stable operation.'
                : 'Elevated volatility signals high internal churn and potential structural instability.'} 
A volatility score of ${metrics.volatility.volatilityScore.toFixed(2)} indicates ${metrics.volatility.volatilityScore > 0.6 ? 'unstable' : 'controlled'} modification patterns. 
Persistently high volatility may herald imminent regression risk in core paths.`);
        }

        // 11. Architectural Depth
        if (metrics.structuralDepth?.available) {
            interpretationBlocks.push(`Structural depth (${metrics.structuralDepth.maxDepth}) reveals an ${metrics.structuralDepth.maxDepth > 5 ? 'extended' : 'efficient'} hierarchy of modules and logic. 
This depth contributes to ${metrics.structuralDepth.maxDepth > 4 ? 'increased cognitive load' : 'clear separation of concerns'} during architectural review. 
Streamlining deep hierarchies would reduce implementation complexity and downstream maintenance pressure.`);
        }

        return interpretationBlocks.join('\n\n');
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
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">AI Interpretation</h3>
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
                                    <span className="text-sm text-white/40">Analyzing metrics...</span>
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
                                            {interpretation?.interpretation || generateLocalInterpretation()}
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
