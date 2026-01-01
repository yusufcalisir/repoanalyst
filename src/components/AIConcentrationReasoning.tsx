import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, Loader2, AlertTriangle } from 'lucide-react';
import AIDisclosure from './AIDisclosure';
import { API_BASE } from '../config';

interface ContributorSurface {
    name: string;
    criticalFilesCount: number;
    ownedRiskArea: number;
    knowledgeSilos: string[];
}

interface BusFactorAnalysis {
    available: boolean;
    riskLevel: 'Low' | 'Moderate' | 'High' | 'Undetermined';
    explanation?: string;
    confidence?: number;
    dataQuality?: 'sufficient' | 'limited' | 'insufficient';
    contributorSurfaces: ContributorSurface[];
    totalContributors: number;
    busFactor: number;
    criticalSiloCount?: number;
    distributedFileCount?: number;
    dominantContributor?: string;
    dominantOwnership?: number;
}

interface ConcentrationData {
    window: string;
    totalCommitsAnalyzed: number;
    totalFilesTouched: number;
    concentrationIndex: number;
    ownershipRisk?: BusFactorAnalysis;
}

interface Props {
    projectId: string;
    data: ConcentrationData;
}

interface InterpretationResponse {
    success: boolean;
    interpretation?: string;
    warnings?: string[];
    error?: string;
}

export default function AIConcentrationReasoning({ projectId, data }: Props) {
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
            const res = await fetch(`${API_BASE}/api/ai/concentration-interpretation?project=${encodeURIComponent(projectId)}&provider=${aiProvider}`);
            const data = await res.json();
            setInterpretation(data);
            setHasLoaded(true);
        } catch (err) {
            // Fallback to local interpretation on network error
            console.warn('[AIConcentrationReasoning] API unavailable, using local interpretation');
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

    // Generate refined analytical concentration reasoning following high-fidelity contract
    const generateLocalReasoning = (): string => {
        const reasoningBlocks: string[] = [];
        const { concentrationIndex, totalCommitsAnalyzed, totalFilesTouched, window, ownershipRisk } = data;

        const busFactor = ownershipRisk?.busFactor || 0;
        const totalContributors = ownershipRisk?.totalContributors || 0;
        const dominantContributor = ownershipRisk?.dominantContributor;
        const dominantOwnership = ownershipRisk?.dominantOwnership || 0;
        const criticalSiloCount = ownershipRisk?.criticalSiloCount || 0;
        const riskLevel = ownershipRisk?.riskLevel || 'Undetermined';
        const contributorSurfaces = ownershipRisk?.contributorSurfaces || [];

        // Concentration: knowledge distribution, silos, redundancy

        // 1. Bus Factor & Continuity Risk
        reasoningBlocks.push(`${busFactor > 3
            ? 'The repository benefits from a resilient knowledge distribution with a high bus factor.'
            : busFactor === 1
                ? 'Knowledge is critically concentrated within a single primary contributor, creating high continuity risk.'
                : 'Redundancy is established across a small core team, providing a baseline for operational continuity.'} 
A bus factor of ${busFactor} across ${totalContributors} contributors indicates ${busFactor < 2 ? 'extreme structural reliance' : 'distributed ownership'}. 
Expanding the primary contributor pool will distribute maintenance pressure and reduce single-point failure risks.`);

        // 2. Activity Intensity (Concentration Index)
        reasoningBlocks.push(`${concentrationIndex >= 70
            ? 'Development activity is intensely concentrated within localized structural segments.'
            : 'Activity patterns are evenly distributed across the architectural breadth of the system.'} 
A concentration index of ${concentrationIndex.toFixed(0)}% suggest that ${concentrationIndex > 50 ? 'core logic is undergoing rapid, focused evolution' : 'maintenance is spread across disparate modules'}. 
Intense concentration often precedes architectural bottlenecks if not managed with proactive reviews.`);

        // 3. Ownership Dominance
        if (dominantContributor && dominantOwnership > 0) {
            reasoningBlocks.push(`${dominantContributor} maintains significant structural dominance with ${dominantOwnership.toFixed(0)}% ownership. 
This ${dominantOwnership > 60 ? 'minority-controlled' : 'lead-contributor'} model ensures focused direction but ${dominantOwnership > 80 ? 'risks total siloization' : 'requires steady collaboration'}. 
Active participation from secondary contributors is essential for maintaining the long-term review quality of this domain.`);
        }

        // 4. Knowledge Silos
        reasoningBlocks.push(`${criticalSiloCount === 0
            ? 'Knowledge coverage is uniform, with no detected single-contributor logic silos.'
            : `Detection of ${criticalSiloCount} critical silos identifies areas with zero operational redundancy.`} 
These silos represent ${criticalSiloCount > 2 ? 'systemic architectural vulnerabilities' : 'localized knowledge gaps'} that are susceptible to creator unavailability. 
Pairing or deep documentation is recommended for the ${criticalSiloCount} identified high-risk proximity zones.`);

        // 5. Analysis Context (Window)
        reasoningBlocks.push(`Observation data spans a ${window} window, encompassing ${totalCommitsAnalyzed} commits across ${totalFilesTouched} files. 
This ${totalCommitsAnalyzed > 100 ? 'substantial' : 'emergent'} history provides ${totalCommitsAnalyzed > 50 ? 'high-confidence' : 'indicative'} visibility into current ownership norms. 
Sustained observation will further refine these concentration profiles as the team distribution evolves.`);

        // 6. Ownership Resilience (Risk Level)
        reasoningBlocks.push(`${riskLevel === 'Low'
            ? 'Ownership distribution provides a robust foundation for organizational resilience.'
            : 'Operational continuity is currently categorized as high-risk due to concentration trends.'} 
A ${riskLevel.toLowerCase()} risk assessment reflects ${riskLevel === 'High' ? 'critical single-point dependencies' : 'favorable knowledge redundancy'}. 
Implementing knowledge transfer workflows will stabilize this risk profile during future scaling phases.`);

        // 7. Surface Analysis
        if (contributorSurfaces.length > 0) {
            const siloHolders = contributorSurfaces.filter(c => c.knowledgeSilos && c.knowledgeSilos.length >= 2);
            reasoningBlocks.push(`${siloHolders.length > 0
                ? `${siloHolders.length} contributors are currently maintaining multiple knowledge silos simultaneously.`
                : 'Structural ownership is balanced across the identified contributor surface.'} 
Addressing these ${siloHolders.length > 0 ? 'over-leveraged contributors' : 'distributed roles'} will improve overall team throughput and structural stability. 
Reducing individual surface area prevents burnout and improves the quality of deep architectural changes.`);
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
                        <h3 className="font-bold text-white text-sm uppercase tracking-wider">Ownership & Bus Factor Reasoning</h3>
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
                                    <span className="text-sm text-white/40">Analyzing ownership patterns...</span>
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
