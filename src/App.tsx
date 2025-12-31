import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

    Github,
    LogOut,
    FolderKanban,
    Loader2
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
import ScopeIndicator from './components/ScopeIndicator';

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
    { id: 'analysis', label: 'Analysis', icon: LayoutDashboard },
    { id: 'risk-map', label: 'System Topology', icon: Map },
    { id: 'history', label: 'Risk Trajectory', icon: History },
    { id: 'impact', label: 'Impact Surface', icon: Files },
    { id: 'dependencies', label: 'Dependencies', icon: GitBranch },
    { id: 'concentration', label: 'Concentration', icon: Activity },
    { id: 'temporal', label: 'Temporal Hotspots', icon: Clock },
];

export default function App() {
    console.log('[DEBUG] App component rendering...')

    // Router hooks
    const navigate = useNavigate();
    const location = useLocation();
    const contentRef = useRef<HTMLDivElement>(null);

    // Connection state
    const [connection, setConnection] = useState<GitHubConnection | null>(null);
    const [isCheckingConnection, setIsCheckingConnection] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);

    // Projects state
    const [projects, setProjects] = useState<DiscoveredRepo[]>([]);
    const [selectedProject, setSelectedProject] = useState<string | null>(() => {
        // Restore from sessionStorage on mount
        return sessionStorage.getItem('selectedProject') || null;
    });
    const [analyzingProject, setAnalyzingProject] = useState<string | null>(null);

    // Cached analyzed projects in session
    const [analyzedProjects, setAnalyzedProjects] = useState<Set<string>>(() => {
        const saved = sessionStorage.getItem('analyzedProjects');
        return saved ? new Set(JSON.parse(saved)) : new Set();
    });

    // Project isolation: version counter increments on every project switch
    // This forces all child components to refetch their data
    const [projectVersion, setProjectVersion] = useState(0);

    // UI state
    const [activeTab, setActiveTab] = useState('projects');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isAnalysisReady, setIsAnalysisReady] = useState(true);
    const [isTabLoading, setIsTabLoading] = useState(false);

    // Tab-level cache: { "owner/repo": { "dashboard": data, "trajectory": data, ... } }
    const [tabCache, setTabCache] = useState<Record<string, Record<string, unknown>>>({});

    // Cache update callback for tab components
    const handleCacheUpdate = useCallback((projectId: string, tabName: string, data: unknown) => {
        setTabCache(prev => ({
            ...prev,
            [projectId]: {
                ...(prev[projectId] || {}),
                [tabName]: data
            }
        }));
    }, []);

    // Get cached data for a specific project/tab
    const getCachedData = useCallback((projectId: string, tabName: string) => {
        return tabCache[projectId]?.[tabName];
    }, [tabCache]);


    // Scroll reset on navigation (Tab or Project change)
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [activeTab, selectedProject]);

    // URL parsing on initial load
    useEffect(() => {
        const path = location.pathname;
        if (path === '/' || path === '/projects') {
            setActiveTab('projects');
        } else {
            // Parse /{owner}/{repo}/{tab} format (e.g., /owner/repo/overview)
            const parts = path.split('/').filter(Boolean);
            if (parts.length >= 3) {
                // owner/repo/tab format
                const projectName = `${parts[0]}/${parts[1]}`;
                const tab = parts[2];
                if (projectName && navItems.find(n => n.id === tab)) {
                    setSelectedProject(projectName);
                    setActiveTab(tab);
                }
            } else if (parts.length === 1) {
                // Just a tab name without project
                const tab = parts[0];
                if (navItems.find(n => n.id === tab)) {
                    setActiveTab(tab);
                }
            }
        }
    }, []); // Only on mount

    // Sync URL when activeTab or selectedProject changes
    useEffect(() => {
        if (activeTab === 'projects') {
            if (location.pathname !== '/projects') {
                navigate('/projects', { replace: true });
            }
        } else if (selectedProject && activeTab !== 'projects') {
            // Use direct path without encoding: /owner/repo/tab
            const expectedPath = `/${selectedProject}/${activeTab}`;
            if (location.pathname !== expectedPath) {
                navigate(expectedPath, { replace: true });
            }
        }
    }, [activeTab, selectedProject]);

    // Persist selectedProject to sessionStorage
    useEffect(() => {
        if (selectedProject) {
            sessionStorage.setItem('selectedProject', selectedProject);
        } else {
            sessionStorage.removeItem('selectedProject');
        }
    }, [selectedProject]);

    // Persist analyzedProjects to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('analyzedProjects', JSON.stringify([...analyzedProjects]));
    }, [analyzedProjects]);


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
            // Clear all session state
            sessionStorage.removeItem('selectedProject');
            sessionStorage.removeItem('analyzedProjects');
            setAnalyzedProjects(new Set());
            setConnection(null);
            setProjects([]);
            setSelectedProject(null);
            setAnalyzingProject(null);
            setActiveTab('projects');
            setIsMobileMenuOpen(false);
            navigate('/projects');
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
            // Clear all authentication state
            setConnection(null);
            setProjects([]);
            // Clear all navigation and analysis state
            setSelectedProject(null);
            setActiveTab('projects');
            setAnalyzingProject(null);
            setIsAnalysisReady(false);
            setProjectVersion(0);
            // Force navigation to projects route
            navigate('/projects');
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

        // Check if project is already analyzed (either from backend state or session cache)
        const project = projects.find(p => p.fullName === fullName);
        const isAnalyzed = project?.analysisState === 'ready' || analyzedProjects.has(fullName);

        if (isAnalyzed) {
            try {
                await fetch(`${API_BASE}/api/projects/selected`, {
                    method: 'POST',
                    body: JSON.stringify({ fullName }),
                    headers: { 'Content-Type': 'application/json' }
                });
                await fetchProjects();
                setActiveTab('analysis');
            } catch (err) {
                console.error('Failed to select project on backend', err);
                setActiveTab('analysis');
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
                // Mark project as analyzed in session
                setAnalyzedProjects(prev => new Set([...prev, fullName]));
                await fetchProjects();
                setActiveTab('analysis');
            }
        } catch (err) {
            console.error('Failed to analyze project');
        }
        setAnalyzingProject(null);
        setIsAnalysisReady(true);
        setIsTabLoading(false);
    };

    const handleTabLoadingChange = useCallback((loading: boolean) => {
        setIsTabLoading(loading);
    }, []);

    // Loading state
    if (isCheckingConnection) {
        return <TacticalLoader />;
    }

    // Get selected project details
    const currentProject = projects.find(p => p.fullName === selectedProject);

    // Sidebar Content Logic...

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
                                    <div className="text-xs font-black text-white truncate lowercase tracking-tight">{connection.username}</div>
                                    {connection.organization && (
                                        <div className="text-[10px] text-white/50 truncate">{connection.organization}</div>
                                    )}
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

                        <div>
                            <button
                                onClick={handleDisconnect}
                                className="flex items-center justify-center h-10 w-full rounded-xl bg-red-500/10 border border-red-500/10 text-muted hover:text-red-400 hover:bg-red-500/20 transition-all"
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
                        <div className="flex flex-col min-w-0">
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-white/20 mb-0.5">
                                {activeTab === 'projects' ? 'Fleet Context' : (currentProject ? 'Project Active' : 'System')}
                            </span>
                            <div className="flex items-baseline gap-2 min-w-0">
                                <h1 className="text-xs sm:text-lg md:text-xl font-black text-white uppercase tracking-tighter truncate max-w-[120px] sm:max-w-none">
                                    {activeTab === 'projects' ? 'Management' : currentProject?.name || 'RiskSurface'}
                                </h1>
                                {currentProject && activeTab !== 'projects' && (
                                    <span className="hidden sm:block text-[9px] uppercase font-bold text-white/20 tracking-widest truncate">
                                        / {currentProject.owner}
                                    </span>
                                )}
                            </div>
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
                            <button
                                onClick={handleLogout}
                                className="md:hidden flex items-center gap-1 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted hover:text-red-400"
                                title="Logout"
                            >
                                <LogOut size={16} />
                            </button>
                        )}
                    </div>
                </header>


                {/* Content Area - No scroll during loading */}
                <div
                    ref={contentRef}
                    className={cn(
                        "flex-1 custom-scrollbar flex flex-col",
                        (isAnalysisReady && !isTabLoading) ? "overflow-y-auto" : "overflow-hidden",
                        (connection || activeTab !== 'projects') ? "p-4 md:p-8 pb-20 md:pb-8" : "p-4 md:px-8 md:pt-0 pb-20 md:pb-2"
                    )}
                >
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
                                    (connection || activeTab !== 'projects') ? "space-y-8 md:space-y-12 pb-4" : "w-full pb-4"
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
                                    {activeTab === 'analysis' && selectedProject && (
                                        <RealDashboard key={`dashboard-${projectVersion}`} projectId={selectedProject} onLoadingChange={handleTabLoadingChange} onTabChange={setActiveTab} />
                                    )}
                                    {activeTab === 'risk-map' && selectedProject && (
                                        <RealTopology key={`topology-${projectVersion}`} projectId={selectedProject} onLoadingChange={handleTabLoadingChange} />
                                    )}
                                    {activeTab === 'history' && selectedProject && (
                                        <RealTrajectory key={`trajectory-${projectVersion}`} projectId={selectedProject} onLoadingChange={handleTabLoadingChange} />
                                    )}
                                    {activeTab === 'impact' && selectedProject && (
                                        <RealImpact key={`impact-${projectVersion}`} projectId={selectedProject} onLoadingChange={handleTabLoadingChange} />
                                    )}
                                    {activeTab === 'dependencies' && selectedProject && (
                                        <RealDependencies key={`deps-${projectVersion}`} projectId={selectedProject} onLoadingChange={handleTabLoadingChange} />
                                    )}
                                    {activeTab === 'concentration' && selectedProject && (
                                        <RealConcentration key={`concentration-${projectVersion}`} projectId={selectedProject} onLoadingChange={handleTabLoadingChange} />
                                    )}
                                    {activeTab === 'temporal' && selectedProject && (
                                        <RealTemporal key={`temporal-${projectVersion}`} projectId={selectedProject} onLoadingChange={handleTabLoadingChange} />
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

                    {/* Copyright Footer - Hidden while loading */}
                    {(isAnalysisReady && !isTabLoading) && (
                        <footer className="text-center py-1 mt-auto opacity-30 hover:opacity-100 transition-opacity">
                            <a
<<<<<<< HEAD
                                href="https://github.com/yusufcalisir"
=======
                                href="https://github.com/yusufcalisir/RiskSurface"
>>>>>>> 53f95687c281acfafc8c76172f6bde49862f70d1
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[8px] text-muted hover:text-white transition-colors uppercase tracking-widest font-black"
                            >
                                © 2025 RiskSurface - Made by Yusuf Çalışır
                            </a>
                        </footer>
                    )}
                </div>

                {/* Mobile Tab Bar - Smooth Centrally Scrollable */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-2xl border-t border-white/10 z-50 flex items-center">
                    <div
                        id="mobile-nav-scroll"
                        className="flex-1 flex items-center gap-10 overflow-x-auto no-scrollbar scroll-smooth px-8 py-2 snap-x snap-mandatory"
                    >
                        {navItems.map((item) => {
                            const isActive = activeTab === item.id;
                            const isDisabled = item.id !== 'projects' && !selectedProject;
                            return (
                                <button
                                    key={item.id}
                                    onClick={(e) => {
                                        if (isDisabled) return;
                                        setActiveTab(item.id);
                                        e.currentTarget.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'nearest',
                                            inline: 'center'
                                        });
                                    }}
                                    className={cn(
                                        "flex flex-col items-center gap-1.5 shrink-0 transition-all snap-center py-1",
                                        isActive ? "text-risk-high scale-110" : "text-muted",
                                        isDisabled && "opacity-20 grayscale pointer-events-none"
                                    )}
                                >
                                    <div className={cn(
                                        "p-2 rounded-xl transition-all",
                                        isActive ? "bg-risk-high/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "bg-transparent"
                                    )}>
                                        <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                    </div>
                                    <span className={cn(
                                        "text-[8px] font-black uppercase tracking-tighter whitespace-nowrap transition-all",
                                        isActive ? "opacity-100" : "opacity-40"
                                    )}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
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

// ==================== PREMIUM LOADER ====================

function TacticalLoader() {
    return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0a0a0b] relative overflow-hidden">
            {/* Background Mesh */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.08),transparent_70%)] opacity-50" />

            <div className="relative flex flex-col items-center">
                {/* Logo Section */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="relative mb-12 w-full max-w-lg px-6"
                >
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 text-center md:text-left">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-risk-high/10 border border-risk-high/20 flex items-center justify-center relative overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.1)] shrink-0">
                            <motion.div
                                animate={{
                                    height: ["20%", "70%", "40%", "90%", "30%"],
                                }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-x-0 bottom-0 bg-risk-high/40"
                            />
                            <Activity size={24} className="text-risk-high relative z-10 md:hidden" />
                            <Activity size={32} className="text-risk-high relative z-10 hidden md:block drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        </div>
                        <h1 className="text-3xl md:text-7xl font-black tracking-[0.1em] md:tracking-[0.25em] text-white selection:bg-risk-high/30 leading-none">
                            RISKSURFACE
                        </h1>
                    </div>

                    {/* Shimmer Effect */}
                    <motion.div
                        animate={{ x: ["-100%", "250%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                        className="absolute inset-x-0 top-0 bottom-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none hidden md:block"
                    />
                </motion.div>

                {/* Status Section */}
                <div className="flex flex-col items-center gap-4 w-full px-6 text-center">
                    <div className="flex items-center justify-center gap-3">
                        <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-2 h-2 rounded-full bg-risk-high shadow-[0_0_10px_rgba(239,68,68,0.8)] shrink-0"
                        />
                        <span className="text-[10px] md:text-sm font-black uppercase tracking-[0.15em] md:tracking-[0.4em] text-white/40 animate-pulse">
                            Initializing Architectural Intelligence Engine
                        </span>
                    </div>

                    <div className="w-48 md:w-64 h-1.5 bg-white/5 rounded-full overflow-hidden relative border border-white/5">
                        <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 3, ease: "easeInOut" }}
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-risk-high/50 to-risk-high shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                        />
                    </div>
                </div>

                {/* Tactical Overlays */}
                <div className="absolute -top-40 -left-40 w-80 h-80 border border-white/[0.01] rounded-full hidden md:block" />
                <div className="absolute -bottom-40 -right-40 w-80 h-80 border border-white/[0.01] rounded-full hidden md:block" />
            </div>

            {/* Bottom Version Tag */}
            <div className="absolute bottom-10 flex flex-col items-center gap-2 w-full px-6 text-center">
                <div className="text-[8px] md:text-[9px] font-black tracking-[0.2em] md:tracking-[0.5em] text-white/20 uppercase">
                    System Core v1.1.2 // Production Ready
                </div>
                <div className="flex gap-4 opacity-10 justify-center">
                    <div className="h-[1px] w-8 md:w-12 bg-white" />
                    <div className="h-[1px] w-8 md:w-12 bg-white" />
                </div>
            </div>
        </div>
    );
}
