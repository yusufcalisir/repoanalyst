import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap, AlertTriangle, ArrowUpRight, ArrowDownRight,
    ShieldAlert, Users, Package, ChevronRight, Info
} from 'lucide-react';
import { useLivePolling } from '../hooks/useLivePolling';

interface RiskProjection {
    available: boolean;
    currentRisk: number;
    projectedRisk: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    trendMagnitude: number;
    confidence: number;
}

interface BusFactorWarning {
    modulePath: string;
    moduleName: string;
    primaryOwner: string;
    ownershipPercent: number;
    severity: 'critical' | 'high' | 'medium';
    recommendation: string;
}

interface DependencyRecommendation {
    name: string;
    currentVersion: string;
    action: string;
    reason: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
}

interface ActionableRecommendation {
    type: 'refactor' | 'review' | 'redistribute' | 'update';
    target: string;
    targetName: string;
    reason: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    impact: string;
}

interface PredictiveAnalysis {
    available: boolean;
    generatedAt: string;
    riskProjection: RiskProjection;
    busFactorWarnings: BusFactorWarning[];
    dependencyRecommendations: DependencyRecommendation[];
    recommendations: ActionableRecommendation[];
}

interface PredictionsResponse {
    selected: boolean;
    project: any;
    predictions: PredictiveAnalysis;
}

