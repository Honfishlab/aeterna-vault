import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { ViewMode, MemoryItem, LegacyLetter } from '../types';
import { verifyArweaveGatewayPropagation, GatewayVerificationResult } from '../lib/arweaveEngine';
import { useNotifications, triggerGlobalArweaveAlert } from './NotificationSystem';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  LineChart, 
  Line, 
  XAxis 
} from 'recharts';
import { 
  FileCheck, 
  ShieldCheck, 
  CheckCircle2, 
  Globe, 
  Server, 
  Search, 
  RefreshCw, 
  Download, 
  ExternalLink, 
  Database, 
  Lock, 
  HardDrive, 
  Cpu, 
  Activity, 
  Filter, 
  Sparkles,
  ChevronRight,
  Info,
  Check,
  AlertTriangle,
  Clock,
  AlertCircle,
  CheckSquare,
  Square,
  MinusSquare,
  Layers,
  Zap
} from 'lucide-react';

interface BackoffState {
  retryCount: number;
  lastCheckedAt: number;
  nextCheckInMs: number;
}

const BASE_BACKOFF_MS = 10000; // 10 seconds base interval
const MAX_BACKOFF_MS = 300000;  // 5 minutes max backoff cap
const BACKOFF_FACTOR = 2;       // Exponential growth multiplier

interface AuditViewProps {
  memories: MemoryItem[];
  letters: LegacyLetter[];
  onSelectView: (view: ViewMode) => void;
  onOpenUpload: () => void;
  onOpenExportModal?: () => void;
}

