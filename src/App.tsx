import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Map,
    History,
    Files,
    GitBranch,
    Activity,
    Clock,
    ChevronLeft,
    ChevronRight,
    Settings,
    Github,
    LogOut,
    FolderKanban,
    Loader2,
    Download
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import SkeletonInstrument from './components/SkeletonInstrument';

// Components
import RiskMap from './components/RiskMap';
import HistoryView from './components/HistoryView';
import ImpactSurface from './components/ImpactSurface';
import DependencyGraph from './components/DependencyGraph';
import { AnalysisStatus } from './components/SignalBadge';
import MetricCluster from './components/MetricCluster';
import SnapshotNavigator from './components/SnapshotNavigator';
import ScopeIndicator from './components/ScopeIndicator';
import SettingsPanel from './components/SettingsPanel';
import ExportDropdown from './components/ExportDropdown';
import RealDashboard from './components/RealDashboard';
import GitHubConnectModal from './components/GitHubConnectModal';
import ProjectsGrid from './components/ProjectsGrid';
import RealTopology from './components/RealTopology';
import RealTrajectory from './components/RealTrajectory';
import RealImpact from './components/RealImpact';
import RealDependencies from './components/RealDependencies';
import RealConcentration from './components/RealConcentration';
import RealTemporal from './components/RealTemporal';
import ErrorBoundary from './components/ErrorBoundary';

import { API_BASE } from './config';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface GitHubConnection {
    isConnected: boolean;
    username: string;
    avatarUrl: string;
    name: string;
    organization?: string;
    repoCount: number;
}

interface DiscoveredRepo {
    id: number;
    fullName: string;
    name: string;
    owner: string;
    description: string;
    defaultBranch: string;
    language: string;
    stars: number;
    private: boolean;
    updatedAt: string;
    analysisState: string;
}

const navItems = [
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'overview', label: 'Analysis', icon: LayoutDashboard },
    { id: 'risk-map', label: 'System Topology', icon: Map },
    { id: 'history', label: 'Risk Trajectory', icon: History },
    { id: 'impact', label: 'Impact Surface', icon: Files },
    { id: 'dependencies', label: 'Dependencies', icon: GitBranch },
    { id: 'concentration', label: 'Concentration', icon: Activity },
    { id: 'temporal', label: 'Temporal Hotspots', icon: Clock },
];

