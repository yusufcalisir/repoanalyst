import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    GitBranch, Star, GitFork, Users, Package, Clock, Activity,
    RefreshCw, AlertCircle, ExternalLink, FolderTree, FileCode,
    TrendingUp, TrendingDown, Minus
} from 'lucide-react';

import { API_BASE } from '../config';
import ActivityHeatMap from './ActivityHeatMap';
import ProjectContextHeader from './ProjectContextHeader';
import RepositoryTree from './RepositoryTree';
import RecommendationCard from './RecommendationCard';

interface RepoMetadata {
    fullName: string;
    description: string;
    defaultBranch: string;
    stars: number;
    forks: number;
    openIssues: number;
    language: string;
    private: boolean;
    createdAt: string;
    pushedAt: string;
}

interface DirectoryInfo {
    path: string;
    fileCount: number;
}

interface DependencyDetail {
    name: string;
    version: string;
    type: string;
}

interface CommitSummary {
    sha: string;
    message: string;
    author: string;
    date: string;
    intent: string;
    confidence: number;
    triggeringSignal: string;
}

interface CommitTimelinePoint {
    date: string;
    count: number;
}

interface CommitActivityWeek {
    total: number;
    week: number;
    days: number[];
}

interface RepoAnalysis {
    fetchedAt: string;
    repoAgeMonths: number;
    daysSinceLastPush: number;
    totalCommits: number;
    commitsLast30Days: number;
    commitsTrend: string;
    contributorCount: number;
    dependencyCount: number;
    fileCount: number;
    directoryCount: number;
    topDirectories: any[];
    dependencies: any[];
    recentCommits: any[];
    commitTimeline: CommitTimelinePoint[];
    commitActivity?: CommitActivityWeek[];
    filesByExtension: Record<string, number>;
    activityScore: number;
    stalenessScore: number;
    teamRiskScore: number;
    docDrift?: {
        available: boolean;
        docCommitCount: number;
        codeCommitCount: number;
        mixedCommitCount: number;
        docChurn: number;
        codeChurn: number;
        driftRatio: number;
        temporalOffset: number;
        classification: string;
        interpretation: string;
    };
    intentAnalysis?: {
        available: boolean;
        reason?: string;
        intents: Record<string, number>;
        percentages: Record<string, number>;
        dominantIntent: string;
        recentFocusShift: string;
        confidenceWarning: boolean;
    };
    structuralDepth?: {
        available: boolean;
        maxDepth: number;
        meanDepth: number;
        medianDepth: number;
        filesPerDepth: Record<string, number>;
        imbalances: string[];
        surfaceRatio: number;
        structureStatus: string;
    };
    volatility?: {
        available: boolean;
        bucketSize: string;
        bucketCounts: number[];
        baselineActivity: number;
        volatilityScore: number;
        classification: string;
        burstPeriods: string[];
        interpretation: string;
    };
    testSurface?: {
        available: boolean;
        productionFileCount: number;
        testFileCount: number;
        surfaceRatio: number;
        testPercentage: number;
        distribution: string;
        mismatchedDeps: boolean;
        testDependenciesFound: string[];
        interpretation: string;
    };
    securityAnalysis?: {
        available: boolean;
        claims: Array<{
            claim: string;
            supportingSignals: string[];
            evidence: string[];
            classification: string;
        }>;
        overallStatus: string;
        interpretation: string;
    };
}

interface Repository {
    id: string;
    url: string;
    name: string;
    owner: string;
    status: string;
    connectedAt: string;
    fullName: string; // Added for validation
    metadata?: RepoMetadata;
    analysis?: RepoAnalysis;
}

interface Props {
    projectId: string;
    onLoadingChange?: (loading: boolean) => void;
    onTabChange?: (tab: string) => void;
}

