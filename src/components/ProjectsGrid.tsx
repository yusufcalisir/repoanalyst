import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Star, Lock, Globe, ArrowRight, Loader2, Github } from 'lucide-react';

interface DiscoveredRepo {
    id: number;
    fullName: string;
    name: string;
    owner: string;
    description: string;
    language: string;
    stars: number;
    private: boolean;
    updatedAt: string;
    analysisState: string;
}

interface ProjectsGridProps {
    projects: DiscoveredRepo[];
    selectedProject: string | null;
    analyzingProject: string | null;
    isConnected: boolean;
    isLoading?: boolean;
    onSelectProject: (fullName: string) => void;
    onConnect: () => void;
}

const languageColors: Record<string, string> = {
    TypeScript: 'bg-blue-500',
    JavaScript: 'bg-yellow-500',
    Python: 'bg-green-500',
    Go: 'bg-cyan-500',
    Rust: 'bg-orange-500',
    Java: 'bg-red-500',
    'C#': 'bg-purple-500',
    Ruby: 'bg-red-400',
    PHP: 'bg-indigo-500',
    Swift: 'bg-orange-400',
    Kotlin: 'bg-purple-400',
    HTML: 'bg-orange-600',
    CSS: 'bg-blue-400',
    Shell: 'bg-green-400',
};

import LandingGrid from './LandingGrid';

export default function ProjectsGrid({
    projects,
    selectedProject,
    analyzingProject,
    isConnected,
    isLoading = false,
    onSelectProject,
    onConnect
}: ProjectsGridProps) {
    // Not connected state - show connect prompt
    if (!isConnected) {
        return <LandingGrid onConnect={onConnect} />;
    }

    // Loading state - don't show empty message yet
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Loading repositories...</p>
            </div>
        );
    }

    // No repos found
    if (projects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <GitBranch size={48} className="text-muted" />
                <div className="text-muted text-center">
                    <p className="font-bold">No repositories found</p>
                    <p className="text-sm mt-2">Your account doesn't have any accessible repositories</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-white">Your Projects</h2>
                    <p className="text-[11px] sm:text-sm text-muted mt-1 truncate">
                        {projects.length} repositories discovered • Click to analyze
                    </p>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((project, index) => {
                    const isSelected = selectedProject === project.fullName;
                    const isAnalyzing = analyzingProject === project.fullName;
                    const isAnalyzed = project.analysisState === 'ready';
                    const langColor = languageColors[project.language] || 'bg-gray-500';

                    return (
                        <motion.button
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => onSelectProject(project.fullName)}
                            disabled={isAnalyzing}
                            className={`text-left p-4 rounded-xl border transition-all group ${isSelected
                                ? 'bg-white/10 border-white/30'
                                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                } ${isAnalyzing ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {/* Top Row */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    {project.private ? (
                                        <Lock size={14} className="text-yellow-400 shrink-0" />
                                    ) : (
                                        <Globe size={14} className="text-muted shrink-0" />
                                    )}
                                    <span className="text-[10px] md:text-xs text-muted truncate">{project.owner}</span>
                                </div>
                                {isAnalyzed && (
                                    <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400">
                                        READY
                                    </span>
                                )}
                                {isAnalyzing && (
                                    <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 flex items-center gap-1">
                                        <Loader2 size={10} className="animate-spin" />
                                        SYNC
                                    </span>
                                )}
                            </div>

                            {/* Name */}
                            <h3 className="font-bold text-white text-base sm:text-lg truncate mb-1">
                                {project.name}
                            </h3>

                            {/* Description */}
                            <p className="text-xs text-muted line-clamp-2 h-8 mb-3">
                                {project.description || 'No description'}
                            </p>

                            {/* Bottom Row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {project.language && (
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-2.5 h-2.5 rounded-full ${langColor}`} />
                                            <span className="text-xs text-muted">{project.language}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 text-muted">
                                        <Star size={12} />
                                        <span className="text-xs">{project.stars}</span>
                                    </div>
                                </div>
                                <ArrowRight
                                    size={16}
                                    className="text-muted group-hover:text-white group-hover:translate-x-1 transition-all"
                                />
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
