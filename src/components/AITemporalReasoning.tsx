import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, Loader2, AlertTriangle } from 'lucide-react';
import AIDisclosure from './AIDisclosure';
import { API_BASE } from '../config';

interface TemporalHotspot {
    path: string;
    commitCount: number;
    frequencyBaseline: number;
    shortestIntervalHr: number;
    meanIntervalHr: number;
    severityScore: number;
    classification: 'burst' | 'drift';
    timestamps: string[];
}

interface TemporalData {
    baselineFound: boolean;
    medianFrequency: number;
    temporalHotspots: TemporalHotspot[];
    windowDays: number;
}

interface Props {
    projectId: string;
    data: TemporalData;
}

interface InterpretationResponse {
    success: boolean;
    interpretation?: string;
    warnings?: string[];
    error?: string;
}

export default function AITemporalReasoning({ projectId, data }: Props) {
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
            const res = await fetch(`${API_BASE}/api/ai/temporal-interpretation?project=${encodeURIComponent(projectId)}&provider=${aiProvider}`);
            const data = await res.json();
            setInterpretation(data);
            setHasLoaded(true);
        } catch (err) {
            // Fallback to local interpretation on network error
            console.warn('[AITemporalReasoning] API unavailable, using local interpretation');
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

    // Generate refined analytical temporal reasoning following high-fidelity contract
    const generateLocalReasoning = (): string => {
        const reasoningBlocks: string[] = [];
        const { temporalHotspots, medianFrequency, windowDays, baselineFound } = data;

        // Temporal: recency, decay, velocity

        // 1. Operational Baseline
        reasoningBlocks.push(`${baselineFound
            ? 'A stable temporal baseline has been established for repository evolution.'
            : 'Operational patterns show high temporal noise, with no stable baseline detected.'} 
A median frequency of ${medianFrequency.toFixed(1)} changes provides a benchmark for ${baselineFound ? 'repository-specific norms' : 'assessing future activity'}. 
This cadence defines the expected velocity for standard maintenance and feature delivery cycles.`);

        // 2. High-Frequency Pulsing (Hotspots)
        reasoningBlocks.push(`${temporalHotspots.length > 5
            ? 'The system exhibits widespread temporal instability across multiple structural segments.'
            : 'Temporal hotspots are localized within a manageable range of architectural zones.'} 
Detection of ${temporalHotspots.length} activity centers suggests ${temporalHotspots.length > 3 ? 'systemic churn' : 'controlled iteration'}. 
These points of concentration represent high-velocity areas where logic is evolving faster than the system-wide median.`);

        // 3. Analysis Context (Window)
        reasoningBlocks.push(`The temporal analysis window encompasses ${windowDays} days of historical activity. 
This depth provides ${windowDays > 30 ? 'high-confidence visibility into long-term behavioral' : 'initial insight into recent development'} patterns. 
Maintaining this observation window will help differentiate between transient bursts and chronic architectural decay.`);

        // 4. Pattern Classification (Burst vs Drift)
        const burstHotspots = temporalHotspots.filter(h => h.classification === 'burst');
        const driftHotspots = temporalHotspots.filter(h => h.classification === 'drift');
        reasoningBlocks.push(`${driftHotspots.length > burstHotspots.length
            ? 'Temporal evolution is dominated by sustained drift, indicating chronic architectural instability.'
            : 'Activity patterns are primarily burst-driven, reflecting focused feature push cycles.'} 
With ${burstHotspots.length} bursts and ${driftHotspots.length} drifts, the system ${driftHotspots.length > 2 ? 'risks long-term structural decay' : 'maintains a healthy modification pulse'}. 
Addressing drift hotspots is critical for preserving the long-term maintainability of core logic layers.`);

        // 5. Critical Velocity Hotspots (Severity)
        const criticalHotspots = temporalHotspots.filter(h => h.severityScore >= 70);
        reasoningBlocks.push(`${criticalHotspots.length > 0
            ? 'Critical-severity hotspots have been identified with extreme transformation velocity.'
            : 'Temporal severity remain within expected operational bounds across the codebase.'} 
Tracking ${criticalHotspots.length} high-intensity nodes helps identify ${criticalHotspots.length > 2 ? 'structural boiling points' : 'localized focus areas'}. 
Moderating the change velocity in these zones will improve review quality and prevent technical debt accumulation.`);

        // 6. Impact Recency (Sub-hour changes)
        const rapidHotspots = temporalHotspots.filter(h => h.shortestIntervalHr < 1);
        reasoningBlocks.push(`${rapidHotspots.length > 0
            ? 'High-frequency sub-hour change intervals indicate rapid, iterative logic refinement.'
            : 'Modification intervals allow for adequate cooling periods between successive changes.'} 
The presence of ${rapidHotspots.length} rapidly evolving files suggests ${rapidHotspots.length > 3 ? 'intense modification pressure' : 'localized debugging sessions'}. 
Ensuring these rapid-fire updates are captured in structured reviews will maintain architectural alignment.`);

        // 7. Spatial Clustering
        if (temporalHotspots.length >= 2) {
            const directories = temporalHotspots.map(h => h.path.split('/').slice(0, -1).join('/') || 'root');
            const dirCounts: Record<string, number> = {};
            directories.forEach(d => { dirCounts[d] = (dirCounts[d] || 0) + 1; });
            const repeatedDirs = Object.entries(dirCounts).filter(([_, count]) => count >= 2);

            reasoningBlocks.push(`${repeatedDirs.length > 0
                ? `Temporal instability is spatially clustered within ${repeatedDirs.length} directory hierarchies.`
                : 'Activity hotspots are spatially distributed across the system topology.'} 
Clustering in areas like ${repeatedDirs.slice(0, 2).map(([dir]) => dir).join(' and ')} identifies broad domains under stress. 
Targeting these clusters for structural review will yield the highest returns for architectural stabilization.`);
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
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Temporal Pattern Interpretation</h3>
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
                                    <span className="text-sm text-white/40">Analyzing temporal patterns...</span>
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