export default function RealDashboard({ projectId, onLoadingChange, onTabChange }: Props) {
    const [repo, setRepo] = useState<Repository | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [refreshError, setRefreshError] = useState('');

    useEffect(() => {
        onLoadingChange?.(loading);
    }, [loading, onLoadingChange]);

    const fetchAnalysis = async (retryCount = 0) => {
        const MAX_RETRIES = 3;

        // Reset state on each fetch to prevent stale data
        setRepo(null);
        setError('');
        setLoading(true);

        try {
            // PAGE-SPECIFIC ENDPOINT: Fetches only dashboard-relevant data
            const res = await fetch(`${API_BASE}/api/analysis/dashboard`);
            if (!res.ok) {
                setError('No project selected');
                setLoading(false);
                return;
            }
            const data = await res.json();
            if (!data.selected) {
                setError('No project selected');
                setLoading(false);
                return;
            }

            // CRITICAL: Validate response matches expected projectId
            const returnedFullName = data.project?.fullName;
            if (returnedFullName !== projectId) {
                console.warn(`[RealDashboard] Project mismatch: expected ${projectId}, got ${returnedFullName}. Retry ${retryCount + 1}/${MAX_RETRIES}`);
                if (retryCount < MAX_RETRIES) {
                    setTimeout(() => fetchAnalysis(retryCount + 1), 500);
                    return;
                } else {
                    setError(`Project sync issue. Please re-select the project.`);
                    setLoading(false);
                    return;
                }
            }

            // Check if analysis data exists
            if (!data.analysis) {
                setError(`Project ${projectId} has no analysis data. Please re-analyze.`);
                setLoading(false);
                return;
            }

            // Map to expected format
            setRepo({
                id: data.project.id?.toString() || '',
                url: `https://github.com/${data.project.fullName}`,
                name: data.project.name,
                owner: data.project.owner,
                status: data.project.analysisState,
                connectedAt: data.project.updatedAt,
                fullName: data.project.fullName,
                metadata: {
                    fullName: data.project.fullName,
                    description: data.project.description,
                    defaultBranch: data.project.defaultBranch,
                    stars: data.project.stars,
                    forks: data.project.forks || 0,
                    openIssues: 0,
                    language: data.project.language,
                    private: data.project.private,
                    createdAt: data.project.updatedAt,
                    pushedAt: data.project.updatedAt
                },
                analysis: data.analysis
            });
            setError('');
        } catch (err) {
            setError('Failed to fetch analysis data');
        }
        setLoading(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setRefreshError('');
        try {
            const res = await fetch(`${API_BASE}/api/analysis/refresh`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                // Use the response body directly instead of making another call
                if (data.analysis && data.project) {
                    setRepo({
                        id: data.project.id?.toString() || '',
                        url: `https://github.com/${data.project.fullName}`,
                        name: data.project.name || projectId.split('/')[1],
                        owner: data.project.owner || projectId.split('/')[0],
                        status: 'ready',
                        connectedAt: new Date().toISOString(),
                        fullName: data.project.fullName,
                        metadata: {
                            fullName: data.project.fullName,
                            description: data.project.description || '',
                            defaultBranch: data.project.defaultBranch || 'main',
                            stars: data.project.stars || 0,
                            forks: data.project.forks || 0,
                            openIssues: 0,
                            language: data.project.language || '',
                            private: data.project.private || false,
                            createdAt: new Date().toISOString(),
                            pushedAt: new Date().toISOString()
                        },
                        analysis: data.analysis
                    });
                } else {
                    // Fallback to fetchAnalysis if response is incomplete
                    await fetchAnalysis();
                }
            } else {
                setRefreshError('Refresh failed. Server returned an error.');
            }
        } catch (err) {
            console.error(err);
            setRefreshError('Refresh failed. Network error.');
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAnalysis();
    }, [projectId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80dvh] gap-6 animate-in fade-in duration-500">
                {/* Stacked bar chart filling animation */}
                <div className="flex items-end gap-2 h-20">
                    {[60, 80, 45, 100, 70, 55, 90].map((h, i) => (
                        <div key={i} className="w-3 bg-white/5 rounded-t-sm overflow-hidden" style={{ height: `${h}%` }}>
                            <div
                                className="w-full bg-gradient-to-t from-purple-500 to-blue-400 rounded-t-sm animate-pulse"
                                style={{
                                    height: '100%',
                                    animation: `fillUp 1.5s ease-in-out infinite`,
                                    animationDelay: `${i * 150}ms`
                                }}
                            />
                        </div>
                    ))}
                </div>
                <style>{`
                    @keyframes fillUp {
                        0%, 100% { transform: scaleY(0.3); opacity: 0.5; }
                        50% { transform: scaleY(1); opacity: 1; }
                    }
                `}</style>
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest">Analysis</h3>
                    <p className="text-sm text-white/40 font-medium">Aggregating risk metrics...</p>
                </div>
            </div>
        );
    }

    if (error || !repo) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] gap-4">
                <AlertCircle size={48} className="text-muted" />
                <div className="text-muted text-center">
                    <p className="font-bold">{error || 'No data available'}</p>
                    <p className="text-sm mt-2">Click "Connect" in the sidebar to analyze a repository</p>
                </div>
            </div>
        );
    }

    // Safety check: if repo exists but analysis is missing, show error
    if (!repo.analysis) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] gap-4">
                <AlertCircle size={48} className="text-orange-500" />
                <div className="text-center">
                    <p className="font-bold text-white">Analysis Data Missing</p>
                    <p className="text-sm mt-2 text-muted">This project needs to be re-analyzed.</p>
                    <p className="text-xs mt-1 text-muted">Project: {repo.fullName}</p>
                </div>
            </div>
        );
    }

    const { metadata, analysis } = repo;

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-700 w-full px-4 md:px-6">
            <ProjectContextHeader title="Analysis" projectId={projectId} />

            {/* Repository Info Summary (Compact) */}
            <div className="glass-panel rounded-2xl p-4 md:p-6 border border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border border-white/10 shrink-0 shadow-lg">
                            <GitBranch size={24} className="text-white md:hidden" />
                            <GitBranch size={28} className="text-white hidden md:block" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-sm sm:text-lg md:text-xl font-bold text-white truncate uppercase tracking-tight max-w-[calc(100%-34px)]">{metadata?.description || 'Repository Metadata Active'}</h1>
                                <a
                                    href={repo.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted hover:text-white transition-colors shrink-0 p-1 bg-white/5 rounded-md border border-white/10"
                                >
                                    <ExternalLink size={12} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>


                {/* GitHub Stats - Real Data */}
                <div className="flex flex-wrap gap-x-6 gap-y-3 mt-6 pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2 text-muted">
                        <Star size={14} />
                        <span className="font-bold text-white text-xs">{metadata?.stars || 0}</span>
                        <span className="text-[10px] uppercase font-bold text-white/40">stars</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                        <GitFork size={14} />
                        <span className="font-bold text-white text-xs">{metadata?.forks || 0}</span>
                        <span className="text-[10px] uppercase font-bold text-white/40">forks</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                        <FileCode size={14} />
                        <span className="font-bold text-white text-xs">{analysis?.fileCount || 0}</span>
                        <span className="text-[10px] uppercase font-bold text-white/40">files</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                        <FolderTree size={14} />
                        <span className="font-bold text-white text-xs">{analysis?.directoryCount || 0}</span>
                        <span className="text-[10px] uppercase font-bold text-white/40">dirs</span>
                    </div>
                </div>
            </div>


            {/* Computed Scores - Deterministic from Real Data */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <ScoreCard
                    label="Activity Score"
                    value={analysis?.activityScore?.toFixed(1) || '0'}
                    maxValue="10"
                    description={`${analysis?.commitsLast30Days || 0} commits in last 30 days`}
                    color={analysis?.activityScore && analysis.activityScore >= 5 ? 'green' : analysis?.activityScore && analysis.activityScore >= 2 ? 'yellow' : 'red'}
                    icon={analysis?.commitsTrend === 'active' ? TrendingUp : analysis?.commitsTrend === 'declining' ? TrendingDown : Minus}
                />
                <ScoreCard
                    label="Staleness"
                    value={analysis?.daysSinceLastPush?.toString() || '0'}
                    maxValue="days"
                    description="Since last push"
                    color={analysis?.daysSinceLastPush && analysis.daysSinceLastPush > 30 ? 'red' : analysis?.daysSinceLastPush && analysis.daysSinceLastPush > 7 ? 'yellow' : 'green'}
                    icon={Clock}
                />
                <ScoreCard
                    label="Team Concentration"
                    value={`${analysis?.contributorCount || 0}`}
                    maxValue="contributors"
                    description={analysis?.contributorCount === 1 ? 'Single point of failure risk' : 'Distributed knowledge'}
                    color={analysis?.contributorCount && analysis.contributorCount > 3 ? 'green' : analysis?.contributorCount && analysis.contributorCount > 1 ? 'yellow' : 'red'}
                    icon={Users}
                />
                <ScoreCard
                    label="Dependencies"
                    value={`${analysis?.dependencyCount || 0}`}
                    maxValue="total"
                    description={analysis?.dependencyCount ? 'Parsed from manifest' : 'No dependencies detected'}
                    color={analysis?.dependencyCount && analysis.dependencyCount > 50 ? 'yellow' : 'blue'}
                    icon={Package}
                />
            </div>

            {/* Commit Activity - GitHub Style Heat Map */}
            <div className="glass-panel rounded-2xl p-6">
                <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
                    <Activity size={18} className="text-green-400" />
                    Commit Activity
                    <span className="text-xs font-normal text-muted ml-2">
                        (Yearly contribution records)
                    </span>
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-8">
                    <div className="min-w-0 h-full flex flex-col justify-center">
                        {analysis?.commitActivity ? (
                            <ActivityHeatMap
                                activity={analysis.commitActivity}
                                totalCommits={analysis.totalCommits || 0}
                                hideFooter={true}
                            />
                        ) : (
                            <div className="h-24 flex items-center justify-center bg-white/5 rounded-xl border border-dotted border-white/10 italic text-muted text-sm">
                                Activity analysis pending...
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col justify-between py-1 border-l border-white/5 pl-8">
                        <div className="space-y-8">
                            {/* Intensity Guide - Now at top */}
                            <div className="space-y-3">
                                <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Intensity Guide</div>
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-[3px]">
                                        {[0, 20, 40, 70, 100].map((opacity, level) => {
                                            const colors = ['bg-white/5', 'bg-green-500/20', 'bg-green-500/40', 'bg-green-500/70', 'bg-green-500'];
                                            return (
                                                <div
                                                    key={level}
                                                    className={`w-3.5 h-3.5 rounded-[2px] ${colors[level]} border border-white/5`}
                                                />
                                            );
                                        })}
                                    </div>
                                    <span className="text-[9px] text-white/30 lowercase italic">less → more</span>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* Volatility Index & Daily Baseline - Now below */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-[9px] uppercase font-black text-white/30 tracking-widest leading-none mb-1">Volatility Index</div>
                                        <div className={`text-base font-black italic ${analysis.volatility?.classification === 'Low' ? 'text-green-400' :
                                            analysis.volatility?.classification === 'Moderate' ? 'text-yellow-400' : 'text-risk-high'
                                            }`}>
                                            {analysis.volatility?.volatilityScore.toFixed(2)} {analysis.volatility?.classification}
                                        </div>
                                    </div>
                                    {analysis.volatility?.burstPeriods && analysis.volatility.burstPeriods.length > 0 && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-risk-high/10 border border-risk-high/20">
                                            <Activity size={12} className="text-risk-high animate-pulse" />
                                            <span className="text-[9px] font-black text-risk-high uppercase tracking-tight">
                                                {analysis.volatility.burstPeriods.length} Bursts
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="text-[9px] uppercase font-black text-white/30 tracking-widest leading-none mb-1">Daily Baseline</div>
                                    <div className="text-sm font-bold text-white lowercase normal-case tracking-normal italic font-sans leading-none">
                                        {analysis.volatility?.baselineActivity.toFixed(1)} <span className="text-[9px] text-white/40 font-medium">commits/day</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 text-[9px] text-white/40 italic font-medium font-sans leading-relaxed border-t border-white/5 pt-4">
                            {analysis.volatility?.interpretation}
                        </div>
                    </div>
                </div>
            </div>


            {/* Documentation Drift Analysis - Embedded in Activity/Structure View */}
            {
                analysis?.docDrift && analysis.docDrift.available && (
                    <div className="glass-panel rounded-2xl p-6 border border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5">
                            <FileCode size={120} />
                        </div>
                        <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
                            <RefreshCw size={18} className="text-blue-400" />
                            Documentation Drift Analysis
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Status Signal */}
                            <div className="space-y-4">
                                <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Alignment Status</div>
                                <div className={`text-2xl font-black ${analysis.docDrift.classification === 'Aligned' ? 'text-green-400' :
                                    analysis.docDrift.classification === 'Code-leading' ? 'text-risk-high' : 'text-blue-400'
                                    }`}>
                                    {analysis.docDrift.classification}
                                </div>
                                <p className="text-xs text-white/50 leading-relaxed italic">
                                    "{analysis.docDrift.interpretation}"
                                </p>
                            </div>

                            {/* Velocity Metrics */}
                            <div className="space-y-4">
                                <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Evolution Metrics</div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xl font-bold text-white">{analysis.docDrift.docCommitCount + analysis.docDrift.mixedCommitCount}</div>
                                        <div className="text-[10px] text-white/30 uppercase font-black">Doc Commits</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold text-white">{analysis.docDrift.codeCommitCount + analysis.docDrift.mixedCommitCount}</div>
                                        <div className="text-[10px] text-white/30 uppercase font-black">Code Commits</div>
                                    </div>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                                    <div
                                        className="h-full bg-blue-500"
                                        style={{ width: `${(analysis.docDrift.docCommitCount / (analysis.docDrift.docCommitCount + analysis.docDrift.codeCommitCount + 0.1)) * 100}%` }}
                                    />
                                    <div
                                        className="h-full bg-risk-high"
                                        style={{ width: `${(analysis.docDrift.codeCommitCount / (analysis.docDrift.docCommitCount + analysis.docDrift.codeCommitCount + 0.1)) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Temporal Lead/Lag */}
                            <div className="space-y-4">
                                <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Temporal Synchrony</div>
                                <div className="flex items-end gap-2">
                                    <div className="text-3xl font-black text-white">
                                        {Math.abs(analysis.docDrift.temporalOffset).toFixed(1)}
                                    </div>
                                    <div className="text-xs font-bold text-white/40 mb-1">Days {analysis.docDrift.temporalOffset > 0 ? 'Lead' : 'Lag'}</div>
                                </div>
                                <div className="text-[10px] text-white/30 font-medium leading-relaxed">
                                    {analysis.docDrift.temporalOffset > 0
                                        ? "Documentation typically precedes code changes (Doc-First)."
                                        : "Code changes occur before documentation updates (Lagging Docs)."}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                {/* Top Directories - Real File Structure */}
                <div className="glass-panel rounded-2xl p-6 h-full flex flex-col">
                    <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
                        <FolderTree size={18} />
                        Repository Structure
                        <span className="text-xs font-normal text-muted">(from Git tree API)</span>
                    </h3>
                    {analysis?.topDirectories && analysis.topDirectories.length > 0 ? (
                        <div className="flex-1 flex flex-col justify-between space-y-8">
                            <div className="space-y-3">
                                {analysis.topDirectories.map((dir, i) => {
                                    const maxFiles = analysis.topDirectories[0]?.fileCount || 1;
                                    const width = (dir.fileCount / maxFiles) * 100;
                                    return (
                                        <div key={dir.path} className="flex items-center gap-3">
                                            <span className="text-sm text-muted w-24 truncate font-mono">/{dir.path}</span>
                                            <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${width}%` }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="h-full bg-blue-500/50 rounded-full"
                                                />
                                            </div>
                                            <span className="text-[10px] text-white/40 font-bold w-6">{dir.fileCount}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex-1 flex flex-col justify-end space-y-8">
                                {/* Structural Depth Analysis Signal */}
                                {analysis.structuralDepth && analysis.structuralDepth.available && (
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <div className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-1">Structural Depth</div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xl font-black text-white">{analysis.structuralDepth.maxDepth}</span>
                                                    <span className="text-[10px] text-white/40 font-bold uppercase">Max Layers</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-1">Stability Status</div>
                                                <div className="text-xs font-bold text-blue-400 capitalize">{analysis.structuralDepth.structureStatus}</div>
                                            </div>
                                        </div>

                                        {/* Depth Distribution Sparkline */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-[9px] text-white/20 uppercase font-black px-1">
                                                <span>Root</span>
                                                <span>Deepest</span>
                                            </div>
                                            <div className="flex items-end gap-1 h-8 px-1">
                                                {Object.entries(analysis.structuralDepth.filesPerDepth).map(([depth, count]) => {
                                                    const maxInDepth = Math.max(...Object.values(analysis.structuralDepth?.filesPerDepth || {}));
                                                    const height = (count / maxInDepth) * 100;
                                                    return (
                                                        <div
                                                            key={depth}
                                                            className="flex-1 bg-white/10 rounded-t-sm hover:bg-blue-400/40 transition-colors group relative"
                                                            style={{ height: `${height}%` }}
                                                        >
                                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black text-[9px] px-1.5 py-0.5 rounded border border-white/10 whitespace-nowrap z-30">
                                                                Depth {depth}: {count} files
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Imbalances */}
                                        {analysis.structuralDepth.imbalances.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {analysis.structuralDepth.imbalances.map(imbalance => (
                                                    <div key={imbalance} className="px-2 py-0.5 rounded bg-risk-high/10 border border-risk-high/20 text-[9px] font-black text-risk-high uppercase tracking-tight">
                                                        {imbalance}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Test Surface Analysis Signal */}
                                {analysis.testSurface && analysis.testSurface.available && (
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-1">Test Surface Ratio</div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xl font-black text-white">{analysis.testSurface.testFileCount}</span>
                                                    <span className="text-[10px] text-white/40 font-bold uppercase">Test Files ({analysis.testSurface.surfaceRatio.toFixed(1)}%)</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-1">Distribution</div>
                                                <div className="text-xs font-bold text-green-400 capitalize">{analysis.testSurface.distribution}</div>
                                            </div>
                                        </div>

                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                                            <div
                                                className="h-full bg-blue-500/80"
                                                style={{ width: `${100 - analysis.testSurface.testPercentage}%` }}
                                            />
                                            <div
                                                className="h-full bg-green-500"
                                                style={{ width: `${analysis.testSurface.testPercentage}%` }}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between text-[10px]">
                                            <div className="flex items-center gap-1.5 p-1 rounded hover:bg-white/5 transition-colors group relative">
                                                <div className="w-2 h-2 rounded-full bg-blue-500/80" />
                                                <span className="text-white/40 font-bold uppercase">Prod: {analysis.testSurface.productionFileCount}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 p-1 rounded hover:bg-white/5 transition-colors group relative">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                <span className="text-white/40 font-bold uppercase">Test: {analysis.testSurface.testFileCount}</span>
                                            </div>
                                        </div>

                                        {/* Warnings & Dependencies */}
                                        <div className="space-y-2">
                                            <div className="text-[10px] text-white/30 italic">
                                                {analysis.testSurface.interpretation}
                                            </div>
                                            {analysis.testSurface.mismatchedDeps && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-[9px] font-black text-yellow-500 uppercase tracking-tight">
                                                    <AlertCircle size={12} />
                                                    Test dependencies found but no local test surface detected
                                                </div>
                                            )}
                                            {analysis.testSurface.testDependenciesFound.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 opacity-50">
                                                    {analysis.testSurface.testDependenciesFound.slice(0, 3).map(dep => (
                                                        <span key={dep} className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 font-mono">
                                                            {dep}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Privacy & Security Signal Consistency Signal */}
                                {analysis.securityAnalysis && analysis.securityAnalysis.available && (
                                    <div className="pt-4 border-t border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-1">Security Corroboration</div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xl font-black text-white">{analysis.securityAnalysis.overallStatus}</span>
                                                    <span className="text-[10px] text-white/40 font-bold uppercase">Consistency</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-1">Claims Verified</div>
                                                <div className="text-xs font-bold text-blue-400">
                                                    {analysis.securityAnalysis.claims.filter(c => c.classification !== 'Uncorroborated').length}/{analysis.securityAnalysis.claims.length}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {analysis.securityAnalysis.claims.map(claim => (
                                                <div key={claim.claim} className="p-2 rounded bg-white/5 border border-white/10 space-y-1.5 hover:bg-white/10 transition-colors">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] font-bold text-white uppercase">{claim.claim}</span>
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${claim.classification === 'Supported' ? 'text-green-400 bg-green-400/10' :
                                                            claim.classification === 'Weakly Supported' ? 'text-yellow-400 bg-yellow-400/10' :
                                                                'text-risk-high bg-risk-high/10'
                                                            }`}>
                                                            {claim.classification}
                                                        </span>
                                                    </div>
                                                    {claim.supportingSignals.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {claim.supportingSignals.slice(0, 3).map(sig => (
                                                                <span key={sig} className="text-[8px] text-white/40 font-mono truncate max-w-[100px]">
                                                                    {sig.split('/').pop()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-[10px] text-white/30 italic leading-tight">
                                            "{analysis.securityAnalysis.interpretation}"
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-hidden">
                            <RepositoryTree projectId={projectId} />
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-6 w-full">
                    <RecommendationCard onTabChange={onTabChange} />
                    {/* File Extensions - Real Data */}
                    <div className="glass-panel rounded-2xl p-6">
                        <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                            <FileCode size={18} />
                            File Types
                            <span className="text-xs font-normal text-muted">(parsed from repository)</span>
                        </h3>
                        {analysis?.filesByExtension && Object.keys(analysis.filesByExtension).length > 0 ? (
                            <div className="space-y-4">
                                {(() => {
                                    const total = Object.values(analysis.filesByExtension).reduce((a, b) => a + b, 0);
                                    const sorteddata = Object.entries(analysis.filesByExtension)
                                        .sort(([, a], [, b]) => b - a)
                                        .slice(0, 8); // Top 8

                                    const colors = [
                                        'bg-blue-500', 'bg-yellow-500', 'bg-green-500', 'bg-red-500',
                                        'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-cyan-500'
                                    ];

                                    return (
                                        <>
                                            {/* Stacked Bar */}
                                            <div className="h-3 w-full flex rounded-full overflow-hidden bg-white/5">
                                                {sorteddata.map(([ext, count], i) => (
                                                    <div
                                                        key={ext}
                                                        className={`h-full ${colors[i % colors.length]}`}
                                                        style={{ width: `${(count / total) * 100}%` }}
                                                        title={`${ext || 'no ext'}: ${count} files`}
                                                    />
                                                ))}
                                                <div className="h-full bg-white/10 flex-1" title="Other" />
                                            </div>

                                            {/* Legend Grid */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {sorteddata.map(([ext, count], i) => (
                                                    <div key={ext} className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} />
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-white">{ext || 'No Extension'}</span>
                                                            <span className="text-[10px] text-muted">{((count / total) * 100).toFixed(1)}% ({count})</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="text-muted text-sm">No file type data available</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Commit Intent Aggregation - Embedded Activity Signal */}
            {
                analysis?.intentAnalysis && analysis.intentAnalysis.available && (
                    <div className="glass-panel rounded-2xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                <Activity size={18} className="text-purple-400" />
                                Commit Intent Distribution
                            </h3>
                            {analysis.intentAnalysis.confidenceWarning && (
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold text-yellow-500 uppercase tracking-tight">
                                    <AlertCircle size={12} />
                                    Intent signals are weak
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-1 border-r border-white/5 pr-6">
                                <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1">Dominant Focus</div>
                                <div className="text-2xl font-black text-white capitalize">{analysis.intentAnalysis.dominantIntent}</div>
                                <p className="text-xs text-white/40 mt-2 leading-relaxed italic">
                                    "{analysis.intentAnalysis.recentFocusShift}"
                                </p>
                            </div>

                            <div className="md:col-span-3 flex items-center gap-2 h-12">
                                {Object.entries(analysis.intentAnalysis.percentages)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([intent, percent]) => (
                                        <div
                                            key={intent}
                                            className="h-full rounded-lg relative group transition-all"
                                            style={{
                                                width: `${percent}%`,
                                                backgroundColor: intent === 'feature' ? '#22c55e' :
                                                    intent === 'fix' ? '#ef4444' :
                                                        intent === 'perf' ? '#a855f7' :
                                                            intent === 'refactor' ? '#eab308' :
                                                                intent === 'docs' ? '#3b82f6' :
                                                                    intent === 'test' ? '#06b6d4' :
                                                                        intent === 'chore' ? '#71717a' : '#27272a',
                                                opacity: 0.6
                                            }}
                                        >
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black/95 text-white text-[10px] px-2 py-1.5 rounded-lg border border-white/10 z-20 shadow-xl whitespace-nowrap">
                                                <div className="font-black uppercase">{intent}</div>
                                                <div className="font-mono">{percent.toFixed(1)}% ({analysis.intentAnalysis?.intents[intent]} commits)</div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Recent Commits - Real Data with Intent Labels */}
            <div className="glass-panel rounded-2xl p-6">
                <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                    <GitBranch size={18} />
                    Recent Commits
                    <span className="text-xs font-normal text-muted">(from GitHub API)</span>
                </h3>
                <div className="space-y-3">
                    {analysis?.recentCommits?.slice(0, 8).map((commit, i) => (
                        <motion.div
                            key={commit.sha}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/5 group hover:border-white/10 transition-colors"
                        >
                            <code className="text-[10px] text-green-400 font-mono bg-green-400/10 px-2 py-1 rounded shrink-0">
                                {commit.sha}
                            </code>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-bold text-white truncate">{commit.message}</p>
                                    {commit.intent && (
                                        <div className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tight shrink-0 border ${commit.intent === 'feature' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            commit.intent === 'fix' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                commit.intent === 'perf' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                    commit.intent === 'refactor' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                        commit.intent === 'docs' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                            'bg-white/5 text-white/40 border-white/10'
                                            }`}>
                                            {commit.intent}
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-white/30 font-medium">
                                    {commit.author} • {new Date(commit.date).toLocaleDateString()}
                                    {commit.triggeringSignal && commit.confidence > 0.6 && (
                                        <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-white/5 text-[9px] text-white/20 capitalize">
                                            Signal: {commit.triggeringSignal.replace('_', ' ')}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </motion.div>
                    )) || (
                            <div className="text-muted text-sm">No commits found</div>
                        )}
                </div>
            </div>

            {/* Data Source Badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                All data derived from real GitHub API • Last fetched: {analysis?.fetchedAt ? new Date(analysis.fetchedAt).toLocaleString() : 'Unknown'}
            </div>
        </div >
    );
}

function ScoreCard({
    label,
    value,
    maxValue,
    description,
    color,
    icon: Icon
}: {
    label: string;
    value: string;
    maxValue: string;
    description: string;
    color: 'blue' | 'green' | 'red' | 'yellow';
    icon: React.ElementType;
}) {
    const colors = {
        blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20',
        green: 'from-green-500/20 to-green-500/5 border-green-500/20',
        red: 'from-red-500/20 to-red-500/5 border-red-500/20',
        yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20'
    };

    const iconColors = {
        blue: 'text-blue-400',
        green: 'text-green-400',
        red: 'text-red-400',
        yellow: 'text-yellow-400'
    };

    return (
        <div className={`rounded-xl p-3 md:p-4 bg-gradient-to-br ${colors[color]} border shadow-xl flex flex-col justify-between h-full`}>
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Icon size={14} className={iconColors[color]} />
                    <span className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-widest font-black shrink-0">{label}</span>
                </div>
                <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tighter leading-tight">{value}</span>
                    <span className="text-[9px] md:text-[10px] text-white/20 font-bold uppercase">{maxValue}</span>
                </div>
            </div>
            <div className="text-[9px] md:text-[10px] text-white/40 mt-1 font-medium leading-tight">{description}</div>
        </div>
    );
}