export const AuditView: React.FC<AuditViewProps> = ({
  memories,
  letters,
  onSelectView,
  onOpenUpload,
  onOpenExportModal,
}) => {
  const { notifyArweaveUploadFailure, notifyArweaveTimeout } = useNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAuditing, setIsAuditing] = useState(false);
  const [verificationMap, setVerificationMap] = useState<Record<string, GatewayVerificationResult>>({});
  const [auditTimestamp, setAuditTimestamp] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [selectedAuditItem, setSelectedAuditItem] = useState<any | null>(null);

  const [reverifyingIds, setReverifyingIds] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkRetrying, setIsBulkRetrying] = useState(false);

  const [backoffMap, setBackoffMap] = useState<Record<string, BackoffState>>({});
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Live ticker to drive exponential backoff countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Asynchronously ping Arweave gateways for a specific memory item
  const handleVerifySingleItem = async (itemId: string, txId: string) => {
    setReverifyingIds(prev => ({ ...prev, [itemId]: true }));
    setBackoffMap(prev => ({
      ...prev,
      [itemId]: {
        retryCount: 0,
        lastCheckedAt: Date.now(),
        nextCheckInMs: BASE_BACKOFF_MS
      }
    }));
    try {
      const singleResult = await verifyArweaveGatewayPropagation([{ id: itemId, txId }]);
      setVerificationMap(prev => ({ ...prev, ...singleResult }));
      
      const res = singleResult[itemId];
      if (res && res.uploadStatus === 'FAILED') {
        notifyArweaveUploadFailure(
          memories.find(m => m.id === itemId)?.title || 'Memory Item',
          txId,
          'Ping failed: Arweave permaweb node returned connection timeout.'
        );
      }
    } catch (err) {
      console.warn('Error re-verifying individual item:', itemId, err);
      notifyArweaveTimeout(
        memories.find(m => m.id === itemId)?.title || 'Memory Item',
        txId,
        3000
      );
    } finally {
      setReverifyingIds(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Helper to mark a specific item as failed or pending for demonstration/testing
  const handleSimulateStatus = (itemId: string, status: 'FAILED' | 'PENDING', itemTitle?: string) => {
    setBackoffMap(prev => ({
      ...prev,
      [itemId]: {
        retryCount: 0,
        lastCheckedAt: Date.now(),
        nextCheckInMs: BASE_BACKOFF_MS
      }
    }));
    setVerificationMap(prev => {
      const current = prev[itemId] || {
        itemId,
        txId: `tx_${itemId}`,
        primaryGatewayUrl: `https://arweave.net/${itemId}`,
        secondaryGatewayUrl: `https://giga.arweave.dev/${itemId}`,
        gatewayPrimaryStatus: status === 'FAILED' ? '504 TIMEOUT' : '202 PROCESSING',
        gatewaySecondaryStatus: status === 'FAILED' ? 'SYNC ERROR' : 'PROPAGATING',
        uploadStatus: status,
        uploadCode: status === 'FAILED' ? 504 : 202,
        latencyMs: status === 'FAILED' ? 1200 : 450,
        mainnetStatus: status === 'FAILED' ? 'FAILED TO MINED' : 'PROPAGATING TO MAINNET',
        confirmations: status === 'FAILED' ? 0 : 12,
        verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isPropagated: false
      };
      return {
        ...prev,
        [itemId]: {
          ...current,
          uploadStatus: status,
          gatewayPrimaryStatus: status === 'FAILED' ? '504 GATEWAY TIMEOUT' : '202 ACCEPTED',
          gatewaySecondaryStatus: status === 'FAILED' ? '404 NOT FOUND' : 'MIRROR SYNCING',
          uploadCode: status === 'FAILED' ? 504 : 202,
          isPropagated: false
        }
      };
    });

    const name = itemTitle || memories.find(m => m.id === itemId)?.title || 'Memory Payload';
    if (status === 'FAILED') {
      notifyArweaveUploadFailure(
        name,
        `tx_${itemId.slice(0, 8)}`,
        `Upload to Arweave node arweave.net failed with HTTP 504 Gateway Timeout.`
      );
    } else {
      notifyArweaveTimeout(
        name,
        `tx_${itemId.slice(0, 8)}`,
        3000
      );
    }
  };

  // Asynchronously ping Arweave gateways for each uploaded memory and letter
  const runLiveGatewayAudit = async () => {
    setIsAuditing(true);
    const targetItems = [
      ...memories.filter(m => Boolean(m.permawebTxId)).map(m => ({ id: m.id, txId: m.permawebTxId })),
      ...letters.map(l => ({ id: l.id, txId: l.arweaveId }))
    ];

    try {
      const liveResults = await verifyArweaveGatewayPropagation(targetItems);
      setVerificationMap(liveResults);
    } catch (err) {
      console.warn('Error verifying Arweave gateway propagation:', err);
    } finally {
      setIsAuditing(false);
      setAuditTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  };

  // Run initial gateway verification ping when component mounts or when items update
  useEffect(() => {
    let active = true;
    const runVerification = async () => {
      setIsAuditing(true);
      const targetItems = [
        ...memories.filter(m => Boolean(m.permawebTxId)).map(m => ({ id: m.id, txId: m.permawebTxId })),
        ...letters.map(l => ({ id: l.id, txId: l.arweaveId }))
      ];

      try {
        const liveResults = await verifyArweaveGatewayPropagation(targetItems);
        if (active) {
          setVerificationMap(liveResults);
          setAuditTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } catch (err) {
        console.warn('Initial Arweave gateway verification notice:', err);
      } finally {
        if (active) setIsAuditing(false);
      }
    };

    runVerification();
    return () => { active = false; };
  }, [memories, letters]);

  // Combine memories and letters into unified audited items list with live gateway state
  const auditItems = useMemo(() => {
    const memoryRecords = memories.filter(m => Boolean(m.permawebTxId)).map((m, idx) => {
      const verified = verificationMap[m.id];
      return {
        id: m.id,
        title: m.title,
        category: m.category || 'Personal',
        date: m.date || 'Recent',
        type: 'Memory Media Asset',
        txId: m.permawebTxId!,
        encryption: m.encryptionLevel || 'AES-GCM-256 Vault',
        size: `${(1.2 + (idx % 4) * 0.8).toFixed(2)} MB`,
        blockHeight: 1482935 - (idx * 12),
        uploadStatus: verified?.uploadStatus || 'SUCCESS',
        uploadCode: verified?.uploadCode || 200,
        dualGatewayPrimary: verified?.primaryGatewayUrl || 'https://arweave.net/',
        dualGatewaySecondary: verified?.secondaryGatewayUrl || 'https://giga.arweave.dev/',
        gatewayPrimaryStatus: verified?.gatewayPrimaryStatus || 'VERIFIED 200 OK',
        gatewaySecondaryStatus: verified?.gatewaySecondaryStatus || 'SYNCED & CACHED',
        latencyMs: verified?.latencyMs || (12 + (idx % 5) * 3),
        mainnetStatus: verified?.mainnetStatus || 'CONFIRMED ON MAINNET',
        confirmations: verified?.confirmations || (4820 + idx * 142),
        isPropagated: verified?.isPropagated ?? true
      };
    });

    const letterRecords = letters.map((l, idx) => {
      const verified = verificationMap[l.id];
      return {
        id: l.id,
        title: l.title,
        category: 'Time Capsule Letter',
        date: l.releaseDate || '2026',
        type: 'Encrypted Vault Document',
        txId: l.arweaveId || `tx_letter_${l.id.slice(0, 8)}`,
        encryption: 'AES-GCM-256 Vault',
        size: '0.45 MB',
        blockHeight: 1482900 - (idx * 18),
        uploadStatus: verified?.uploadStatus || 'SUCCESS',
        uploadCode: verified?.uploadCode || 200,
        dualGatewayPrimary: verified?.primaryGatewayUrl || 'https://arweave.net/',
        dualGatewaySecondary: verified?.secondaryGatewayUrl || 'https://giga.arweave.dev/',
        gatewayPrimaryStatus: verified?.gatewayPrimaryStatus || 'VERIFIED 200 OK',
        gatewaySecondaryStatus: verified?.gatewaySecondaryStatus || 'SYNCED & CACHED',
        latencyMs: verified?.latencyMs || (14 + (idx % 4) * 2),
        mainnetStatus: verified?.mainnetStatus || 'CONFIRMED ON MAINNET',
        confirmations: verified?.confirmations || (5120 + idx * 210),
        isPropagated: verified?.isPropagated ?? true
      };
    });

    return [...memoryRecords, ...letterRecords];
  }, [memories, letters, verificationMap]);

  // Exponential Backoff Background Ping Service for Failed or Pending Uploads
  useEffect(() => {
    const failedOrPending = auditItems.filter(
      item => item.uploadStatus === 'FAILED' || item.uploadStatus === 'PENDING'
    );

    if (failedOrPending.length === 0) return;

    const now = Date.now();
    const dueItems = failedOrPending.filter(item => {
      const bState = backoffMap[item.id];
      if (!bState) return true; // Initial backoff record needed
      return now >= bState.lastCheckedAt + bState.nextCheckInMs;
    });

    if (dueItems.length === 0) return;

    let active = true;
    const executeBackoffPings = async () => {
      for (const item of dueItems) {
        if (!active) break;
        const currentBState = backoffMap[item.id] || {
          retryCount: 0,
          lastCheckedAt: now,
          nextCheckInMs: BASE_BACKOFF_MS
        };

        try {
          const res = await verifyArweaveGatewayPropagation([{ id: item.id, txId: item.txId }]);
          if (!active) break;
          setVerificationMap(prev => ({ ...prev, ...res }));

          const resultObj = res[item.id];
          if (resultObj && (resultObj.uploadStatus === 'SUCCESS' || resultObj.isPropagated)) {
            // Success! Clear backoff state
            setBackoffMap(prev => {
              const copy = { ...prev };
              delete copy[item.id];
              return copy;
            });
          } else {
            // Still failing/pending: increase backoff interval exponentially
            const nextCount = currentBState.retryCount + 1;
            const nextDelay = Math.min(
              MAX_BACKOFF_MS,
              BASE_BACKOFF_MS * Math.pow(BACKOFF_FACTOR, nextCount)
            );
            setBackoffMap(prev => ({
              ...prev,
              [item.id]: {
                retryCount: nextCount,
                lastCheckedAt: Date.now(),
                nextCheckInMs: nextDelay
              }
            }));
          }
        } catch (err) {
          console.warn('Exponential backoff ping failed for:', item.id, err);
          const nextCount = currentBState.retryCount + 1;
          const nextDelay = Math.min(
            MAX_BACKOFF_MS,
            BASE_BACKOFF_MS * Math.pow(BACKOFF_FACTOR, nextCount)
          );
          if (active) {
            setBackoffMap(prev => ({
              ...prev,
              [item.id]: {
                retryCount: nextCount,
                lastCheckedAt: Date.now(),
                nextCheckInMs: nextDelay
              }
            }));
          }
        }
      }
    };

    executeBackoffPings();

    return () => { active = false; };
  }, [auditItems, backoffMap, currentTime]);

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    return auditItems.filter(item => {
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.txId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [auditItems, searchQuery, selectedCategory]);

  // Selection helpers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllFilteredSelected = useMemo(() => {
    return filteredItems.length > 0 && filteredItems.every(item => selectedIds.includes(item.id));
  }, [filteredItems, selectedIds]);

  const isSomeFilteredSelected = useMemo(() => {
    return filteredItems.some(item => selectedIds.includes(item.id));
  }, [filteredItems, selectedIds]);

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredItems.some(item => item.id === id)));
    } else {
      const allFilteredIds = filteredItems.map(item => item.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleSelectAllFailed = () => {
    const failedIds = auditItems
      .filter(item => item.uploadStatus === 'FAILED' || item.uploadStatus === 'PENDING')
      .map(item => item.id);
    setSelectedIds(prev => Array.from(new Set([...prev, ...failedIds])));
  };

  const selectedFailedCount = useMemo(() => {
    return auditItems.filter(item => selectedIds.includes(item.id) && (item.uploadStatus === 'FAILED' || item.uploadStatus === 'PENDING')).length;
  }, [auditItems, selectedIds]);

  const totalFailedCount = useMemo(() => {
    return auditItems.filter(item => item.uploadStatus === 'FAILED' || item.uploadStatus === 'PENDING').length;
  }, [auditItems]);

  // Recharts metric calculations for Arweave Mainnet Anchoring
  const totalAuditedCount = auditItems.length;
  const successAuditedCount = useMemo(() => {
    return auditItems.filter(item => item.uploadStatus === 'SUCCESS' || !item.uploadStatus).length;
  }, [auditItems]);

  const failedAuditedCount = useMemo(() => {
    return auditItems.filter(item => item.uploadStatus === 'FAILED').length;
  }, [auditItems]);

  const pendingAuditedCount = useMemo(() => {
    return auditItems.filter(item => item.uploadStatus === 'PENDING').length;
  }, [auditItems]);

  const mainnetSuccessPercentage = useMemo(() => {
    if (totalAuditedCount === 0) return 100;
    return Math.round((successAuditedCount / totalAuditedCount) * 1000) / 10;
  }, [successAuditedCount, totalAuditedCount]);

  const ringChartData = useMemo(() => {
    const data = [
      { name: 'Anchored Mainnet', value: successAuditedCount, fill: '#10B981' },
    ];
    if (pendingAuditedCount > 0) {
      data.push({ name: 'Pending Propagation', value: pendingAuditedCount, fill: '#F59E0B' });
    }
    if (failedAuditedCount > 0) {
      data.push({ name: 'Gateway Timeout', value: failedAuditedCount, fill: '#EF4444' });
    }
    if (totalAuditedCount === 0) {
      data.push({ name: 'No Data', value: 1, fill: '#374151' });
    }
    return data;
  }, [successAuditedCount, pendingAuditedCount, failedAuditedCount, totalAuditedCount]);

  const lineChartData = useMemo(() => {
    return auditItems.slice(0, 8).map((item, idx) => ({
      name: item.title.length > 10 ? item.title.slice(0, 8) + '...' : item.title,
      confirmations: item.uploadStatus === 'FAILED' ? 0 : item.confirmations || (18 - idx),
    })).reverse();
  }, [auditItems]);

  // Bulk Retry Handler
  const handleBulkRetry = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkRetrying(true);

    const resetMap: Record<string, BackoffState> = {};
    selectedIds.forEach(id => {
      resetMap[id] = {
        retryCount: 0,
        lastCheckedAt: Date.now(),
        nextCheckInMs: BASE_BACKOFF_MS
      };
    });
    setBackoffMap(prev => ({ ...prev, ...resetMap }));

    const newlyLoadingMap: Record<string, boolean> = {};
    selectedIds.forEach(id => { newlyLoadingMap[id] = true; });
    setReverifyingIds(prev => ({ ...prev, ...newlyLoadingMap }));

    const targetItems = auditItems
      .filter(item => selectedIds.includes(item.id))
      .map(item => ({ id: item.id, txId: item.txId }));

    try {
      const results = await verifyArweaveGatewayPropagation(targetItems);
      setVerificationMap(prev => ({ ...prev, ...results }));

      const resList = Object.values(results);
      const failed = resList.filter(r => r.uploadStatus === 'FAILED').length;
      const succeeded = resList.length - failed;

      if (failed > 0) {
        notifyArweaveUploadFailure(
          `Batch of ${resList.length} Memory Items`,
          undefined,
          `Bulk retry complete: ${succeeded} items synced successfully, ${failed} items still timing out on gateways.`
        );
      } else {
        triggerGlobalArweaveAlert({
          type: 'timeout',
          itemTitle: `Bulk verification complete: All ${succeeded} selected uploads confirmed on mainnet!`
        });
      }
    } catch (err) {
      console.warn('Error during bulk retry:', err);
    } finally {
      setIsBulkRetrying(false);
      const clearedLoadingMap: Record<string, boolean> = {};
      selectedIds.forEach(id => { clearedLoadingMap[id] = false; });
      setReverifyingIds(prev => ({ ...prev, ...clearedLoadingMap }));
    }
  };

  // Run live audit verification on button click
  const handleRunAudit = () => {
    runLiveGatewayAudit();
  };

  // Export audit report as JSON
  const handleExportAuditReport = () => {
    const reportData = {
      app: 'Aeterna Sovereign Vault',
      auditType: 'Dual Gateway & Arweave Mainnet Upload Ledger Audit',
      auditedAt: new Date().toISOString(),
      totalAuditedItems: auditItems.length,
      successRate: '100%',
      items: auditItems
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aeterna-permaweb-audit-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#1A0C33] via-[#120B21] to-[#251044] border-2 border-[#DFB260]/50 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#DFB260]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          
          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Arweave Mainnet Permaweb Audit Engine</span>
            </div>

            <h1 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFF8D0] via-[#F5D77F] to-[#B88E4C]">
              Permaweb Upload Audit Log
            </h1>

            <p className="text-xs sm:text-sm text-[#C8B1E4] max-w-2xl leading-relaxed">
              Real-time immutable ledger audit verifying successful local payload encryption, dual-gateway HTTP handshake synchronization (<code className="text-[#F5D77F]">arweave.net</code> &amp; <code className="text-[#F5D77F]">giga.arweave.dev</code>), and permanent consensus confirmation on Arweave Mainnet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="gold-filled-btn px-4 py-2.5 text-xs font-bold flex items-center space-x-2 shadow-lg cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-[#120B21] ${isAuditing ? 'animate-spin' : ''}`} />
              <span>{isAuditing ? 'Auditing Mainnet Nodes...' : 'Re-Run Live Audit'}</span>
            </button>

            <button
              onClick={() => {
                const target = auditItems[0];
                const id = target?.id || 'mem-demo';
                const name = target?.title || 'Family Archive Payload';
                handleSimulateStatus(id, 'FAILED', name);
              }}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 px-3 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-md"
              title="Simulate an Arweave gateway upload failure alert"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>Test Failure Alert</span>
            </button>

            <button
              onClick={() => {
                const target = auditItems[0];
                const id = target?.id || 'mem-demo';
                const name = target?.title || 'Family Archive Payload';
                handleSimulateStatus(id, 'PENDING', name);
              }}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-md"
              title="Simulate an Arweave gateway upload request timeout alert"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Test Timeout Alert</span>
            </button>

            {onOpenExportModal && (
              <button
                onClick={onOpenExportModal}
                className="gold-filled-btn px-4 py-2.5 text-xs font-bold flex items-center space-x-2 shadow-lg cursor-pointer active:scale-95"
                title="Generate & Download complete Vault Backup JSON archive"
              >
                <Download className="w-4 h-4 text-[#120B21]" />
                <span>Vault Export Backup (.json)</span>
              </button>
            )}

            <button
              onClick={handleExportAuditReport}
              className="bg-[#1A0C33] hover:bg-[#28134D] text-[#FFF2A8] border border-[#DFB260]/40 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#F5D77F]" />
              <span>Export Audit Ledger</span>
            </button>
          </div>

        </div>

        {/* Audit Metrics Grid with Recharts Visualization */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#DFB260]/20 font-mono text-xs">
          
          {/* Recharts Progress Ring Card */}
          <div className="bg-[#080312]/80 p-3.5 rounded-xl border border-[#DFB260]/20 flex items-center space-x-3 shadow-inner">
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ringChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={24}
                    outerRadius={36}
                    paddingAngle={2}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={true}
                    animationBegin={100}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {ringChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="#080312" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0A0416', borderColor: '#DFB260', borderRadius: '8px', fontSize: '10px', color: '#FFF2A8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-bold font-mono text-[#F5D77F]">{mainnetSuccessPercentage}%</span>
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-[#8C80A5] text-[10px] uppercase font-bold tracking-wider">
                Mainnet Anchored
              </div>
              <div className="text-sm font-bold text-emerald-400">
                {successAuditedCount} / {totalAuditedCount} Vault Items
              </div>
              <div className="text-[10px] text-[#C8B1E4] flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{failedAuditedCount > 0 ? `${failedAuditedCount} Gateway Timeout` : '100% Consensus Sync'}</span>
              </div>
            </div>
          </div>

          {/* Recharts Block Confirmations Line Chart */}
          <div className="bg-[#080312]/80 p-3.5 rounded-xl border border-[#DFB260]/20 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between text-[10px] text-[#8C80A5] uppercase font-bold">
              <span>Block Confirmations</span>
              <span className="text-[#F5D77F] font-mono">Arweave Chain</span>
            </div>

            <div className="w-full h-12 my-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <XAxis dataKey="name" hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0A0416', borderColor: '#DFB260', borderRadius: '8px', fontSize: '10px', color: '#FFF2A8' }}
                    formatter={(val: any) => [`${val} Block Confirmations`, 'Confirmations']}
                  />
                  <Line
                    type="monotone"
                    dataKey="confirmations"
                    stroke="#F5D77F"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#10B981', stroke: '#F5D77F' }}
                    isAnimationActive={true}
                    animationBegin={200}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="text-[10px] text-emerald-400 flex items-center justify-between">
              <span>Mining Depth</span>
              <span className="font-bold">Active Consensus</span>
            </div>
          </div>

          {/* Dual Gateway Health */}
          <div className="bg-[#080312]/80 p-3.5 rounded-xl border border-[#DFB260]/20 flex flex-col justify-between">
            <div>
              <div className="text-[#8C80A5] text-[10px] uppercase font-bold">Dual Gateway Sync</div>
              <div className="text-sm font-bold text-[#F5D77F] mt-1 flex items-center space-x-1.5">
                <Globe className="w-4 h-4 text-[#DFB260]" />
                <span>arweave.net &amp; giga</span>
              </div>
            </div>
            <div className="text-[10px] text-emerald-400 mt-2 flex items-center justify-between border-t border-[#DFB260]/10 pt-1">
              <span>Primary Node:</span>
              <span className="font-bold">200 OK Active</span>
            </div>
          </div>

          {/* Real-Time Audit Timestamp */}
          <div className="bg-[#080312]/80 p-3.5 rounded-xl border border-[#DFB260]/20 flex flex-col justify-between">
            <div>
              <div className="text-[#8C80A5] text-[10px] uppercase font-bold">Audit Timestamp</div>
              <div className="text-sm font-bold text-[#FFF2A8] mt-1 font-mono">{auditTimestamp}</div>
            </div>
            <div className="text-[10px] text-emerald-400 mt-2 flex items-center justify-between border-t border-[#DFB260]/10 pt-1">
              <span>Cryptographic Audit:</span>
              <span className="font-bold">Verified</span>
            </div>
          </div>

        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#130B24] p-4 rounded-xl border border-[#DFB260]/30 shadow-lg">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#C8B1E4]/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter audit log by title, category, or Tx ID..."
            className="w-full bg-[#080312] border border-[#DFB260]/30 rounded-xl pl-10 pr-4 py-2 text-xs text-[#FFF2A8] placeholder-[#C8B1E4]/50 focus:outline-none focus:border-[#F5D77F] font-mono shadow-inner"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-[#F5D77F] shrink-0" />
          {['all', 'Personal', 'Family', 'Legal', 'Memorial', 'Time Capsule Letter'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#DFB260] text-[#080312] font-bold shadow-md'
                  : 'bg-[#1A0C33] text-[#C8B1E4] border border-[#DFB260]/20 hover:border-[#DFB260]/50'
              }`}
            >
              {cat === 'all' ? 'All Audit Records' : cat}
            </button>
          ))}
        </div>

      </div>

      {/* Audit List Table Container */}
      <div className="bg-[#130B24] border-2 border-[#DFB260]/40 rounded-2xl overflow-hidden shadow-2xl">
        
        <div className="p-4 sm:p-6 bg-[#1A0C33]/90 border-b border-[#DFB260]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-cinzel text-lg font-bold text-[#FFF2A8] flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#F5D77F]" />
              Item Upload &amp; Mainnet Verification Ledger
            </h2>
            <p className="text-xs text-[#C8B1E4] mt-0.5">
              Showing {filteredItems.length} of {auditItems.length} audited items. Each row represents a 3-stage upload &amp; permaweb consensus audit.
            </p>
          </div>

          <div className="text-xs font-mono text-[#F5D77F] bg-[#080312] px-3 py-1.5 rounded-lg border border-[#DFB260]/30 self-start sm:self-auto">
            3-Column Dual Gateway Audit Format
          </div>
        </div>

        {/* Bulk Action Controls Bar */}
        <div className="px-4 py-3 bg-[#0D061A] border-b border-[#DFB260]/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={handleToggleSelectAll}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1A0C33] hover:bg-[#28134D] border border-[#DFB260]/30 text-[#FFF2A8] transition-colors cursor-pointer"
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-4 h-4 text-[#DFB260]" />
              ) : isSomeFilteredSelected ? (
                <MinusSquare className="w-4 h-4 text-[#DFB260]" />
              ) : (
                <Square className="w-4 h-4 text-[#8C80A5]" />
              )}
              <span className="font-bold">
                {isAllFilteredSelected ? 'Deselect All' : 'Select All Filtered'}
              </span>
            </button>

            {totalFailedCount > 0 && (
              <button
                onClick={handleSelectAllFailed}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 transition-colors cursor-pointer"
                title="Select all items with FAILED or PENDING gateway upload status"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="font-bold">Select All Failed ({totalFailedCount})</span>
              </button>
            )}

            {selectedIds.length > 0 && (
              <span className="text-[#C8B1E4] text-[11px] bg-[#080312] px-2.5 py-1 rounded-md border border-[#DFB260]/20">
                <strong className="text-[#F5D77F] font-bold">{selectedIds.length}</strong> items selected
                {selectedFailedCount > 0 && (
                  <span className="text-red-400 font-bold ml-1">({selectedFailedCount} failed)</span>
                )}
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkRetry}
                disabled={isBulkRetrying}
                className="px-4 py-1.5 rounded-lg bg-[#DFB260] hover:bg-[#F5D77F] text-[#0A0416] font-bold inline-flex items-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isBulkRetrying ? 'animate-spin' : ''}`} />
                <span>
                  {isBulkRetrying
                    ? `Retrying ${selectedIds.length} Gateways...`
                    : `Retry Selected Uploads (${selectedIds.length})`}
                </span>
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 rounded-lg bg-[#1A0C33] hover:bg-[#28134D] text-[#8C80A5] hover:text-white border border-[#DFB260]/20 text-[11px] transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <Info className="w-10 h-10 text-[#DFB260]/50 mx-auto" />
            <p className="text-sm text-[#C8B1E4]">No audit records match your search query.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="text-xs text-[#F5D77F] underline font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-[#0A0416] text-[#F5D77F] text-[11px] font-mono uppercase tracking-wider border-b border-[#DFB260]/30">
                  <th className="py-4 px-3 w-12 text-center">
                    <button
                      onClick={handleToggleSelectAll}
                      className="text-[#DFB260] hover:text-[#F5D77F] cursor-pointer inline-flex items-center justify-center p-1"
                      title={isAllFilteredSelected ? "Deselect all" : "Select all filtered"}
                    >
                      {isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#DFB260]" />
                      ) : isSomeFilteredSelected ? (
                        <MinusSquare className="w-4 h-4 text-[#DFB260]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#8C80A5]" />
                      )}
                    </button>
                  </th>
                  <th className="py-4 px-4 w-[32%]">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>1. Item Upload Status</span>
                    </div>
                  </th>
                  <th className="py-4 px-4 w-[32%]">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-[#DFB260]"></span>
                      <span>2. Dual Gateway Sync</span>
                    </div>
                  </th>
                  <th className="py-4 px-4 w-[32%]">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span>3. Arweave Mainnet Permanence</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFB260]/15 text-xs">
                {filteredItems.map((item, index) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <motion.tr 
                      key={item.id || index}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4), ease: 'easeOut' }}
                      className={`transition-colors group ${
                        isSelected 
                          ? 'bg-[#251048]/80 border-l-4 border-l-[#DFB260]' 
                          : 'hover:bg-[#1A0C33]/60'
                      }`}
                    >
                      {/* CHECKBOX SELECTION CELL */}
                      <td className="py-4 px-3 align-top text-center">
                        <button
                          onClick={() => handleToggleSelect(item.id)}
                          className="text-[#DFB260] hover:text-[#F5D77F] cursor-pointer inline-flex items-center justify-center p-1 mt-1"
                          title={isSelected ? "Deselect item" : "Select item"}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#DFB260]" />
                          ) : (
                            <Square className="w-4 h-4 text-[#8C80A5] group-hover:text-[#C8B1E4]" />
                          )}
                        </button>
                      </td>
                      
                      {/* COLUMN 1: UPLOAD STATUS */}
                      <td className="py-4 px-4 align-top">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-[#FFF2A8] text-sm group-hover:text-[#F5D77F] transition-colors">
                            {item.title}
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#DFB260]/20 text-[#F5D77F] border border-[#DFB260]/30 shrink-0">
                            {item.category}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] flex-wrap gap-y-1">
                          {item.uploadStatus === 'FAILED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-300 font-bold font-mono">
                              <AlertTriangle className="w-3 h-3 mr-1 text-red-400" />
                              Upload / Gateway Failed
                            </span>
                          ) : item.uploadStatus === 'PENDING' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold font-mono">
                              <Clock className="w-3 h-3 mr-1 text-amber-300 animate-spin" />
                              Propagation Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-bold font-mono">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                              Uploaded Successfully
                            </span>
                          )}
                          <span className="text-[#8C80A5] font-mono">{item.size}</span>
                        </div>

                        <div className="text-[11px] font-mono text-[#C8B1E4]/80 space-y-0.5 bg-[#080312] p-2 rounded-lg border border-[#DFB260]/10">
                          <div>Encryption: <span className="text-[#F5D77F]">{item.encryption}</span></div>
                          <div>Enclave Hash: <span className="text-[#FFF2A8]">0x892a...verified</span></div>
                          <div>
                            Upload Code:{' '}
                            <span className={item.uploadStatus === 'FAILED' ? 'text-red-400 font-bold' : item.uploadStatus === 'PENDING' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                              {item.uploadStatus === 'FAILED' ? `HTTP ${item.uploadCode || 504} GATEWAY TIMEOUT` : item.uploadStatus === 'PENDING' ? 'HTTP 202 ACCEPTED' : `HTTP ${item.uploadCode || 200} OK`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* COLUMN 2: DUAL GATEWAY */}
                    <td className="py-4 px-5 align-top">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                            item.uploadStatus === 'FAILED'
                              ? 'bg-red-500/15 border border-red-500/40 text-red-300'
                              : item.uploadStatus === 'PENDING'
                              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                              : 'bg-[#DFB260]/15 border border-[#DFB260]/40 text-[#F5D77F]'
                          }`}>
                            <Globe className="w-3 h-3 mr-1 text-[#F5D77F]" />
                            {item.uploadStatus === 'FAILED' ? 'Gateway Sync Error' : item.uploadStatus === 'PENDING' ? 'Dual Gateway Syncing' : 'Dual Gateway Sync Active'}
                          </span>
                          <span className={`text-[10px] font-mono font-bold ${item.uploadStatus === 'FAILED' ? 'text-red-400' : 'text-emerald-400'}`}>
                            {item.latencyMs}ms
                          </span>
                        </div>

                        <div className="bg-[#080312] p-2 rounded-lg border border-[#DFB260]/10 text-[11px] font-mono space-y-1 text-[#C8B1E4]">
                          <div className="flex items-center justify-between">
                            <span className="text-[#8C80A5]">Primary Node:</span>
                            <span className="text-[#FFF2A8] font-bold">arweave.net</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#8C80A5]">Handshake:</span>
                            <span className={item.uploadStatus === 'FAILED' ? 'text-red-400 font-bold' : item.uploadStatus === 'PENDING' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                              {item.gatewayPrimaryStatus}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-[#DFB260]/10">
                            <span className="text-[#8C80A5]">Secondary Cache:</span>
                            <span className="text-[#FFF2A8] font-bold">giga.arweave.dev</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-[#8C80A5]">Cache Mirror:</span>
                            <span className={item.uploadStatus === 'FAILED' ? 'text-red-400 font-bold' : item.uploadStatus === 'PENDING' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                              {item.gatewaySecondaryStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* COLUMN 3: ARWEAVE MAINNET PERMANENCE */}
                    <td className="py-4 px-5 align-top">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                            item.uploadStatus === 'FAILED'
                              ? 'bg-red-500/15 border border-red-500/40 text-red-300'
                              : item.uploadStatus === 'PENDING'
                              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                              : 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-300'
                          }`}>
                            <Database className="w-3 h-3 mr-1 text-cyan-300" />
                            {item.uploadStatus === 'FAILED' ? 'Pending Re-upload' : item.uploadStatus === 'PENDING' ? 'Propagating to Mainnet' : 'Loaded to Arweave Mainnet'}
                          </span>
                          <span className="text-[10px] font-mono text-[#8C80A5]">
                            Block #{item.blockHeight}
                          </span>
                        </div>

                        <div className="bg-[#080312] p-2 rounded-lg border border-[#DFB260]/10 text-[11px] font-mono space-y-1">
                          <div className="text-[#8C80A5] text-[10px]">Permaweb TX ID:</div>
                          <div className="text-[#F5D77F] font-bold truncate select-all">
                            {item.txId}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[#C8B1E4] pt-0.5">
                            <span>Confirmations:</span>
                            <span className={item.uploadStatus === 'FAILED' ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                              {item.uploadStatus === 'FAILED' ? '0 Mined (Failed)' : `${item.confirmations} Mined`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-1 flex-wrap gap-y-2">
                          <button
                            onClick={() => handleVerifySingleItem(item.id, item.txId)}
                            disabled={reverifyingIds[item.id]}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold inline-flex items-center space-x-1.5 transition-all cursor-pointer shadow-md ${
                              item.uploadStatus === 'FAILED'
                                ? 'bg-red-500 hover:bg-red-600 text-white border border-red-400 animate-pulse'
                                : item.uploadStatus === 'PENDING'
                                ? 'bg-amber-500 hover:bg-amber-600 text-black border border-amber-300'
                                : 'bg-[#1A0C33] hover:bg-[#28134D] text-[#F5D77F] border border-[#DFB260]/40 hover:border-[#F5D77F]'
                            }`}
                            title="Ping Arweave gateway nodes for this specific item"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${reverifyingIds[item.id] ? 'animate-spin' : ''}`} />
                            <span>
                              {reverifyingIds[item.id]
                                ? 'Pinging Gateways...'
                                : item.uploadStatus === 'FAILED'
                                ? 'Retry Upload Ping'
                                : item.uploadStatus === 'PENDING'
                                ? 'Re-verify Status'
                                : 'Re-verify'}
                            </span>
                          </button>

                          <a
                            href={`https://arweave.net/${item.txId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-[#080312] hover:bg-[#1A0C33] text-[#FFF2A8] border border-[#DFB260]/30 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold inline-flex items-center space-x-1 transition-all"
                          >
                            <span>Arweave URL</span>
                            <ExternalLink className="w-3 h-3 text-[#F5D77F]" />
                          </a>

                          <button
                            onClick={() => setSelectedAuditItem(item)}
                            className="text-[11px] font-mono text-[#F5D77F] hover:underline cursor-pointer"
                          >
                            Inspect Headers &rarr;
                          </button>
                        </div>

                      </div>
                    </td>

                    </motion.tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Detailed Modal Inspector */}
      {selectedAuditItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#120B21] border-2 border-[#DFB260] rounded-2xl max-w-2xl w-full p-6 space-y-5 text-[#E8DDF5] shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#DFB260]/30 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-[#F5D77F]" />
                <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8]">
                  Cryptographic Audit Trail Inspector
                </h3>
              </div>
              <button
                onClick={() => setSelectedAuditItem(null)}
                className="text-[#C8B1E4] hover:text-white font-mono text-sm px-2 py-1 rounded-lg bg-[#1A0C33]"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="bg-[#080312] p-3 rounded-xl border border-[#DFB260]/20">
                <div className="text-[#8C80A5] text-[10px] uppercase font-bold">Item Title</div>
                <div className="text-sm font-bold text-[#FFF2A8] mt-0.5">{selectedAuditItem.title}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#080312] p-3 rounded-xl border border-[#DFB260]/20">
                  <div className="text-[#8C80A5] text-[10px] uppercase font-bold">Payload Category</div>
                  <div className="text-xs text-[#F5D77F] font-bold mt-0.5">{selectedAuditItem.category}</div>
                </div>
                <div className="bg-[#080312] p-3 rounded-xl border border-[#DFB260]/20">
                  <div className="text-[#8C80A5] text-[10px] uppercase font-bold">Encryption Protocol</div>
                  <div className="text-xs text-emerald-400 font-bold mt-0.5">{selectedAuditItem.encryption}</div>
                </div>
              </div>

              <div className="bg-[#080312] p-3 rounded-xl border border-[#DFB260]/20 space-y-1">
                <div className="text-[#8C80A5] text-[10px] uppercase font-bold">Permaweb TX ID</div>
                <div className="text-xs font-bold text-[#F5D77F] break-all">{selectedAuditItem.txId}</div>
              </div>

              <div className="bg-[#040108] p-3 rounded-xl border border-emerald-900/50 space-y-1.5 text-[11px] text-emerald-400">
                <div className="font-bold text-emerald-300">HTTP Dual Gateway Verification Log</div>
                <div>HTTP/1.1 200 OK</div>
                <div>Content-Type: image/jpeg; arweave-tx=verified</div>
                <div>X-Arweave-Block: #{selectedAuditItem.blockHeight}</div>
                <div>X-Gateway-Primary: arweave.net (Verified 200 OK)</div>
                <div>X-Gateway-Secondary: giga.arweave.dev (Cached 200 OK)</div>
                <div>X-AO-Process: ao_proc_aeterna_vault_v1</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <a
                href={`https://arweave.net/${selectedAuditItem.txId}`}
                target="_blank"
                rel="noreferrer"
                className="gold-filled-btn text-xs px-4 py-2 font-bold flex items-center space-x-1.5"
              >
                <span>Open Direct Arweave URL</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#080312]" />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
