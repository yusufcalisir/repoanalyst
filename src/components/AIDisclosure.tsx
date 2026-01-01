import React from 'react';
import { Brain } from 'lucide-react';

interface Props {
    provider: string;
    className?: string;
}

/**
 * AI Disclosure Component
 * 
 * Contract Compliance:
 * - AI Identity Signaling (Component Contract §7)
 * - Transparency (System Prompt §2)
 * 
 * Displays subtle, professional indication that content is AI-assisted
 * and derived from computed repository data.
 */
export default function AIDisclosure({ provider, className = '' }: Props) {
    return (
        <div className={`flex items-start gap-2 p-3 rounded-lg bg-white/5 border border-white/5 ${className}`}>
            <Brain size={12} className="text-purple-400/50 shrink-0 mt-0.5" />
            <p className="text-[10px] text-white/30 leading-relaxed">
                AI-assisted interpretation derived from repository-computed metrics via {provider?.toUpperCase()}.
                Insights are analytical observations, not authoritative decisions.
            </p>
        </div>
    );
}

/**
 * AI Data Limitation Disclosure
 * Used when data is insufficient or sparse
 */
export function AIDataLimitation({ reason }: { reason: string }) {
    return (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
            <Brain size={12} className="text-yellow-500/50 shrink-0 mt-0.5" />
            <p className="text-[10px] text-yellow-500/60 leading-relaxed">
                {reason}
            </p>
        </div>
    );
}

/**
 * AI Silence Indicator
 * Contract Compliance: Failure Transparency (Analyst Contract §7)
 * Used when meaningful interpretation is not possible
 */
export function AISilence({ section }: { section: string }) {
    return (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-white/5 border border-white/5">
            <Brain size={12} className="text-white/20 shrink-0 mt-0.5" />
            <p className="text-[10px] text-white/30 leading-relaxed">
                Insufficient structural signals in {section} data to produce meaningful interpretation.
                This section's metrics are displayed without AI commentary.
            </p>
        </div>
    );
}
