import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, FileSpreadsheet, Code, Check, Loader2, Download } from 'lucide-react';

interface ExportDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab?: string;
    projectId?: string;
}

type ExportFormat = 'pdf' | 'csv' | 'json';
type ExportState = 'idle' | 'exporting' | 'complete';

import { API_BASE } from '../config';

export default function ExportDropdown({ isOpen, onClose, activeTab = 'analysis', projectId = '' }: ExportDropdownProps) {
    const [format, setFormat] = useState<ExportFormat>('pdf');
    const [exportState, setExportState] = useState<ExportState>('idle');

    const handleExport = async () => {
        setExportState('exporting');

        try {
            // Include activeTab and projectId in the API call
            const params = new URLSearchParams();
            if (activeTab) params.append('tab', activeTab);
            if (projectId) params.append('project', projectId);

            const response = await fetch(`${API_BASE}/api/export/${format}?${params.toString()}`);

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const extensions: Record<ExportFormat, string> = {
                pdf: 'pdf',
                csv: 'csv',
                json: 'json'
            };

            // Generate descriptive filename with project and tab info
            const projectName = projectId ? projectId.replace('/', '-') : 'risksurface';
            const tabName = activeTab || 'report';
            a.download = `${projectName}_${tabName}_${Date.now()}.${extensions[format]}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setExportState('complete');
            await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
            console.error('Export error:', err);
            alert('Export server not running. Please start the Go server first.');
        }

        setExportState('idle');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    width: 280,
                    backgroundColor: '#111',
                    border: '1px solid #333',
                    borderRadius: 12,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                    zIndex: 50
                }}
            >
                {exportState === 'idle' && (
                    <>
                        <div style={{ padding: 12, borderBottom: '1px solid #333' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Export Format</span>
                        </div>
                        <div style={{ padding: 8 }}>
                            {[
                                { id: 'pdf' as ExportFormat, label: 'PDF Report', desc: 'Professional design', icon: FileText },
                                { id: 'csv' as ExportFormat, label: 'CSV Data', desc: 'Spreadsheet format', icon: FileSpreadsheet },
                                { id: 'json' as ExportFormat, label: 'JSON', desc: 'API-ready data', icon: Code }
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setFormat(f.id)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: 12,
                                        borderRadius: 8,
                                        border: 'none',
                                        cursor: 'pointer',
                                        backgroundColor: format === f.id ? 'rgba(255,255,255,0.1)' : 'transparent'
                                    }}
                                >
                                    <f.icon size={18} color={format === f.id ? '#fff' : '#888'} />
                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: format === f.id ? '#fff' : '#aaa' }}>{f.label}</div>
                                        <div style={{ fontSize: 10, color: '#666' }}>{f.desc}</div>
                                    </div>
                                    {format === f.id && <Check size={16} color="#10b981" />}
                                </button>
                            ))}
                        </div>
                        <div style={{ padding: 12, borderTop: '1px solid #333' }}>
                            <button
                                onClick={handleExport}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: 8,
                                    border: 'none',
                                    backgroundColor: '#fff',
                                    color: '#000',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8
                                }}
                            >
                                <Download size={14} />
                                Export {format.toUpperCase()}
                            </button>
                        </div>
                    </>
                )}
                {exportState === 'exporting' && (
                    <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <Loader2 size={28} color="#fff" className="animate-spin" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Generating...</span>
                    </div>
                )}
                {exportState === 'complete' && (
                    <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <Check size={28} color="#10b981" />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Downloaded!</span>
                    </div>
                )}
            </motion.div>
        </>
    );
}
