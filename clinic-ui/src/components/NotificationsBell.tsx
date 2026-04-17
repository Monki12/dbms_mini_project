import React, { useEffect, useRef, useState } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import apiClient from '../api/client';

interface Notification {
  notif_id: number;
  message: string;
  notif_type: string;
  read_flag: string;
  created_at: string;
}

interface Props {
  role: 'DOCTOR' | 'PATIENT';
}

const typeColors: Record<string, string> = {
  EMERGENCY:    'text-red-600 bg-red-50 border-red-100',
  LAB_READY:    'text-teal-600 bg-teal-50 border-teal-100',
  CANCELLATION: 'text-amber-600 bg-amber-50 border-amber-100',
  APPOINTMENT:  'text-blue-600 bg-blue-50 border-blue-100',
  INFO:         'text-slate-600 bg-slate-50 border-slate-100',
};

export default function NotificationsBell({ role }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const path = role === 'DOCTOR' ? '/api/doctor/notifications' : '/api/patient/notifications';
  const markAllPath = role === 'DOCTOR' ? '/api/doctor/notifications/read-all' : '/api/patient/notifications/read-all';

  const fetch = () => {
    apiClient.get(path)
      .then((res) => {
        setNotifications(res.data.data?.notifications || []);
        setUnread(res.data.data?.unread_count || 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    await apiClient.patch(markAllPath).catch(() => {});
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_flag: 'Y' })));
  };

  const formatTime = (ts: string) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open) fetch(); }}
        className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.notif_id}
                  className={`px-4 py-3 ${n.read_flag === 'N' ? 'bg-blue-50/40' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5 ${typeColors[n.notif_type] || typeColors.INFO}`}>
                      {n.notif_type.replace('_', ' ')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${n.read_flag === 'N' ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatTime(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
