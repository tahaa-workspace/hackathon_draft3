import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';

import Navbar from '../components/Navbar';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/legacyService';

export default function Notifications() {
  const navigate = useNavigate();
  const storedUser = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('dl_user') || 'null');
    } catch {
      return null;
    }
  })();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getNotifications());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const navigateForNotification = (item) => {
    const legacyTypes = new Set([
      'LEGACY_ALLOCATION',
      'LEGACY_CLAIM',
      'ADMIN_REVIEW',
      'LAWYER_REVIEW',
      'LEGACY_APPROVED',
      'LEGACY_REJECTED',
      'LEGACY_UNLOCKED',
      'LEGACY_RELEASE',
    ]);

    if (legacyTypes.has(item.type)) {
      if (storedUser?.role === 'ADMIN') {
        navigate('/admin/legacy-claims');
      } else if (storedUser?.role === 'LAWYER') {
        navigate('/lawyer');
      } else {
        navigate('/legacy-access');
      }
      return;
    }

    if (item.type === 'LEGAL_REQUEST') {
      navigate(
        storedUser?.role === 'LAWYER'
          ? '/lawyer/consultations'
          : storedUser?.role === 'ADMIN'
            ? '/admin/legal-requests'
            : '/legal-assistance'
      );
      return;
    }

    if (item.type === 'DOCUMENT_VERIFICATION' && storedUser?.role === 'ADMIN') {
      navigate('/admin/records');
      return;
    }

    navigate('/notifications');
  };

  const openNotification = async (item) => {
    try {
      if (!item.isRead) {
        await markNotificationRead(item.id);
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, isRead: true } : entry
          )
        );
        window.dispatchEvent(new Event('nextgen:notifications-changed'));
      }

      navigateForNotification(item);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      window.dispatchEvent(new Event('nextgen:notifications-changed'));
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-indigo-700">
              <Bell size={18} />
              <span className="text-xs font-bold uppercase tracking-[0.14em]">Notifications</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Your activity updates</h1>
          </div>

          <button onClick={markAll} className="btn-secondary">
            <CheckCheck size={16} />
            Mark all read
          </button>
        </div>

        {message && (
          <div className="mt-5 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Loading notifications…
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">No notifications yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item)}
                  className={"w-full px-5 py-5 text-left transition hover:bg-slate-50 " + (!item.isRead ? "bg-indigo-50/40" : "")}
                >
                  <div className="flex items-start gap-3">
                    <span className={"mt-1 h-2.5 w-2.5 rounded-full " + (!item.isRead ? "bg-indigo-600" : "bg-slate-200")} />
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.message}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
