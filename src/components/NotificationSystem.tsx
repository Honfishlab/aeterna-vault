import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  X, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  Info, 
  ShieldAlert,
  Bell,
  Trash2
} from 'lucide-react';

export type NotificationType = 'error' | 'warning' | 'success' | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  txId?: string;
  itemTitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number; // duration in ms (default 7000ms, 0 for sticky)
}

interface NotificationContextType {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp'>) => string;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
  notifyArweaveUploadFailure: (itemTitle: string, txId?: string, errorMsg?: string, onRetry?: () => void) => string;
  notifyArweaveTimeout: (itemTitle: string, txId?: string, timeoutMs?: number, onRetry?: () => void) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Global helper function to trigger Arweave alerts from outside React context
export function triggerGlobalArweaveAlert(detail: {
  type: 'timeout' | 'failure';
  itemTitle?: string;
  txId?: string;
  errorMsg?: string;
  timeoutMs?: number;
}) {
  const event = new CustomEvent('arweave-upload-alert', { detail });
  window.dispatchEvent(event);
}

export const NotificationProvider: React.FC<{ children: React.ReactNode; onViewAuditLog?: () => void }> = ({ 
  children,
  onViewAuditLog
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'timestamp'>) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newNotif: AppNotification = {
      ...notification,
      id,
      timestamp,
      duration: notification.duration ?? 8000
    };

    setNotifications((prev) => [newNotif, ...prev.slice(0, 9)]); // Keep max 10
    return id;
  }, []);

  const notifyArweaveUploadFailure = useCallback((
    itemTitle: string, 
    txId?: string, 
    errorMsg?: string, 
    onRetry?: () => void
  ) => {
    const formattedTx = txId ? `${txId.slice(0, 10)}...${txId.slice(-6)}` : 'tx_pending';
    return addNotification({
      type: 'error',
      title: 'Arweave Upload Operation Failed',
      message: errorMsg || `Failed to upload "${itemTitle}" to Arweave permaweb nodes. Gateway returned error status.`,
      itemTitle,
      txId,
      actionLabel: onRetry ? 'Retry Upload' : 'View Audit Log',
      onAction: () => {
        if (onRetry) {
          onRetry();
        } else if (onViewAuditLog) {
          onViewAuditLog();
        }
      },
      duration: 10000
    });
  }, [addNotification, onViewAuditLog]);

  const notifyArweaveTimeout = useCallback((
    itemTitle: string, 
    txId?: string, 
    timeoutMs: number = 3000, 
    onRetry?: () => void
  ) => {
    const formattedTx = txId ? `${txId.slice(0, 10)}...${txId.slice(-6)}` : 'tx_pending';
    return addNotification({
      type: 'warning',
      title: `Gateway Request Timeout (${timeoutMs}ms)`,
      message: `Arweave node handshake timed out while broadcasting "${itemTitle}" (${formattedTx}). Mainnet sync is delayed.`,
      itemTitle,
      txId,
      actionLabel: onRetry ? 'Re-verify Gateway' : 'Inspect Audit Status',
      onAction: () => {
        if (onRetry) {
          onRetry();
        } else if (onViewAuditLog) {
          onViewAuditLog();
        }
      },
      duration: 12000
    });
  }, [addNotification, onViewAuditLog]);

  // Listen for window custom events for global non-React triggers
  useEffect(() => {
    const handleGlobalAlert = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (!customEvt.detail) return;
      const { type, itemTitle = 'Memory Payload', txId, errorMsg, timeoutMs = 3000 } = customEvt.detail;

      if (type === 'timeout') {
        notifyArweaveTimeout(itemTitle, txId, timeoutMs);
      } else {
        notifyArweaveUploadFailure(itemTitle, txId, errorMsg);
      }
    };

    window.addEventListener('arweave-upload-alert', handleGlobalAlert);
    return () => {
      window.removeEventListener('arweave-upload-alert', handleGlobalAlert);
    };
  }, [notifyArweaveTimeout, notifyArweaveUploadFailure]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        dismissNotification,
        clearAllNotifications,
        notifyArweaveUploadFailure,
        notifyArweaveTimeout
      }}
    >
      {children}
      <NotificationToastContainer 
        notifications={notifications} 
        onDismiss={dismissNotification} 
        onClearAll={clearAllNotifications}
      />
    </NotificationContext.Provider>
  );
};

interface NotificationToastContainerProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

