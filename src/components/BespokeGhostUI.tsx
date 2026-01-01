import React from 'react';
import { motion } from 'framer-motion';

interface BespokeIconProps {
    type: string;
}

const ProjectsGhost = () => (
    <div className="flex flex-col gap-3 w-full">
        {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2 w-full">
                <motion.div
                    initial={{ opacity: 0.1, width: "10%" }}
                    animate={{ opacity: [0.1, 0.4, 0.1], width: ["10%", "15%", "10%"] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                    className="h-1.5 bg-indigo-500 rounded-full shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                />
                <motion.div
                    initial={{ opacity: 0.05, width: "60%" }}
                    animate={{ opacity: [0.05, 0.2, 0.05], width: ["60%", "80%", "60%"] }}
                    transition={{ duration: 4, repeat: Infinity, delay: i * 0.4 }}
                    className="h-1 bg-indigo-400/30 rounded-full flex-1"
                />
            </div>
        ))}
    </div>
);

const AnalysisGhost = () => (
    <div className="relative w-full h-12 flex items-center overflow-hidden">
        <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="absolute h-full w-[150px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent rotate-12 shadow-[0_0_20px_rgba(59,130,246,0.1)]"
        />
        <div className="flex gap-4 w-full justify-between px-4">
            {[0, 1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-lg border border-blue-500/10 bg-blue-500/5" />
            ))}
        </div>
    </div>
);

const TopologyGhost = () => (
    <div className="relative w-full h-12 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-20">
            <motion.path
                d="M 10 25 L 40 10 L 70 30 L 120 15 L 180 35 L 250 10"
                fill="none"
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="4 4"
                animate={{ strokeDashoffset: [0, -20] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
        </svg>
        <div className="flex justify-between w-full h-full items-center px-4">
            {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                    key={i}
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.5, 0.2],
                        boxShadow: ["0 0 0px #10b981", "0 0 8px #10b981", "0 0 0px #10b981"]
                    }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                    className="w-2 h-2 bg-emerald-500 rounded-full"
                />
            ))}
        </div>
    </div>
);

const HistoryGhost = () => (
    <div className="w-full h-12 flex items-end">
        <svg className="w-full h-full opacity-30" viewBox="0 0 400 60" preserveAspectRatio="none">
            <defs>
                <linearGradient id="historyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
                    <stop offset="50%" stopColor="#8b5cf6" stopOpacity="1" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
            </defs>
            <motion.path
                d="M 0 50 C 50 50, 80 10, 120 30 C 160 50, 200 10, 240 40 C 300 60, 350 10, 400 30"
                fill="none"
                stroke="url(#historyGrad)"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
                d="M 0 50 C 50 50, 80 10, 120 30 C 160 50, 200 10, 240 40 C 300 60, 350 10, 400 30"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="6"
                className="blur-md opacity-20"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.2 }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
        </svg>
    </div>
);

const ImpactGhost = () => (
    <div className="relative w-full h-16 flex items-center justify-center overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
            <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0.3 }}
                animate={{ scale: [0, 4], opacity: [0.3, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
                className="absolute w-20 h-20 border border-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.2)]"
            />
        ))}
        <div className="w-full h-[1px] bg-rose-500/10 absolute top-1/2 left-0" />
    </div>
);

const DependenciesGhost = () => (
    <div className="relative w-full h-12 flex items-center px-4 overflow-hidden">
        <div className="w-full h-0.5 bg-orange-500/10 relative">
            {[0.1, 0.3, 0.6, 0.9].map((pos, i) => (
                <div key={i} className="absolute top-0 flex flex-col items-center" style={{ left: `${pos * 100}%` }}>
                    <motion.div
                        animate={{ height: [0, 20, 0], opacity: [0, 0.4, 0] }}
                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.7 }}
                        className="w-[1px] bg-orange-500 translate-y-[-20px]"
                    />
                    <motion.div
                        animate={{
                            scale: [0.8, 1.4, 0.8],
                            opacity: [0.2, 0.6, 0.2],
                            backgroundColor: ["#f97316", "#fbbf24", "#f97316"]
                        }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.7 }}
                        className="w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                    />
                </div>
            ))}
        </div>
    </div>
);

const ConcentrationGhost = () => (
    <div className="flex justify-between w-full px-4 gap-2 h-10 items-center">
        {[...Array(12)].map((_, i) => (
            <motion.div
                key={i}
                animate={{
                    scaleY: [1, 2.5, 1],
                    opacity: [0.1, 0.4, 0.1],
                    backgroundColor: ["#eab308", "#facc15", "#eab308"]
                }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                className="flex-1 min-w-[4px] h-4 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.2)]"
            />
        ))}
    </div>
);

const TemporalGhost = () => (
    <div className="w-full h-12 flex items-center px-2 overflow-hidden relative">
        <div className="flex items-center gap-1.5 w-full">
            {[...Array(24)].map((_, i) => (
                <motion.div
                    key={i}
                    animate={{
                        height: [4, Math.random() * 24 + 4, 4],
                        opacity: [0.1, 0.4, 0.1],
                        backgroundColor: ["#ef4444", "#dc2626", "#ef4444"]
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.05
                    }}
                    className="w-[2px] bg-red-500 rounded-full shrink-0 shadow-[0_0_5px_rgba(239,68,68,0.2)]"
                />
            ))}
        </div>
        <motion.div
            animate={{ x: ["-100%", "400%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 w-24 bg-gradient-to-r from-transparent via-red-500/20 to-transparent skew-x-[-20deg]"
        />
    </div>
);

export default function BespokeGhostUI({ type }: BespokeIconProps) {
    switch (type) {
        case 'projects': return <ProjectsGhost />;
        case 'overview': return <AnalysisGhost />;
        case 'risk-map': return <TopologyGhost />;
        case 'history': return <HistoryGhost />;
        case 'impact': return <ImpactGhost />;
        case 'dependencies': return <DependenciesGhost />;
        case 'concentration': return <ConcentrationGhost />;
        case 'temporal': return <TemporalGhost />;
        default: return null;
    }
}
