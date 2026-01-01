import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, Loader2, AlertTriangle } from 'lucide-react';
import AIDisclosure from './AIDisclosure';
import { API_BASE } from '../config';

interface ImpactUnit {
    name: string;
    fileCount: number;
    fragilityScore: number;
    exposureScope: string;
    blastRadius: number;
    trend: string;
    fanIn: number;
    fanOut: number;
    isCyclic: boolean;
}

interface ImpactData {
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
    impact: ImpactData;
}

interface InterpretationResponse {
    success: boolean;
    interpretation?: string;
    warnings?: string[];
    error?: string;
}

export default function AIImpactReasoning({ projectId, impact }: Props) {
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
            const res = await fetch(`${API_BASE}/api/ai/impact-interpretation?project=${encodeURIComponent(projectId)}&provider=${aiProvider}`);
            const data = await res.json();
            setInterpretation(data);
            setHasLoaded(true);
        } catch (err) {
            // Fallback to local interpretation on network error
            console.warn('[AIImpactReasoning] API unavailable, using local interpretation');
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

    // Generate refined analytical impact reasoning following high-fidelity contract
    const generateLocalReasoning = (): string => {
        const reasoningBlocks: string[] = [];
        const { impactUnits, criticalCount, highCount, mediumCount, lowCount, mostFragile, largestBlast } = impact;

        // Impact Surface: blast radius, amplification, containment

        // 1. Structural Fragility (Critical/High)
        reasoningBlocks.push(`${criticalCount + highCount > 0
            ? 'The system exhibits significant fragility hotspots within core architectural units.'
            : 'Structural stability is robustly maintained across all high-value modules.'} 
Identification of ${criticalCount} critical and ${highCount} high-fragility units signals ${criticalCount > 2 ? 'systemic vulnerability' : 'localized pressure points'}. 
Targeted containment of these fragile surfaces is required to prevent downstream amplification of structural debt.`);

        // 2. Baseline Stability (Medium/Low)
        reasoningBlocks.push(`${lowCount > impactUnits.length / 2
            ? 'A stable operational baseline is established by a majority of low-fragility components.'
            : 'The structural foundation is increasingly strained by emerging medium-tier complexity.'} 
With ${mediumCount} medium and ${lowCount} low-fragility units, the repository ${lowCount > 5 ? 'effectively anchors changes' : 'lacks a sufficiently stable core'}. 
Expanding this low-fragility surface will improve systemic resilience against rapid modification cycles.`);

        // 3. Focal Point: Fragility (Most Fragile)
        if (mostFragile) {
            const fragileUnit = impactUnits.find(u => u.name === mostFragile);
            reasoningBlocks.push(`${mostFragile} represents the primary structural pressure point within the current impact surface. 
This unit exhibits ${fragileUnit ? `a fragility score of ${fragileUnit.fragilityScore.toFixed(0)}%` : 'elevated modification churn'}, making it a prime candidate for refactoring. 
Changes in this proximity require exhaustive validation to prevent unintended breakage.`);
        }

        // 4. Focal Point: Blast Radius (Largest Blast)
        if (largestBlast) {
            const blastUnit = impactUnits.find(u => u.name === largestBlast);
            reasoningBlocks.push(`${largestBlast} maintains the widest blast radius, functioning as a central orchestrator or shared utility. 
Modifications here ripple across ${blastUnit ? blastUnit.blastRadius : 'multiple'} downstream consumers, maximizing potential amplification. 
Structural changes must prioritize stable interfaces for this unit to contain propagation effects.`);
        }

        // 5. Dependency Interlock (Cyclic)
        const cyclicUnits = impactUnits.filter(u => u.isCyclic);
        reasoningBlocks.push(`${cyclicUnits.length === 0
            ? 'A unidirectional dependency flow ensures predictable change propagation and containment.'
            : 'Cyclic dependencies introduce structural interlocks that amplify modification risk.'} 
The detection of ${cyclicUnits.length} units in cycles suggests ${cyclicUnits.length > 2 ? 'complex architectural entanglement' : 'localized bidirectional coupling'}. 
Breaking these cycles is essential for restoring predictable systemic behavior.`);

        // 6. Connectivity Patterns (Fan-In/Out)
        const highFanIn = impactUnits.filter(u => u.fanIn >= 5);
        const highFanOut = impactUnits.filter(u => u.fanOut >= 5);
        reasoningBlocks.push(`${highFanIn.length > highFanOut.length
            ? 'The connectivity profile is dominated by stable, high-fan-in shared services.'
            : 'Operational complexity is concentrated in high-fan-out orchestration modules.'} 
A distribution of ${highFanIn.length} consumers and ${highFanOut.length} aggregators reflects a ${highFanIn.length > 3 ? 'service-oriented' : 'hierarchical'} structure. 
Balancing these patterns will improve systemic containment as new features are integrated.`);

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
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Risk vs Impact Reasoning</h3>
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
                                    <span className="text-sm text-white/40">Analyzing impact relationships...</span>
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
