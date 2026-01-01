import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, Loader2, AlertTriangle } from 'lucide-react';
import AIDisclosure from './AIDisclosure';
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

interface TrajectoryData {
    velocityTrend: string;
    velocityFactor: number;
    overallTrend: string;
    confidenceLevel: string;
    totalWeeks: number;
    peakRiskWeek?: string;
    peakRiskScore: number;
    snapshots: TrajectorySnapshot[];
}

interface Props {
    projectId: string;
    trajectory: TrajectoryData;
}

interface InterpretationResponse {
    success: boolean;
    interpretation?: string;
    warnings?: string[];
    error?: string;
}

export default function AITrajectoryInterpretation({ projectId, trajectory }: Props) {
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
            const res = await fetch(`${API_BASE}/api/ai/trajectory-interpretation?project=${encodeURIComponent(projectId)}&provider=${aiProvider}`);
            const data = await res.json();
            setInterpretation(data);
            setHasLoaded(true);
        } catch (err) {
            // Fallback to local interpretation on network error
            console.warn('[AITrajectoryInterpretation] API unavailable, using local interpretation');
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

    // Generate refined analytical trajectory interpretation following high-fidelity contract
    const generateLocalInterpretation = (): string => {
        const interpretationBlocks: string[] = [];
        const { velocityTrend, velocityFactor, overallTrend, confidenceLevel, totalWeeks, peakRiskWeek, peakRiskScore, snapshots } = trajectory;

        // Trajectory: direction, momentum, inflection

        // 1. Structural Direction
        interpretationBlocks.push(`${overallTrend === 'increasing_risk'
            ? 'The system trajectory indicates an aggressive upward inflection in aggregate risk density.'
            : overallTrend === 'decreasing_risk'
                ? 'Systemic risk shows a sustained downward trajectory, reflecting effective consolidation.'
                : 'The structural evolution remains in a state of controlled equilibrium.'} 
A ${overallTrend?.replace('_', ' ')} trend suggest that ${overallTrend === 'increasing_risk' ? 'complexity accumulation is outpacing mitigation' : 'debt reduction efforts are successfully yielding structural gains'}. 
Maintaining this direction will define the long-term reliability profile of the repository.`);

        // 2. Momentum & Velocity
        interpretationBlocks.push(`${velocityFactor > 1.5
            ? 'Engineering momentum has reached high-velocity acceleration thresholds.'
            : velocityFactor < 0.8
                ? 'Operational momentum is decelerating, shifting focus toward late-lifecycle stability.'
                : 'Change velocity maintains a consistent, sustainable heartbeat across the timeline.'} 
A ${velocityTrend.toLowerCase()} pulse (${velocityFactor?.toFixed(1) || '1.0'}x) confirms ${velocityFactor > 1.2 ? 'intense feature expansion' : 'controlled iteration cycles'}. 
Sustained ${velocityTrend.toLowerCase()} momentum may require future capacity adjustments to preserve review quality.`);

        // 3. Analysis Confidence
        interpretationBlocks.push(`${confidenceLevel === 'High'
            ? 'High-fidelity observation data provides a stable baseline for predictive modeling.'
            : 'Confidence levels are currently dampened by sparse or irregular data signals.'} 
Trend reliability is classified as ${confidenceLevel.toLowerCase()}, reflecting the ${confidenceLevel === 'High' ? 'abundance' : 'emergent nature'} of the current snapshot history. 
Increased observation density will further refine these trajectory projections.`);

        // 4. Observation Depth
        interpretationBlocks.push(`The analysis window encompasses ${totalWeeks} weeks of historical evolution, capturing ${totalWeeks > 8 ? 'multiple release' : 'early establishment'} cycles. 
This depth provides ${totalWeeks > 12 ? 'deep systemic context' : 'initial visibility'} into long-term behavioral norms. 
Extended observation is recommended to differentiate between transient noise and structural drift.`);

        // 5. Risk Inflection (Peak Risk)
        if (peakRiskScore > 0) {
            const recentSnapshots = snapshots?.slice(-4) || [];
            const currentRisk = recentSnapshots.length > 0 ? recentSnapshots[recentSnapshots.length - 1]?.riskScore || 0 : 0;
            const recoveryRatio = peakRiskScore > 0 ? currentRisk / peakRiskScore : 1;

            interpretationBlocks.push(`${recoveryRatio > 0.8
                ? 'The system remains pinned near peak risk thresholds, showing limited structural recovery.'
                : 'Risk peaks have subsided significantly, signaling a successful return to delta baseline.'} 
A recorded peak of ${peakRiskScore.toFixed(0)} (week ${peakRiskWeek || 'N/A'}) represents the ${recoveryRatio > 0.9 ? 'current plateau' : 'historical maximum'} for this system. 
Preventing recurrence of this inflection point is critical for structural preservation.`);
        }

        // 6. Churn Intensity
        if (snapshots && snapshots.length >= 4) {
            const recentChurn = snapshots.slice(-4).reduce((sum, s) => sum + (s.churnScore || 0), 0) / 4;
            const earlierChurn = snapshots.slice(0, Math.min(4, snapshots.length)).reduce((sum, s) => sum + (s.churnScore || 0), 0) / Math.min(4, snapshots.length);
            const churnRatio = earlierChurn > 0 ? recentChurn / earlierChurn : 1;

            interpretationBlocks.push(`${churnRatio > 1.5
                ? 'Modification churn is accelerating relative to historical baseline norms.'
                : 'Churn intensity has stabilized, reflecting a transition to controlled modifications.'} 
The current pulse (${recentChurn.toFixed(0)}) represents a ${churnRatio.toFixed(1)}x shift in structural modification pressure. 
Monitoring churn spikes will detect early signs of architectural fragmentation.`);
        }

        // 7. Delta Volatility
        if (snapshots && snapshots.length >= 3) {
            const deltas = snapshots.map(s => s.riskDelta || 0);
            const avgDelta = deltas.reduce((sum, d) => sum + Math.abs(d), 0) / deltas.length;
            const maxDelta = Math.max(...deltas.map(d => Math.abs(d)));

            interpretationBlocks.push(`${maxDelta > 25
                ? 'Elevated delta volatility signals a high-frequency alternating development focus.'
                : 'Delta volatility remain within predictable bounds for synchronous evolution.'} 
Fluctuations average ${avgDelta.toFixed(1)} units per cycle, peaking at ${maxDelta.toFixed(0)}. 
Stabilizing these swings will improve systemic predictability and maintenance planning.`);
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
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Predictive Interpretation</h3>
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
                                    <span className="text-sm text-white/40">Analyzing trajectory patterns...</span>
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

                                    {/* Warnings for sparse data */}
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