const NotificationToastContainer: React.FC<NotificationToastContainerProps> = ({
  notifications,
  onDismiss,
  onClearAll
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] max-w-md w-full px-4 space-y-3 pointer-events-none">
      {notifications.length > 1 && (
        <div className="flex justify-end pointer-events-auto">
          <button
            onClick={onClearAll}
            className="text-[11px] font-mono text-[#8C80A5] hover:text-[#F5D77F] bg-[#0A0414]/90 border border-[#DFB260]/30 px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-lg cursor-pointer backdrop-blur-md transition-all"
          >
            <Trash2 className="w-3 h-3 text-[#DFB260]" />
            <span>Clear Notifications ({notifications.length})</span>
          </button>
        </div>
      )}

      {notifications.map((notif) => (
        <ToastItem key={notif.id} notification={notif} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ notification: AppNotification; onDismiss: (id: string) => void }> = ({
  notification,
  onDismiss
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification.duration || notification.duration <= 0 || isHovered) return;

    const startTime = Date.now();
    const duration = notification.duration;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (elapsed >= duration) {
        clearInterval(interval);
        onDismiss(notification.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [notification, onDismiss, isHovered]);

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'error':
        return {
          borderColor: 'border-red-500/50',
          bgColor: 'bg-[#18060B]/95',
          glowColor: 'shadow-red-900/30',
          badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
          icon: <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />,
          accentText: 'text-red-400',
          progressBg: 'bg-red-500'
        };
      case 'warning':
        return {
          borderColor: 'border-amber-500/50',
          bgColor: 'bg-[#1C1204]/95',
          glowColor: 'shadow-amber-900/30',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />,
          accentText: 'text-amber-300',
          progressBg: 'bg-amber-400'
        };
      case 'success':
        return {
          borderColor: 'border-emerald-500/50',
          bgColor: 'bg-[#061811]/95',
          glowColor: 'shadow-emerald-900/30',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          accentText: 'text-emerald-400',
          progressBg: 'bg-emerald-400'
        };
      default:
        return {
          borderColor: 'border-[#DFB260]/40',
          bgColor: 'bg-[#120726]/95',
          glowColor: 'shadow-[#120726]/60',
          badgeBg: 'bg-[#DFB260]/20 text-[#F5D77F] border-[#DFB260]/40',
          icon: <Info className="w-5 h-5 text-[#F5D77F] shrink-0" />,
          accentText: 'text-[#F5D77F]',
          progressBg: 'bg-[#DFB260]'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-xl border ${styles.borderColor} ${styles.bgColor} ${styles.glowColor} shadow-2xl backdrop-blur-md p-4 transition-all transform duration-300 hover:scale-[1.01]`}
    >
      <div className="flex items-start space-x-3">
        {styles.icon}

        <div className="flex-1 min-w-0 pr-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${styles.badgeBg}`}>
              Arweave Permaweb
            </span>
            <span className="text-[10px] font-mono text-[#8C80A5]">{notification.timestamp}</span>
          </div>

          <h4 className={`text-sm font-bold font-mono ${styles.accentText} leading-snug`}>
            {notification.title}
          </h4>

          <p className="text-xs text-[#D8CCE8] leading-relaxed break-words">
            {notification.message}
          </p>

          {notification.txId && (
            <div className="pt-1 text-[11px] font-mono text-[#8C80A5] flex items-center space-x-2">
              <span>TX ID:</span>
              <a
                href={`https://arweave.net/${notification.txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F5D77F] hover:underline inline-flex items-center space-x-1"
              >
                <span>{notification.txId.slice(0, 12)}...{notification.txId.slice(-6)}</span>
                <ExternalLink className="w-3 h-3 text-[#F5D77F]" />
              </a>
            </div>
          )}

          {notification.onAction && (
            <div className="pt-2">
              <button
                onClick={() => {
                  notification.onAction?.();
                  onDismiss(notification.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold inline-flex items-center space-x-1.5 transition-all cursor-pointer shadow-md ${
                  notification.type === 'error'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : notification.type === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-600 text-black'
                    : 'bg-[#DFB260] hover:bg-[#F5D77F] text-[#0f081d]'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{notification.actionLabel || 'Retry Operation'}</span>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => onDismiss(notification.id)}
          className="text-[#8C80A5] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {notification.duration && notification.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
          <div
            className={`h-full ${styles.progressBg} transition-all duration-75 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