export default function App() {
    console.log('[DEBUG] App component rendering...')
    // Connection state
    const [connection, setConnection] = useState<GitHubConnection | null>(null);
    const [isCheckingConnection, setIsCheckingConnection] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);

    // Projects state
    const [projects, setProjects] = useState<DiscoveredRepo[]>([]);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [analyzingProject, setAnalyzingProject] = useState<string | null>(null);

    // Project isolation: version counter increments on every project switch
    // This forces all child components to refetch their data
    const [projectVersion, setProjectVersion] = useState(0);

    // UI state
    const [activeTab, setActiveTab] = useState('projects');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAnalysisReady, setIsAnalysisReady] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isMobileNavAtEnd, setIsMobileNavAtEnd] = useState(false);

    // Check GitHub connection on mount
    useEffect(() => {
        checkConnection();
    }, []);

    // Close mobile menu on tab change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [activeTab]);

    const checkConnection = async () => {
        setIsCheckingConnection(true);
        try {
            const res = await fetch(`${API_BASE}/api/github/status`);
            const data = await res.json();
            if (data.isConnected) {
                setConnection(data);
                fetchProjects();
            } else {
                setConnection(null);
            }
        } catch (err) {
            setConnection(null);
        }
        setIsCheckingConnection(false);
    };

    const fetchProjects = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/projects`);
            const data = await res.json();
            setProjects(data || []);
        } catch (err) {
            console.error('Failed to fetch projects');
        }
    };

    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE}/api/github/disconnect`, { method: 'POST' });
            setConnection(null);
            setProjects([]);
            setSelectedProject(null);
            setAnalyzingProject(null);
            setActiveTab('projects');
            setIsMobileMenuOpen(false);
        } catch (err) {
            console.error('Logout failed');
        }
    };

    const handleConnect = (username: string, repoCount: number, organization?: string) => {
        setConnection({
            isConnected: true,
            username,
            avatarUrl: '',
            name: username,
            organization,
            repoCount
        });
        setShowConnectModal(false);
        fetchProjects();
    };

    const handleDisconnect = async () => {
        try {
            await fetch(`${API_BASE}/api/github/disconnect`, { method: 'POST' });
            setConnection(null);
            setProjects([]);
            setSelectedProject(null);
            setActiveTab('projects');
        } catch (err) {
            console.error('Failed to disconnect');
        }
    };

    const handleSelectProject = async (fullName: string) => {
        // CRITICAL: Invalidate all stale data immediately
        setIsAnalysisReady(false);
        setProjectVersion(v => v + 1);

        setAnalyzingProject(fullName);
        setSelectedProject(fullName);

        // Check if project is already analyzed
        const project = projects.find(p => p.fullName === fullName);
        if (project?.analysisState === 'ready') {
            try {
                await fetch(`${API_BASE}/api/projects/selected`, {
                    method: 'POST',
                    body: JSON.stringify({ fullName }),
                    headers: { 'Content-Type': 'application/json' }
                });
                await fetchProjects();
                setActiveTab('overview');
            } catch (err) {
                console.error('Failed to select project on backend', err);
                setActiveTab('overview');
            }
            setAnalyzingProject(null);
            setIsAnalysisReady(true);
            return;
        }

        try {
            const [owner, repo] = fullName.split('/');
            const res = await fetch(`${API_BASE}/api/projects/${owner}/${repo}/analyze`, {
                method: 'POST'
            });
            const data = await res.json();

            if (data.success) {
                await fetchProjects();
                setActiveTab('overview');
            }
        } catch (err) {
            console.error('Failed to analyze project');
        }
        setAnalyzingProject(null);
        setIsAnalysisReady(true);
    };

    // Loading state
    if (isCheckingConnection) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 text-risk-high animate-spin" />
            </div>
        );
    }

    // Get selected project details
    const currentProject = projects.find(p => p.fullName === selectedProject);

    const SidebarContent = () => (
        <>
            <div className="p-3 flex items-center justify-between h-16 shrink-0">
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                        "font-black tracking-tighter text-2xl bg-gradient-to-r from-white via-white to-gray-500 bg-clip-text text-transparent px-2",
                        isSidebarCollapsed && "md:hidden"
                    )}
                >
                    RISKSURFACE
                </motion.span>
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="hidden md:flex p-1.5 rounded-md hover:bg-white/5 transition-colors border border-border/50"
                    aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isSidebarCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                </button>
                <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                    <ChevronLeft size={24} />
                </button>
            </div>

            <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar pt-4">
                {navItems.map((item) => {
                    const isDisabled = item.id !== 'projects' && !selectedProject;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (isDisabled) return;
                                if (isActive) return;
                                setIsAnalysisReady(false);
                                setActiveTab(item.id);
                                setTimeout(() => setIsAnalysisReady(true), 400);
                            }}
                            disabled={isDisabled}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group",
                                isActive ? "bg-white/10 text-white shadow-[0_4px_20px_rgba(0,0,0,0.3)]" : "text-muted hover:text-white hover:bg-white/5",
                                isDisabled && "opacity-30 cursor-not-allowed"
                            )}
                        >
                            <item.icon size={20} className={cn(isActive ? "text-risk-high drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "text-muted group-hover:text-white")} />
                            <span className={cn(
                                "font-bold tracking-tight text-sm",
                                isSidebarCollapsed && "md:hidden"
                            )}>
                                {item.label}
                            </span>
                            {isActive && (
                                <motion.div
                                    layoutId="nav-active"
                                    className="absolute left-0 w-1 h-6 bg-risk-high rounded-full"
                                />
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/5 space-y-4 bg-surface/20">
                {!connection ? (
                    <button
                        onClick={() => {
                            setShowConnectModal(true);
                            setIsMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-3 px-3 py-3 rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-white/90 transition-all shadow-xl shadow-white/5"
                    >
                        <Github size={18} />
                        <span className={cn(isSidebarCollapsed && "md:hidden")}>Connect GitHub</span>
                    </button>
                ) : (
                    <>
                        <div className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10",
                            isSidebarCollapsed && "md:justify-center p-2"
                        )}>
                            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                                <Github size={18} className="text-green-400" />
                            </div>
                            {!isSidebarCollapsed && (
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-black text-white truncate uppercase tracking-tight">{connection.username}</div>
                                    <div className="text-[10px] text-muted font-mono">{projects.length} Repositories</div>
                                </div>
                            )}
                        </div>

                        {currentProject && !isSidebarCollapsed && (
                            <ScopeIndicator
                                organization={connection?.organization || currentProject.owner}
                                repository={currentProject.fullName}
                                accessLevel="full"
                                isExpanded={true}
                            />
                        )}

                        <div className={cn(
                            "grid gap-2",
                            isSidebarCollapsed ? "md:grid-cols-1" : "grid-cols-2"
                        )}>
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="flex items-center justify-center h-10 rounded-xl bg-white/5 border border-white/5 text-muted hover:text-white hover:bg-white/10 transition-all"
                                title="Settings"
                            >
                                <Settings size={18} />
                            </button>
                            <button
                                onClick={handleDisconnect}
                                className="flex items-center justify-center h-10 rounded-xl bg-red-500/10 border border-red-500/10 text-muted hover:text-red-400 hover:bg-red-500/20 transition-all"
                                title="Disconnect"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    );

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0b] text-[#e1e2e4] font-sans selection:bg-risk-high/30">
            {/* GitHub Connect Modal */}
            <AnimatePresence>
                {showConnectModal && (
                    <GitHubConnectModal
                        onConnect={handleConnect}
                        onClose={() => setShowConnectModal(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Mobile Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-[280px] bg-surface/95 backdrop-blur-2xl border-r border-white/10 z-[70] flex flex-col md:hidden"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Sidebar Desktop */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarCollapsed ? 80 : 260 }}
                className="hidden md:flex flex-col h-full border-r border-white/5 bg-surface/10 backdrop-blur-xl shrink-0 z-50 overflow-hidden"
            >
                <SidebarContent />
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative">
                <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-surface/30 backdrop-blur-md shrink-0 z-40">
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest">
                                {activeTab === 'projects' ? 'Fleet Management' : currentProject?.name || 'Selection'}
                            </h2>
                            {currentProject && activeTab !== 'projects' && (
                                <span className="text-[10px] text-muted font-mono truncate max-w-[100px] sm:max-w-none hidden sm:block">
                                    {currentProject.fullName}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {!connection && (
                            <button
                                onClick={() => setShowConnectModal(true)}
                                className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black font-black text-[10px] uppercase tracking-tighter shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-95 transition-transform"
                            >
                                <Github size={12} />
                                Connect
                            </button>
                        )}
                        {connection && (
                            <>
                                {selectedProject && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsExportOpen(!isExportOpen)}
                                            className={cn(
                                                "text-[9px] md:text-[10px] font-black px-2 md:px-4 py-1.5 md:py-2 rounded-lg transition-all tracking-widest uppercase border flex items-center gap-1 md:gap-2",
                                                isExportOpen ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10 hover:bg-white/10"
                                            )}
                                        >
                                            <Download size={12} className="md:w-[14px] md:h-[14px]" />
                                            <span className="hidden sm:inline">Export</span>
                                        </button>
                                        <ExportDropdown
                                            isOpen={isExportOpen}
                                            onClose={() => setIsExportOpen(false)}
                                            activeTab={activeTab}
                                            projectId={selectedProject || ''}
                                        />
                                    </div>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="md:hidden flex items-center gap-1 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted hover:text-red-400"
                                    title="Logout"
                                >
                                    <LogOut size={16} />
                                </button>
                            </>
                        )}
                        <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
                    </div>
                </header>


                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {(isAnalysisReady || activeTab === 'projects') ? (
                            <motion.div
                                key={activeTab + (selectedProject || '')}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className={cn(
                                    "max-w-[1400px] mx-auto w-full",
                                    (connection || activeTab !== 'projects') ? "space-y-8 md:space-y-12 pb-20" : "min-h-full flex items-center justify-center text-center py-6 md:py-0"
                                )}
                            >
                                <ErrorBoundary key={`eb-${activeTab}-${projectVersion}`}>
                                    {activeTab === 'projects' && (
                                        <ProjectsGrid
                                            projects={projects}
                                            selectedProject={selectedProject}
                                            analyzingProject={analyzingProject}
                                            isConnected={!!connection}
                                            onSelectProject={handleSelectProject}
                                            onConnect={() => setShowConnectModal(true)}
                                        />
                                    )}
                                    {activeTab === 'overview' && selectedProject && (
                                        <RealDashboard key={`dashboard-${projectVersion}`} projectId={selectedProject} />
                                    )}
                                    {activeTab === 'risk-map' && selectedProject && (
                                        <RealTopology key={`topology-${projectVersion}`} projectId={selectedProject} />
                                    )}
                                    {activeTab === 'history' && selectedProject && (
                                        <RealTrajectory key={`trajectory-${projectVersion}`} projectId={selectedProject} />
                                    )}
                                    {activeTab === 'impact' && selectedProject && (
                                        <RealImpact key={`impact-${projectVersion}`} projectId={selectedProject} />
                                    )}
                                    {activeTab === 'dependencies' && selectedProject && (
                                        <RealDependencies key={`deps-${projectVersion}`} projectId={selectedProject} />
                                    )}
                                    {activeTab === 'concentration' && selectedProject && (
                                        <RealConcentration key={`concentration-${projectVersion}`} projectId={selectedProject} />
                                    )}
                                    {activeTab === 'temporal' && selectedProject && (
                                        <RealTemporal key={`temporal-${projectVersion}`} projectId={selectedProject} />
                                    )}
                                </ErrorBoundary>
                            </motion.div>
                        ) : (
                            <div className="max-w-[1400px] mx-auto space-y-8 md:space-y-12 pb-20">
                                <SkeletonInstrument count={1} height={120} className="rounded-2xl opacity-50" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <SkeletonInstrument count={1} height={180} className="rounded-2xl opacity-40" />
                                    <SkeletonInstrument count={1} height={180} className="rounded-2xl opacity-40" />
                                    <SkeletonInstrument count={1} height={180} className="rounded-2xl opacity-40" />
                                </div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Copyright Footer */}
                    <footer className="text-center py-3 mt-4 border-t border-white/5">
                        <a
                            href="https://github.com/yusufcalisir/RiskSurface"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-muted hover:text-white transition-colors uppercase tracking-widest"
                        >
                            © 2025 RiskSurface — Made by Yusuf Çalışır
                        </a>
                    </footer>
                </div>

                {/* Mobile Tab Bar - Horizontally Scrollable */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-xl border-t border-white/5 z-50 flex items-center overflow-hidden">
                    <div
                        id="mobile-nav-scroll"
                        onScroll={(e) => {
                            const target = e.currentTarget;
                            const atEnd = target.scrollLeft + target.clientWidth >= target.scrollWidth - 10;
                            if (atEnd !== isMobileNavAtEnd) {
                                setIsMobileNavAtEnd(atEnd);
                            }
                        }}
                        className="flex-1 flex items-center gap-8 overflow-x-auto no-scrollbar scroll-smooth px-6"
                    >
                        {navItems.map((item) => {
                            const isActive = activeTab === item.id;
                            const isDisabled = item.id !== 'projects' && !selectedProject;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        if (!isDisabled) setActiveTab(item.id);
                                    }}
                                    className={cn(
                                        "flex flex-col items-center gap-1 shrink-0 transition-all",
                                        isActive ? "text-risk-high" : "text-muted",
                                        isDisabled && "opacity-20"
                                    )}
                                >
                                    <item.icon size={20} />
                                    <span className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Dedicated scroll arrow area */}
                    <div className="h-full px-2 border-l border-white/5 flex items-center bg-surface/40 backdrop-blur-sm shrink-0">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                                const container = document.getElementById('mobile-nav-scroll');
                                if (container) {
                                    if (isMobileNavAtEnd) {
                                        container.scrollTo({ left: 0, behavior: 'smooth' });
                                    } else {
                                        container.scrollBy({ left: 200, behavior: 'smooth' });
                                    }
                                }
                            }}
                            className="p-3 bg-risk-high/10 border border-risk-high/20 rounded-xl active:opacity-60 transition-all"
                        >
                            <motion.div
                                animate={{ rotate: isMobileNavAtEnd ? 180 : 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                <ChevronRight size={18} className="text-risk-high" />
                            </motion.div>
                        </motion.button>
                    </div>
                </div>
            </main>
        </div>
    );
}



// ==================== HELPER COMPONENTS ====================

function ContextIndicator({ label, value, status }: { label: string; value: string; status: 'good' | 'caution' | 'stable' }) {
    const statusColors = {
        good: 'bg-health-good/20 text-health-good',
        caution: 'bg-risk-medium/20 text-risk-medium',
        stable: 'bg-white/10 text-muted'
    };
    return (
        <div className={`px-3 py-1.5 rounded-lg ${statusColors[status]} text-[10px] uppercase tracking-widest font-bold`}>
            <span className="opacity-70">{label}:</span> {value}
        </div>
    );
}

function TrajectoryCard({
    label,
    value,
    sub,
    status,
    signalState
}: {
    label: string;
    value: string;
    sub: string;
    status: 'caution' | 'warning' | 'danger';
    signalState: 'complete' | 'pending';
}) {
    const statusColors = {
        caution: 'border-risk-medium/30 bg-risk-medium/5',
        warning: 'border-risk-high/30 bg-risk-high/5',
        danger: 'border-risk-critical/30 bg-risk-critical/5'
    };
    const statusTextColors = {
        caution: 'text-risk-medium',
        warning: 'text-risk-high',
        danger: 'text-risk-critical'
    };
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-panel rounded-2xl p-6 border ${statusColors[status]} relative overflow-hidden group hover:scale-[1.02] transition-transform`}
        >
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-20 ${status === 'danger' ? 'bg-risk-critical' : status === 'warning' ? 'bg-risk-high' : 'bg-risk-medium'}`} />
            <div className="relative">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-muted font-black">{label}</span>
                    <div className={`w-2 h-2 rounded-full ${signalState === 'complete' ? 'bg-health-good' : 'bg-risk-medium animate-pulse'}`} />
                </div>
                <h3 className={`text-2xl font-bold ${statusTextColors[status]} mb-1`}>{value}</h3>
                <p className="text-[11px] text-muted">{sub}</p>
            </div>
        </motion.div>
    );
}
