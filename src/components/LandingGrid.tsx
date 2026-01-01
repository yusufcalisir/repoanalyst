import React from 'react';
import { motion } from 'framer-motion';
import {
    FolderKanban, LayoutDashboard, Map, History,
    Files, GitBranch, Activity, Clock
} from 'lucide-react';
import BespokeGhostUI from './BespokeGhostUI';

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
        <div className="w-full relative pt-1 md:pt-2">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02),transparent)] pointer-events-none" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-[1600px] relative z-10">
                {tiles.map((tile, index) => {
                    const colorMap: Record<string, string> = {
                        projects: 'indigo',
                        overview: 'blue',
                        'risk-map': 'emerald',
                        history: 'violet',
                        impact: 'rose',
                        dependencies: 'orange',
                        concentration: 'amber',
                        temporal: 'red'
                    };
                    const activeColor = colorMap[tile.id] || 'blue';

                    return (
                        <motion.div
                            key={tile.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.06 }}
                            className="glass-panel border border-white/5 p-6 rounded-3xl h-[280px] flex flex-col justify-between group hover:border-white/20 transition-all cursor-default relative overflow-hidden"
                        >
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-2.5 rounded-xl bg-white/5 border border-white/5 group-hover:bg-${activeColor}-500/10 group-hover:border-${activeColor}-500/20 transition-all shadow-[0_0_15px_transparent] group-hover:shadow-${activeColor}-500/5`}>
                                        <tile.icon size={20} className={`text-white/40 group-hover:text-${activeColor}-400 transition-colors`} />
                                    </div>
                                    <h3 className="font-bold text-lg text-white tracking-tight">{tile.title}</h3>
                                </div>

                                <div className="space-y-6">
                                    <p className="text-sm text-white/30 leading-relaxed font-medium">
                                        {tile.desc}
                                    </p>

                                    {/* Inactive Panel "Ghost" Graphics */}
                                    <div className="h-16 flex items-center justify-between w-full pr-4">
                                        <BespokeGhostUI type={tile.id} />
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10">
                                <div className="pt-4 border-t border-white/5" />
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
