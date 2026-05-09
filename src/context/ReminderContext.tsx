import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bell, XCircle, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Reminder {
  id: string;
  leadName: string;
  leadId: string;
  type: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
}

interface Notification {
  id: string;
  reminder: Reminder;
  timestamp: number;
  dismissedAt?: number;
  repeatCount: number;
}

interface ReminderContextType {
  pendingCount: number;
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export const ReminderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const checkReminders = useCallback((followups: Reminder[]) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    followups.forEach(f => {
      if (f.scheduledDate === today) {
        const [hour, minute] = f.scheduledTime.split(':').map(Number);
        const scheduledDate = new Date();
        scheduledDate.setHours(hour, minute, 0, 0);
        
        const diffMinutes = (scheduledDate.getTime() - now.getTime()) / (1000 * 60);

        // Notify if scheduled within next 30 minutes or overdue today
        if (diffMinutes <= 30 && diffMinutes > -60) {
          // Logic for repeat/dismissal could be added here stored in localStorage
          const storageKey = `reminder_notified_${f.id}`;
          const lastNotified = localStorage.getItem(storageKey);
          const notificationData = lastNotified ? JSON.parse(lastNotified) : { count: 0, lastTime: 0 };

          if (notificationData.count < 3 && (Date.now() - notificationData.lastTime) > 30 * 60 * 1000) {
             setActiveNotification({
               id: f.id,
               reminder: f,
               timestamp: Date.now(),
               repeatCount: notificationData.count
             });
             localStorage.setItem(storageKey, JSON.stringify({
               count: notificationData.count + 1,
               lastTime: Date.now()
             }));
          }
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'followups'),
      where('userId', '==', user.id),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const followups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
      setPendingCount(followups.length);
      checkReminders(followups);
    });

    const interval = setInterval(() => {
      // Re-check periodically
      const qSync = query(
        collection(db, 'followups'),
        where('userId', '==', user.id),
        where('status', '==', 'pending')
      );
      // We don't need to re-subscribe, just trigger local check if we have the list
      // For simplicity, interval will just rely on the onSnapshot keeping followups updated
    }, 5 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user, checkReminders]);

  const handleDismiss = () => {
    setActiveNotification(null);
  };

  const handleView = () => {
    navigate('/followup');
    setActiveNotification(null);
  };

  return (
    <ReminderContext.Provider value={{ pendingCount }}>
      {children}
      {activeNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-[400px] animate-in slide-in-from-top duration-500">
          <div className="bg-blue-600/95 backdrop-blur-md border border-white/20 rounded-[24px] shadow-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center animate-pulse">
              <Bell className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-syne font-black text-white text-[14px]">Follow-up reminder!</h4>
              <p className="font-dm text-white/80 text-[12px] truncate">
                {activeNotification.reminder.leadName} — {activeNotification.reminder.type.replace('_', ' ')} due now
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleView}
                className="bg-white text-blue-600 px-4 py-2 rounded-xl font-syne font-bold text-[12px] hover:bg-blue-50 transition-colors"
              >
                View
              </button>
              <button 
                onClick={handleDismiss}
                className="p-2 text-white/50 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </ReminderContext.Provider>
  );
};

export const useReminders = () => {
  const context = useContext(ReminderContext);
  if (!context) throw new Error('useReminders must be used within ReminderProvider');
  return context;
};
