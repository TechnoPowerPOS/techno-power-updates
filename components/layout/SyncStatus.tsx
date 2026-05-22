import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useSync } from '../../hooks/useSync';
import { useTranslation } from '../../hooks/useTranslation';

const SyncStatus: React.FC = () => {
  const { isOnline, isSyncing, queueCount } = useSync();
  const { t } = useTranslation();

  const getStatus = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff size={16} className="text-red-500" />,
        text: t('sync.status_offline'),
        color: 'text-red-500',
      };
    }
    if (isSyncing) {
      return {
        icon: <RefreshCw size={16} className="animate-spin text-blue-500" />,
        text: t('sync.synchronizing'),
        color: 'text-blue-500',
      };
    }
    return {
      icon: <Wifi size={16} className="text-green-500" />,
      text: t('sync.status_online'),
      color: 'text-green-500',
    };
  };

  const { icon, text, color } = getStatus();

  return (
    <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 text-sm font-semibold ${color}`}>
            {icon}
            <span>{text}</span>
        </div>
        {queueCount > 0 && (
            <div className="text-sm font-semibold text-yellow-500 flex items-center gap-1">
                <span>{queueCount}</span>
                <span>{t('sync.pending_changes')}</span>
            </div>
        )}
    </div>
  );
};

export default SyncStatus;
