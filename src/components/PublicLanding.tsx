import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Shield,
    Zap,
    Search,
    TrendingUp,
    Users,
    Database,
    GitBranch,
    Lock,
    Clock,
    ArrowRight,
    Github,
    Activity,
    Compass,
    Cpu
} from 'lucide-react';

export default function PublicLanding() {
    const navigate = useNavigate();

    const handleStart = () => {
        navigate('/projects');
    };

    const floatingElements = useMemo(() => [...Array(20)].map((_, i) => ({
        id: i,
        size: Math.random() * 4 + 2,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: Math.random() * 20 + 10,
        delay: Math.random() * 5
    })), []);

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-indigo-500/30 overflow-x-hidden relative">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[150px] rounded-full" />

                {floatingElements.map(el => (
                    <motion.div
                        key={el.id}
                        animate={{
                            y: [0, -100, 0],
                            opacity: [0, 0.3, 0]
                        }}
                        transition={{
                            duration: el.duration,
                            repeat: Infinity,
                            delay: el.delay,
                            ease: "linear"
                        }}
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{ left: `${el.x}%`, top: `${el.y}%` }}
                    />
                ))}
            </div>

            {/* Header / Nav */}
            <header className="fixed top-0 left-0 right-0 h-20 md:h-24 border-b border-white/[0.03] bg-background/40 backdrop-blur-3xl z-50 px-4 md:px-12 lg:px-20 flex items-center justify-between">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 md:gap-3"
                >
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md shadow-2xl relative group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <img src="/rs-logo.png" alt="RS" className="w-5 h-5 md:w-6 md:h-6 invert opacity-90 relative z-10" />
                    </div>
                    <span className="font-black tracking-[-0.05em] text-lg md:text-2xl text-white">RISKSURFACE</span>
                </motion.div>

                <nav className="hidden md:flex items-center gap-10">
                    {['Intelligence', 'Methodology', 'Insights'].map((item) => (
                        <button
                            key={item}
                            onClick={() => {
                                const element = document.getElementById(item.toLowerCase());
                                if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }}
                            className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
                        >
                            {item}
                        </button>
                    ))}
                </nav>

                <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={handleStart}
                    className="group relative px-4 py-2.5 md:px-6 md:py-3 rounded-xl bg-white text-black font-black text-[10px] md:text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                >
                    <span className="relative z-10">Launch System</span>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-rose-500 opacity-0 group-hover:opacity-10 transition-opacity" />
                </motion.button>
            </header>

            <main className="relative z-10">
                {/* Hero Section - Asymmetric & Bold */}
                <section id="intelligence" className="min-h-screen flex flex-col lg:flex-row items-center px-8 lg:px-20 pt-24 lg:pt-28 pb-12 lg:pb-16 gap-12 lg:gap-32 overflow-hidden">
                    <div className="flex-1 lg:max-w-[45%]">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">Risk Intelligence Layer 01</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="text-4xl md:text-7xl lg:text-8xl font-black text-white uppercase tracking-tight leading-[0.9] mb-6 pr-20"
                        >
                            Source code <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-rose-400">is data</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 0.4 }}
                            className="text-base md:text-lg text-white/40 font-medium leading-[1.6] max-w-xl mb-8"
                        >
                            RiskSurface transforms the hidden signals in your Git history into
                            computational risk vectors. Map fragility, temporal hotspots,
                            and bus-factor concentration with avant-garde precision.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 0.6 }}
                            className="flex flex-col sm:flex-row items-center gap-4"
                        >
                            <button
                                onClick={handleStart}
                                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] transition-all flex items-center justify-center gap-3 active:scale-95 group"
                            >
                                Start Analysis
                                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                            </button>
                            <div className="hidden sm:block h-8 w-[1px] bg-white/10 mx-2" />
                            <div className="flex flex-col items-center gap-3 sm:flex-row">
                                <div className="flex -space-x-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`w-7 h-7 rounded-full border-2 border-background bg-zinc-900 flex items-center justify-center overflow-hidden`}>
                                            <Github size={12} className="text-white/20" />
                                        </div>
                                    ))}
                                </div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-white/20 self-center">Trusted by Lead Engineers</div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Dynamic Preview Ghost Widget */}
                    <motion.div
                        initial={{ opacity: 0, x: 50, rotate: 2 }}
                        animate={{ opacity: 1, x: 0, rotate: 0 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="flex-1 w-full max-w-3xl relative mt-12 lg:mt-0"
                    >
                        <div className="aspect-square sm:aspect-[4/3] glass-panel rounded-[32px] md:rounded-[40px] border-white/10 p-4 md:p-8 flex flex-col gap-4 md:gap-8 relative overflow-hidden backdrop-blur-3xl shadow-[0_0_120px_rgba(99,102,241,0.1)]">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] to-rose-500/[0.05]" />

                            {/* Animated Scanner */}
                            <motion.div
                                animate={{ top: ["0%", "100%", "0%"] }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent z-10"
                            />

                            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 md:pb-6">
                                <div className="flex gap-3 md:gap-4">
                                    <div className="w-16 md:w-24 h-2 md:h-3 bg-white/15 rounded-full" />
                                    <div className="w-10 md:w-16 h-2 md:h-3 bg-white/5 rounded-full" />
                                </div>
                                <div className="flex gap-1.5 md:gap-2">
                                    <div className="w-1.5 md:w-2 h-1.5 md:w-2 rounded-full bg-indigo-500" />
                                    <div className="w-1.5 md:w-2 h-1.5 md:w-2 rounded-full bg-rose-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-4 md:gap-6 flex-1">
                                <div className="hidden sm:block col-span-4 rounded-3xl bg-white/[0.04] border border-white/5 p-6 space-y-4">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="h-2 bg-white/[0.08] rounded-full" style={{ width: `${Math.random() * 50 + 40}%` }} />
                                    ))}
                                    <div className="h-24 w-full bg-indigo-500/10 rounded-2xl mt-auto relative overflow-hidden ring-1 ring-white/5">
                                        <motion.div
                                            animate={{ x: ["-100%", "100%"] }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-12 sm:col-span-8 flex flex-col gap-4 md:gap-6">
                                    <div className="grid grid-cols-2 gap-3 md:gap-4 h-24 md:h-32">
                                        {[...Array(2)].map((_, i) => (
                                            <div key={i} className="rounded-2xl md:rounded-3xl bg-white/[0.04] border border-white/10 p-4 md:p-5 relative">
                                                <div className="w-3/4 h-1.5 md:h-2 bg-white/15 rounded-full mb-3 md:mb-4" />
                                                <div className="h-6 md:h-10 w-full bg-white/5 rounded-lg md:rounded-xl self-end" />
                                                <div className="absolute top-3 right-3 md:top-4 md:right-4 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex-1 rounded-2xl md:rounded-3xl bg-white/[0.02] border border-white/5 p-4 md:p-6 flex flex-col min-h-[120px]">
                                        <div className="w-1/4 h-2 bg-white/15 rounded-full mb-6 md:mb-8" />
                                        <div className="flex items-end gap-1.5 md:gap-2 h-full mt-auto">
                                            {[...Array(10)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ height: [`${Math.random() * 30 + 10}%`, `${Math.random() * 80 + 20}%`, `${Math.random() * 30 + 10}%`] }}
                                                    transition={{ duration: 4, repeat: Infinity, delay: i * 0.1 }}
                                                    className="flex-1 bg-gradient-to-t from-white/[0.03] to-white/[0.12] rounded-t-md"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* Problem Framing - Integrated into the page flow */}
                <section id="methodology" className="py-20 md:py-32 lg:py-40 px-8 lg:px-20 relative border-t border-white/[0.03]">
                    <div className="absolute top-0 right-[20%] w-[1px] h-full bg-gradient-to-b from-white/10 to-transparent hidden lg:block" />

                    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-24 items-start">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="lg:w-[45%] w-full"
                        >
                            <h2 className="text-3xl md:text-7xl font-black text-white uppercase tracking-tight leading-[0.9] mb-8 md:mb-12">
                                Conventional <br /> metrics are <br /> <span className="text-white/20">blind spots</span>
                            </h2>
                            <div className="space-y-8 text-white/40 font-medium text-xl leading-relaxed">
                                <p>
                                    Technical debt isn't just code complexity. It's the silent erosion of a system's ability to evolve.
                                </p>
                                <p>
                                    We move beyond simple "scores" to reveal <span className="text-white">Systemic Risk</span>: the intersection of code architecture, human silos, and historical instability.
                                </p>
                            </div>
                        </motion.div>

                        <div className="lg:w-[55%] grid grid-cols-1 md:grid-cols-2 gap-8">
                            {[
                                { title: "Structural Topology", desc: "Recursive dependency mapping to reveal hidden fragility points.", icon: GitBranch, color: "text-indigo-400" },
                                { title: "Temporal Churn", desc: "Identify high-risk modules by tracking version stress history.", icon: Clock, color: "text-rose-400" },
                                { title: "Cognitive Silos", desc: "Bus factor detection through owner-contributor distribution.", icon: Users, color: "text-amber-400" },
                                { title: "Reach Analysis", desc: "Calculation of change propagation across the entire graph.", icon: Zap, color: "text-emerald-400" },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-10 rounded-[40px] glass-panel border border-white/5 hover:border-white/10 transition-all group hover:translate-y-[-8px]"
                                >
                                    <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 shadow-inner group-hover:${item.color}`}>
                                        <item.icon size={28} />
                                    </div>
                                    <h3 className="font-black text-white uppercase tracking-tight text-xl mb-4 leading-tight">{item.title}</h3>
                                    <p className="text-white/30 text-base leading-relaxed font-medium">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Computational Proof */}
                <section id="insights" className="py-24 md:py-32 lg:py-40 px-8 lg:px-20 bg-white/[0.01]">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
                            <div className="max-w-2xl">
                                <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tight leading-[0.9] mb-8">
                                    Computed <br /> from <span className="text-indigo-400 italic">truth</span>
                                </h2>
                                <p className="text-white/40 text-xl font-medium">
                                    RiskSurface integrates directly with your source tree history.
                                    No heuristics, no placeholders—just verified engineering intelligence.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="p-4 rounded-full border border-white/10 bg-white/5 flex items-center gap-3">
                                    <Database size={16} className="text-indigo-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Live GitHub Feed</span>
                                </div>
                                <div className="p-4 rounded-full border border-white/10 bg-white/5 flex items-center gap-3">
                                    <Cpu size={16} className="text-rose-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Local Compute</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { title: "Repository Guard", icon: Shield, stat: "360°" },
                                { title: "Dependency Mesh", icon: Compass, stat: "Real-time" },
                                { title: "Traffic Analysis", icon: Activity, stat: "Node-base" },
                                { title: "System Health", icon: Zap, stat: "Computed" },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-10 rounded-[32px] border border-white/[0.03] bg-gradient-to-br from-white/[0.03] to-transparent flex flex-col items-center text-center group"
                                >
                                    <item.icon size={32} className="text-white/20 mb-8 group-hover:text-white transition-colors" />
                                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 mb-2">{item.title}</h4>
                                    <div className="text-2xl font-black text-white uppercase">{item.stat}</div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Final Call to Action - Engineered & Immersive */}
                <section className="py-24 md:py-32 lg:py-40 px-6 md:px-12 lg:px-20 overflow-hidden relative">
                    <div className="max-w-7xl mx-auto relative px-8 py-16 md:py-32 rounded-[32px] md:rounded-[64px] border border-white/10 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] flex flex-col items-center text-center overflow-hidden">
                        {/* Technical Backdrop */}
                        <div className="absolute inset-0 z-0 opacity-20">
                            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                            <motion.div
                                animate={{ y: [0, 400] }}
                                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                                className="absolute top-[-200px] left-0 right-0 h-[300px] bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent"
                            />
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="relative z-10 w-full"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">System Ready for Protocol 02</span>
                            </div>

                            <h2 className="text-4xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white uppercase tracking-tighter leading-none mb-8">
                                Visual <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-400 italic">Insurance</span>
                            </h2>

                            <p className="text-white/40 text-sm md:text-xl font-medium max-w-xl mx-auto mb-12 leading-relaxed">
                                Engineering risk is invisible until it's critical.
                                <span className="text-white/80"> Bridge the gap </span>
                                between source code and systemic stability.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                                <button
                                    onClick={handleStart}
                                    className="group relative px-10 py-5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-[0_30px_60px_rgba(255,255,255,0.1)] active:scale-95 overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        Initialize System
                                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-rose-500/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                                </button>

                                <div className="flex flex-col items-start gap-1">
                                    <div className="flex gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <div key={i} className="w-3 h-1 bg-white/20 rounded-full" />
                                        ))}
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Computation Latency: 42ms</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Footer - Minimalist & Geometric */}
                <footer className="py-16 md:py-20 px-8 lg:px-20 border-t border-white/[0.03]">
                    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between gap-16 md:gap-24">
                        <div className="space-y-6 lg:max-w-sm">
                            <div className="flex items-center gap-3">
                                <span className="font-black tracking-[-0.05em] text-3xl text-white">RISKSURFACE</span>
                            </div>
                            <p className="text-white/20 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] leading-relaxed">
                                Advanced Source Code Risk Intelligence Framework
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-12 md:gap-x-24 gap-y-12">
                            {[
                                { title: 'Legal', links: [{ label: 'OSS License', url: 'https://github.com/yusufcalisir/RiskSurface/blob/main/LICENSE' }] },
                                { title: 'Network', links: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/in/yusufcalisir/' }, { label: 'GitHub Repo', url: 'https://github.com/yusufcalisir/RiskSurface' }] },
                                { title: 'Contact', links: [{ label: 'Consultancy', url: 'https://www.linkedin.com/in/yusufcalisir/' }] }
                            ].map(group => (
                                <div key={group.title} className="flex flex-col gap-4 md:gap-5">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">{group.title}</h5>
                                    <ul className="flex flex-col gap-3 md:gap-4">
                                        {group.links.map(link => (
                                            <li key={link.label}>
                                                <a
                                                    href={link.url}
                                                    target={link.url.startsWith('http') ? "_blank" : undefined}
                                                    rel={link.url.startsWith('http') ? "noopener noreferrer" : undefined}
                                                    className="text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all hover:translate-x-1 inline-block"
                                                >
                                                    {link.label}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="max-w-7xl mx-auto pt-12 md:pt-20 mt-12 md:mt-20 border-t border-white/[0.03] flex flex-col sm:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-[0.5em] text-white/10 text-center sm:text-left">
                        <span>© 2025 Product Intelligence</span>
                        <a href="https://github.com/yusufcalisir/RiskSurface" className="hover:text-white transition-colors">By Yusuf Çalışır</a>
                    </div>
                </footer>
            </main>
        </div>
    );
}
