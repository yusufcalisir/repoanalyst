import React from 'react';
import { motion } from 'framer-motion';
import {
    FolderKanban, LayoutDashboard, Map, History,
    Files, GitBranch, Activity, Clock
} from 'lucide-react';

interface LandingGridProps {
    onConnect: () => void;
}

const tiles = [
    { id: 'projects', title: 'Projects', icon: FolderKanban, desc: 'Connect your repositories to begin analyzing code health and risk indicators in real-time.' },
    { id: 'overview', title: 'Analysis', icon: LayoutDashboard, desc: 'High-level metrics and repository health signals for quick, actionable insights.' },
    { id: 'risk-map', title: 'System Topology', icon: Map, desc: 'Structural map of modules and logic clusters to visualize complex system dependencies.' },
    { id: 'history', title: 'Risk Trajectory', icon: History, desc: 'Temporal progression of computed risk indicators over your development history.' },
    { id: 'impact', title: 'Impact Surface', icon: Files, desc: 'Reach and severity of code modification surfaces across your entire codebase.' },
    { id: 'dependencies', title: 'Dependencies', icon: GitBranch, desc: 'Lag analysis and external library risk profile for end-to-end supply chain security.' },
    { id: 'concentration', title: 'Concentration', icon: Activity, desc: 'Ownership silos and knowledge distribution heatmaps to identify single points of failure.' },
    { id: 'temporal', title: 'Temporal Hotspots', icon: Clock, desc: 'High-churn file detection and version stress points in your active development cycle.' },
];

export default function LandingGrid({ onConnect }: LandingGridProps) {
    return (
        <div className="w-full min-h-full flex items-center justify-center py-4 md:py-8 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02),transparent)] pointer-events-none" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-[1600px] relative z-10">
                {tiles.map((tile, index) => (
                    <motion.div
                        key={tile.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.06 }}
                        className="glass-panel border border-white/5 p-6 rounded-3xl h-[280px] flex flex-col justify-between group hover:border-white/20 transition-all cursor-default relative overflow-hidden"
                    >
                        {/* Ghost UI Background Element */}
                        <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                            <tile.icon size={120} strokeWidth={1} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 group-hover:bg-risk-high/10 group-hover:border-risk-high/20 transition-all">
                                    <tile.icon size={20} className="text-white/40 group-hover:text-risk-high transition-colors" />
                                </div>
                                <h3 className="font-bold text-lg text-white tracking-tight">{tile.title}</h3>
                            </div>

                            <div className="space-y-6">
                                <p className="text-sm text-white/30 leading-relaxed font-medium">
                                    {tile.desc}
                                </p>

                                {/* Inactive Panel "Ghost" Graphics */}
                                <div className="space-y-3">
                                    <div className="flex items-end gap-1 h-12 opacity-10">
                                        {[...Array(12)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                animate={{
                                                    height: [10, 20 + Math.random() * 20, 10],
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    delay: i * 0.1
                                                }}
                                                className="flex-1 bg-white rounded-t-sm"
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-3 opacity-20">
                                        <div className="h-2 w-16 bg-white/10 rounded-full" />
                                        <div className="h-2 w-10 bg-white/10 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10">
                            <div className="pt-4 border-t border-white/5" />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
