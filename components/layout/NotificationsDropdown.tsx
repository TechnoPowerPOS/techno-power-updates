import React from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { AlertTriangle, Bell, TrendingDown, Trash2 } from 'lucide-react';
import type { Notification } from '../../types';

const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
    switch (type) {
        case 'LOW_STOCK':
            return (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                    <AlertTriangle size={16} className="text-yellow-500" />
                </div>
            );
        case 'PROFIT_ALERT':
        case 'UNUSUAL_EXPENSE':
             return (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <TrendingDown size={16} className="text-red-500" />
                </div>
            );
        default:
            return (
                 <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bell size={16} className="text-blue-500" />
                </div>
            );
    }
}


const NotificationsDropdown: React.FC = () => {
    const { notifications, clearNotifications } = useNotifications();

    const getRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
        const minutes = Math.round(seconds / 60);
        const hours = Math.round(minutes / 60);
        const days = Math.round(hours / 24);

        if (seconds < 60) return `الآن`;
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        if (hours < 24) return `منذ ${hours} ساعة`;
        return `منذ ${days} يوم`;
    };

    return (
        <div className="absolute top-full end-0 mt-2 w-80 bg-white rounded-md shadow-lg animate-scaleUp origin-top-right border z-50">
            <div className="p-3 border-b flex justify-between items-center">
                <h4 className="font-semibold text-sm">الإشعارات</h4>
                {notifications.length > 0 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); clearNotifications(); }}
                        className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 font-medium transition-colors"
                    >
                        <Trash2 size={12} />
                        مسح الكل
                    </button>
                )}
            </div>
            <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                    notifications.map(notification => (
                        <div key={notification.id} className="flex items-start gap-3 p-3 hover:bg-slate-50">
                            <NotificationIcon type={notification.type} />
                            <div className="flex-grow">
                                <p className="text-sm text-slate-700">{notification.message}</p>
                                <p className="text-xs text-slate-500 mt-1">{getRelativeTime(notification.date)}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10 text-slate-500">
                        <Bell size={32} className="mx-auto opacity-50 mb-2" />
                        <p className="text-sm">لا توجد إشعارات جديدة.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsDropdown;