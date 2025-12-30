import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Folder,
    FolderOpen,
    File,
    FileCode,
    FileJson,
    FileText,
    ChevronRight,
    ChevronDown,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { API_BASE } from '../config';

interface TreeNode {
    path: string;
    type: 'blob' | 'tree';
    size: number;
}

interface TreeData {
    available: boolean;
    reason?: string;
    nodes: TreeNode[];
    totalFiles: number;
    totalDirs: number;
    truncated: boolean;
}

interface HierarchyNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    size: number;
    children: HierarchyNode[];
    extension?: string;
}

interface Props {
    projectId: string;
}

// Build hierarchical tree from flat path list
function buildHierarchy(nodes: TreeNode[]): HierarchyNode[] {
    const root: HierarchyNode[] = [];
    const pathMap = new Map<string, HierarchyNode>();

    // Sort paths to ensure parents come before children
    const sortedNodes = [...nodes].sort((a, b) => a.path.localeCompare(b.path));

    for (const node of sortedNodes) {
        const parts = node.path.split('/');
        const name = parts[parts.length - 1];
        const extension = node.type === 'blob' ? name.split('.').pop() : undefined;

        const hierarchyNode: HierarchyNode = {
            name,
            path: node.path,
            type: node.type === 'blob' ? 'file' : 'folder',
            size: node.size,
            children: [],
            extension
        };

        pathMap.set(node.path, hierarchyNode);

        if (parts.length === 1) {
            root.push(hierarchyNode);
        } else {
            const parentPath = parts.slice(0, -1).join('/');
            const parent = pathMap.get(parentPath);
            if (parent) {
                parent.children.push(hierarchyNode);
            } else {
                root.push(hierarchyNode);
            }
        }
    }

    // Sort: folders first, then files, alphabetically
    const sortNodes = (nodes: HierarchyNode[]) => {
        nodes.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
        nodes.forEach(n => sortNodes(n.children));
    };
    sortNodes(root);

    return root;
}

// Get file icon based on extension
function getFileIcon(extension?: string) {
    switch (extension?.toLowerCase()) {
        case 'ts':
        case 'tsx':
        case 'js':
        case 'jsx':
        case 'go':
        case 'py':
        case 'java':
        case 'c':
        case 'cpp':
        case 'rs':
            return <FileCode size={14} className="text-blue-400" />;
        case 'json':
            return <FileJson size={14} className="text-yellow-400" />;
        case 'md':
        case 'txt':
        case 'readme':
            return <FileText size={14} className="text-white/50" />;
        default:
            return <File size={14} className="text-white/30" />;
    }
}

// Format file size
function formatSize(bytes: number): string {
    if (bytes === 0) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// Recursive tree node component
function TreeNodeItem({ node, depth = 0, defaultExpanded = false }: { node: HierarchyNode; depth?: number; defaultExpanded?: boolean }) {
    const [expanded, setExpanded] = useState(defaultExpanded && depth < 2);

    const hasChildren = node.children.length > 0;
    const isFolder = node.type === 'folder';

    return (
        <div className="select-none">
            <div
                className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-white/5 transition-colors cursor-pointer group ${depth === 0 ? '' : ''}`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={() => isFolder && setExpanded(!expanded)}
            >
                {isFolder ? (
                    <>
                        <span className="text-white/30 w-4 flex justify-center">
                            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </span>
                        {expanded ?
                            <FolderOpen size={14} className="text-yellow-500/70" /> :
                            <Folder size={14} className="text-yellow-500/50" />
                        }
                    </>
                ) : (
                    <>
                        <span className="w-4" />
                        {getFileIcon(node.extension)}
                    </>
                )}
                <span className={`text-xs font-mono truncate ${isFolder ? 'text-white/80 font-medium' : 'text-white/60'}`}>
                    {node.name}
                </span>
                {isFolder && hasChildren && (
                    <span className="text-[9px] text-white/20 font-bold ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        {node.children.length}
                    </span>
                )}
                {!isFolder && node.size > 0 && (
                    <span className="text-[9px] text-white/20 font-mono ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatSize(node.size)}
                    </span>
                )}
            </div>
            <AnimatePresence>
                {expanded && hasChildren && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        {node.children.map(child => (
                            <TreeNodeItem key={child.path} node={child} depth={depth + 1} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function RepositoryTree({ projectId }: Props) {
    const [treeData, setTreeData] = useState<TreeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTree();
    }, [projectId]);

    const fetchTree = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/api/analysis/tree`);
            const data = await res.json();

            if (data.selected && data.analysis?.tree) {
                setTreeData(data.analysis.tree);
            } else {
                setError('No tree data available');
            }
        } catch (err) {
            setError('Failed to fetch repository tree');
        }
        setLoading(false);
    };

    const hierarchy = useMemo(() => {
        if (!treeData?.nodes) return [];
        return buildHierarchy(treeData.nodes);
    }, [treeData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-white/40">
                <Loader2 size={18} className="animate-spin mr-2" />
                <span className="text-sm">Loading repository structure...</span>
            </div>
        );
    }

    if (error || !treeData?.available) {
        return (
            <div className="flex items-center justify-center py-8 text-white/40 gap-2">
                <AlertCircle size={16} />
                <span className="text-sm">{error || treeData?.reason || 'Repository is empty'}</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats Header */}
            <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-wider text-white/30">
                <span>{treeData.totalFiles} files</span>
                <span className="text-white/10">•</span>
                <span>{treeData.totalDirs} directories</span>
                {treeData.truncated && (
                    <>
                        <span className="text-white/10">•</span>
                        <span className="text-yellow-500/70">Truncated</span>
                    </>
                )}
            </div>

            {/* Tree View */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-white/[0.02] rounded-lg border border-white/5 p-2">
                {hierarchy.length > 0 ? (
                    hierarchy.map(node => (
                        <TreeNodeItem key={node.path} node={node} defaultExpanded={true} />
                    ))
                ) : (
                    <div className="text-center py-4 text-white/40 text-sm">
                        Repository is empty
                    </div>
                )}
            </div>
        </div>
    );
}