const SeverityBadge = ({ severity }: { severity: string }) => {
    const colors = {
        critical: 'bg-red-500/20 text-red-400 border-red-500/30',
        high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };

    return (
        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase border ${colors[severity as keyof typeof colors] || colors.low}`
        }>
            {severity}
        </span>
    );
};

interface Props {
    onTabChange?: (tab: string) => void;
}

export const RecommendationCard: React.FC<Props> = ({ onTabChange }) => {
    const { data, loading, error } = useLivePolling<PredictionsResponse>(
        '/api/analysis/predictions',
        { interval: 30000 }
    );

    const handleActionClick = (rec: ActionableRecommendation) => {
        if (!onTabChange) return;

        const tabMap: Record<string, string> = {
            'refactor': 'concentration',
            'redistribute': 'risk-map',
            'review': 'analysis',
            'update': 'dependencies'
        };

        const targetTab = tabMap[rec.type];
        if (targetTab) {
            onTabChange(targetTab);
        }
    };

    if (loading && !data) {
        return (
            <div className="glass-panel rounded-2xl p-6 h-full flex flex-col justify-center items-center gap-4 min-h-[400px]" >
                <div className="w-12 h-12 rounded-full border-2 border-white/5 border-t-blue-500 animate-spin" />
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest" > Computing Predictions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-panel rounded-2xl p-6 h-full border-red-500/20" >
                <div className="flex items-center gap-2 text-red-400 mb-2" >
                    <AlertTriangle size={16} />
                    < span className="font-bold text-sm uppercase italic" > Prediction Error </span>
                </div>
                < p className="text-xs text-white/40 italic" > {error} </p>
            </div>
        );
    }

    const predictions = data?.predictions;

    if (!predictions || !predictions.available || predictions.recommendations.length === 0) {
        return (
            <div className="glass-panel rounded-2xl p-6 h-full flex flex-col justify-center items-center text-center opacity-60" >
                <Info size={32} className="text-white/20 mb-4" />
                <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-wide" > No Actionable Recommendations </h3>
                < p className="text-[10px] text-white/40 max-w-[200px] leading-relaxed italic" >
                    Repository is currently stable.No critical risks detected for the projected window.
                </p>
            </div>
        );
    }

    return (
        <div className="glass-panel rounded-2xl flex flex-col h-full overflow-hidden border border-white/10" >
            {/* Header */}
            < div className="p-6 border-b border-white/5 bg-white/5" >
                <div className="flex items-center justify-between mb-2" >
                    <h3 className="font-bold text-lg text-white flex items-center gap-2" >
                        <Zap size={18} className="text-yellow-400" />
                        AURA Predictions
                    </h3>
                    < div className="flex items-center gap-2 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20" >
                        <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                        />
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter" > Live Analysis </span>
                    </div>
                </div>

                {
                    predictions.riskProjection && predictions.riskProjection.available && (
                        <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5" >
                            <div>
                                <div className="text-[9px] uppercase font-black text-white/30 tracking-widest mb-1" > 4 - Week Risk Forecast </div>
                                < div className="flex items-center gap-2" >
                                    <span className={
                                        `text-xl font-black ${predictions.riskProjection.trend === 'increasing' ? 'text-risk-high' :
                                            predictions.riskProjection.trend === 'decreasing' ? 'text-green-400' : 'text-blue-400'
                                        }`
                                    }>
                                        {predictions.riskProjection.projectedRisk.toFixed(1)}
                                    </span>
                                    {
                                        predictions.riskProjection.trend === 'increasing' ? <ArrowUpRight size={16} className="text-risk-high" /> :
                                            predictions.riskProjection.trend === 'decreasing' ? <ArrowDownRight size={16} className="text-green-400" /> : null
                                    }
                                </div>
                            </div>
                            < div className="text-right" >
                                <div className="text-[9px] uppercase font-black text-white/30 tracking-widest mb-1" > Confidence </div>
                                < div className="text-xs font-bold text-white/60" > {(predictions.riskProjection.confidence * 100).toFixed(0)
                                }% </div>
                                < div className="w-16 h-1 bg-white/5 rounded-full mt-1 overflow-hidden" >
                                    <div className="h-full bg-blue-500/50" style={{ width: `${predictions.riskProjection.confidence * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    )}
            </div>

            {/* Recommendations List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4" >
                <div className="text-[10px] uppercase font-black text-white/40 tracking-[0.2em] mb-4" > Strategic Actions </div>

                < AnimatePresence mode="popLayout" >
                    {
                        predictions.recommendations.map((rec, idx) => (
                            <motion.div
                                key={`${rec.type}-${rec.target}-${idx}`}
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => handleActionClick(rec)}
                                className="group relative p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer overflow-hidden"
                            >
                                <div className="flex justify-between items-start mb-2" >
                                    <div className="flex items-center gap-2" >
                                        <div className={
                                            `p-1.5 rounded-lg ${rec.type === 'refactor' ? 'bg-orange-500/20 text-orange-400' :
                                                rec.type === 'redistribute' ? 'bg-purple-500/20 text-purple-400' :
                                                    rec.type === 'review' ? 'bg-blue-500/20 text-blue-400' :
                                                        'bg-green-500/20 text-green-400'
                                            }`
                                        }>
                                            {rec.type === 'refactor' && <AlertTriangle size={14} />}
                                            {rec.type === 'redistribute' && <Users size={14} />}
                                            {rec.type === 'review' && <ShieldAlert size={14} />}
                                            {rec.type === 'update' && <Package size={14} />}
                                        </div>
                                        < span className="text-[11px] font-black text-white uppercase tracking-wider" > {rec.type} </span>
                                    </div>
                                    < SeverityBadge severity={rec.severity} />
                                </div>

                                < div className="text-xs font-bold text-white/90 mb-1 group-hover:text-white transition-colors" >
                                    {rec.targetName}
                                </div>
                                < p className="text-[10px] text-white/50 leading-relaxed italic mb-3" >
                                    {rec.reason}
                                </p>

                                < div className="flex items-center justify-between pt-3 border-t border-white/5" >
                                    <span className="text-[9px] font-bold text-white/30 uppercase italic" > {rec.impact} </span>
                                    < ChevronRight size={12} className="text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
                                </div>

                                {/* Accent line */}
                                <div className={
                                    `absolute left-0 top-0 bottom-0 w-1 ${rec.severity === 'critical' ? 'bg-red-500' :
                                        rec.severity === 'high' ? 'bg-orange-500' : 'bg-blue-500'
                                    } opacity-40`
                                } />
                            </motion.div>
                        ))}
                </AnimatePresence>

                {/* Bus Factor Warnings Section */}
                {
                    predictions.busFactorWarnings.length > 0 && (
                        <div className="mt-8" >
                            <div className="text-[10px] uppercase font-black text-red-400/60 tracking-[0.2em] mb-4 flex items-center gap-2" >
                                <Users size={12} />
                                Knowledge Silos Detected
                            </div>
                            < div className="space-y-2" >
                                {
                                    predictions.busFactorWarnings.map((warning, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10" >
                                            <div className="flex flex-col" >
                                                <span className="text-[10px] font-bold text-white truncate max-w-[150px]" > {warning.moduleName} </span>
                                                < span className="text-[8px] text-white/30 font-mono italic" > {warning.ownershipPercent.toFixed(1)} % owner concentration </span>
                                            </div>
                                            < AlertTriangle size={12} className="text-red-400/40" />
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )
                }
            </div>

            {/* Footer */}
            <div className="p-4 bg-black/20 border-t border-white/5 flex justify-between items-center" >
                <span className="text-[8px] text-white/20 font-mono uppercase tracking-widest" >
                    Last Forecast: {predictions.generatedAt ? new Date(predictions.generatedAt).toLocaleTimeString() : 'N/A'}
                </span>
                < span className="text-[8px] text-blue-400/40 font-black uppercase tracking-[0.3em]" >
                    RiskSurface
                </span>
            </div>
        </div>
    );
};

export default RecommendationCard;
