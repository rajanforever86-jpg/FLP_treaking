import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  getDoc,
  where,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Target as TargetIcon, 
  Users, 
  Clock, 
  CheckCircle, 
  ClipboardList, 
  PhoneCall, 
  ChevronRight, 
  Settings as SettingsIcon,
  Plus,
  X,
  Bell,
  Trash2,
  Calendar
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import './../App.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>({
    leads: 0,
    dailyLeads: 0,
    signups: 0,
    deals: 0,
    followups: 0,
    signupFollowups: 0,
    plans: 0,
    trainings: 0
  });
  const [target, setTarget] = useState<any>({
    leadsTarget: 0,
    signupsTarget: 0,
    dealsTarget: 0
  });
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [targetData, setTargetData] = useState<any>({ leadsTarget: 0, signupsTarget: 0, dealsTarget: 0 });
  const [scheduleData, setScheduleData] = useState<any>({ time: '09:00', task: '', reminder: true });
  const [activeNotification, setActiveNotification] = useState<string | null>(null);

  useEffect(() => {
    document.title = "TRAKZY AI — Dashboard";
    if (!user) return;

    setLoading(true);
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // 1. Fetch Target
    const targetDocId = `${user.id}_${currentYear}_${String(currentMonth).padStart(2, '0')}`;
    const targetRef = doc(db, 'targets', targetDocId);
    
    const unsubTarget = onSnapshot(targetRef, (docSnap) => {
      if (docSnap.exists()) {
        setTarget(docSnap.data());
        setTargetData(docSnap.data());
      } else {
        setTarget({ leadsTarget: 0, signupsTarget: 0, dealsTarget: 0 });
        setTargetData({ leadsTarget: 0, signupsTarget: 0, dealsTarget: 0 });
      }
    });

    // 2. Real-time Count Listeners
    const unsubLeads = onSnapshot(
      query(collection(db, 'leads'), where('userId', '==', user.id)),
      (snap) => {
        setStats(prev => ({ ...prev, leads: snap.size }));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dailyCount = snap.docs.filter(doc => {
          const createdAt = doc.data().createdAt;
          const date = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
          return date >= today;
        }).length;
        setStats(prev => ({ ...prev, dailyLeads: dailyCount }));
      }
    );

    const unsubPlanShare = onSnapshot(
      query(collection(db, 'leads'), where('userId', '==', user.id), where('status', '==', 'plan_share')),
      (snap) => setStats((prev: any) => ({ ...prev, plans: snap.size }))
    );

    const unsubFollowups = onSnapshot(
      query(collection(db, 'followups'), where('userId', '==', user.id), where('status', '==', 'pending')),
      (snap) => setStats((prev: any) => ({ ...prev, followups: snap.size }))
    );

    const unsubSignups = onSnapshot(
      query(collection(db, 'signups'), where('userId', '==', user.id)),
      (snap) => setStats((prev: any) => ({ ...prev, signups: snap.size }))
    );

    const unsubSignFollowups = onSnapshot(
      query(collection(db, 'signups'), where('userId', '==', user.id), where('dealStatus', '==', 'deal_pending')),
      (snap) => setStats((prev: any) => ({ ...prev, signupFollowups: snap.size }))
    );

    const unsubDealsDone = onSnapshot(
      query(collection(db, 'signups'), where('userId', '==', user.id), where('dealStatus', '==', 'done')),
      (snap) => setStats((prev: any) => ({ ...prev, deals: snap.size }))
    );

    const unsubTrainings = onSnapshot(
      query(collection(db, 'trainingProgress'), where('userId', '==', user.id), where('status', '==', 'complete')),
      (snap) => setStats(prev => ({ ...prev, trainings: snap.size }))
    );

    // 3. Fetch Schedules
    const scheduleQuery = query(
      collection(db, 'schedules'),
      where('userId', '==', user.id),
      orderBy('time', 'asc')
    );
    const unsubSchedules = onSnapshot(scheduleQuery, (snap) => {
      setSchedules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // 4. In-app Reminder logic
    const reminderInterval = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      setSchedules(current => {
        const matching = current.find(s => s.time === currentTime && s.reminder);
        if (matching) {
          setActiveNotification(matching.task);
          // Auto clear after 10 seconds
          setTimeout(() => setActiveNotification(null), 10000);
        }
        return current;
      });
    }, 60000);

    return () => {
      unsubTarget();
      unsubLeads();
      unsubPlanShare();
      unsubFollowups();
      unsubSignups();
      unsubSignFollowups();
      unsubDealsDone();
      unsubTrainings();
      unsubSchedules();
      clearInterval(reminderInterval);
    };
  }, [user]);

  const handleSaveTarget = async () => {
    if (!user) return;
    const today = new Date();
    if (today.getDate() !== 1) {
      showToast("Target can only be set on 1st of every month", "error");
      return;
    }

    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const targetDocId = `${user.id}_${currentYear}_${String(currentMonth).padStart(2, '0')}`;
    
    try {
      setLoading(true);
      await setDoc(doc(db, 'targets', targetDocId), {
        userId: user.id,
        month: currentMonth,
        year: currentYear,
        leadsTarget: Number(targetData.leadsTarget),
        signupsTarget: Number(targetData.signupsTarget),
        dealsTarget: Number(targetData.dealsTarget),
        updatedAt: serverTimestamp()
      });
      setShowTargetModal(false);
      showToast("Target saved ✅", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to save target", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!user) return;
    try {
      setLoading(true);
      if (editingSchedule) {
        await updateDoc(doc(db, 'schedules', editingSchedule.id), {
          ...scheduleData,
          updatedAt: serverTimestamp()
        });
        showToast("Schedule updated ✅", "success");
      } else {
        await addDoc(collection(db, 'schedules'), {
          ...scheduleData,
          userId: user.id,
          createdAt: serverTimestamp()
        });
        showToast("Schedule added ✅", "success");
      }
      setShowScheduleModal(false);
      setEditingSchedule(null);
      setScheduleData({ time: '09:00', task: '', reminder: true });
    } catch (err) {
      console.error(err);
      showToast("Failed to save schedule", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm("Delete this ritual?")) return;
    try {
      await deleteDoc(doc(db, 'schedules', id));
      showToast("Ritual removed", "success");
    } catch (err) {
      console.error(err);
      showToast("Delete failed", "error");
    }
  };

  const percentages = {
    leads: target.leadsTarget > 0 ? (stats.leads / target.leadsTarget) * 100 : 0,
    signups: target.signupsTarget > 0 ? (stats.signups / target.signupsTarget) * 100 : 0,
    deals: target.dealsTarget > 0 ? (stats.deals / target.dealsTarget) * 100 : 0
  };

  if (loading) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-[var(--blue)] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen pb-32 lg:pb-12 px-6 pt-8 max-w-7xl mx-auto animate-fade-up">
      {/* Reminder Notification */}
      {activeNotification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md animate-bounce">
          <div className="bg-[var(--blue)] p-4 rounded-2xl shadow-2xl shadow-[var(--shadow-blue)] flex items-center gap-4 text-white">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Bell size={24} />
            </div>
            <div className="flex-1">
              <p className="font-dm text-[12px] opacity-80 uppercase tracking-widest">Ritual Reminder</p>
              <p className="font-syne font-bold text-[16px]">{activeNotification} — time to start! ⏰</p>
            </div>
            <button onClick={() => setActiveNotification(null)} className="p-1 hover:bg-white/10 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Header (Hidden on Desktop because Sidebar has it) */}
      <div className="lg:hidden flex justify-between items-center mb-8 bg-[var(--bg2)] backdrop-blur-xl p-6 rounded-[24px] border border-[var(--border)] shadow-[var(--shadow)]">
        <div>
          <h1 className="font-syne font-bold text-[22px] text-[var(--text)] tracking-tight">Hey {user?.fullName?.split(' ')[0]}! 👋</h1>
          <p className="font-dm text-[13px] text-[var(--text-muted)] mt-0.5">Tracker is on target.</p>
        </div>
        <button 
          onClick={() => navigate('/settings')}
          className="w-10 h-10 rounded-xl bg-[var(--bg3)] flex items-center justify-center border border-[var(--border)] hover:bg-[var(--blue-dim)] hover:text-[var(--blue)] transition-all"
        >
          <SettingsIcon size={20} />
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Progress & Targets (Lg: 8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[28px] p-8 relative overflow-hidden group shadow-[var(--shadow-card)]">
            <div className="absolute top-0 left-0 w-1 h-full bg-[var(--blue)]"></div>
            <div className="flex justify-between items-center mb-10">
              <h2 className="font-syne font-bold text-[18px] text-[var(--text)] flex items-center gap-3">
                <TargetIcon size={20} className="text-[var(--blue)]" />
                Monthly Target — <span className="text-[var(--text-muted)] font-normal">{new Date().toLocaleString('default', { month: 'long' })}</span>
              </h2>
              <button 
                onClick={() => setShowTargetModal(true)}
                className="font-syne font-bold text-[12px] uppercase tracking-wider text-[var(--blue)] hover:text-[var(--blue2)] transition-colors"
              >
                Configure
              </button>
            </div>

            {/* Target Display */}
            {target.leadsTarget > 0 ? (
              <>
                {/* Leads Target */}
                <div className="mb-8">
                  <div className="flex justify-between mb-2">
                    <span className="font-dm text-[14px] text-[var(--text-secondary)]">Leads Generated</span>
                    <span className="font-mono text-[14px] text-[var(--text)] font-bold">{stats.leads || 0} / {target.leadsTarget}</span>
                  </div>
                  <div className="h-2.5 w-full bg-[var(--bg3)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[var(--blue)] to-[var(--blue3)] rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, percentages.leads)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Signups Target */}
                <div className="mb-8">
                  <div className="flex justify-between mb-2">
                    <span className="font-dm text-[14px] text-[var(--text-secondary)]">Signup Conversion</span>
                    <span className="font-mono text-[14px] text-[var(--text)] font-bold">{stats.signups || 0} / {target.signupsTarget}</span>
                  </div>
                  <div className="h-2.5 w-full bg-[var(--bg3)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, percentages.signups)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Deals Target */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-dm text-[14px] text-[var(--text-secondary)]">Deal Completion</span>
                    <span className="font-mono text-[14px] text-[var(--text)] font-bold">{stats.deals || 0} / {target.dealsTarget}</span>
                  </div>
                  <div className="h-2.5 w-full bg-[var(--bg3)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, percentages.deals)}%` }}
                    ></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div onClick={() => setShowTargetModal(true)} className="cursor-pointer group flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-[var(--blue-dim)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Plus size={32} className="text-[var(--blue)]" />
                  </div>
                  <p className="font-syne font-bold text-[var(--text)] text-[16px]">Set your target</p>
                  <p className="font-dm text-[13px] text-[var(--text-muted)] mt-1">Start tracking your monthly goals.</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Quick Stat Cards */}
            <div onClick={() => navigate('/leads')} className="bg-[var(--card)] border border-[var(--border)] rounded-[24px] p-6 hover:border-[var(--blue)]/30 transition-all cursor-pointer group hover:-translate-y-1 shadow-[var(--shadow-card)]">
              <TargetIcon size={24} className="text-[var(--blue)] mb-2 transition-transform group-hover:scale-110" />
              <div className="flex justify-between items-end mb-1">
                <div className="font-mono text-[28px] font-bold text-[var(--text)] leading-none">{stats.leads || 0}</div>
                <div className="text-[10px] text-[var(--blue)] font-black">+{stats.dailyLeads || 0} TODAY</div>
              </div>
              <div className="font-dm text-[12px] text-[var(--text-muted)] uppercase tracking-widest font-bold flex items-center gap-2">
                🎯 Total Leads
              </div>
            </div>
            
            <div onClick={() => navigate('/signups')} className="bg-[var(--card)] border border-[var(--border)] rounded-[24px] p-6 hover:border-[var(--blue)]/30 transition-all cursor-pointer group hover:-translate-y-1 shadow-[var(--shadow-card)]">
              <ClipboardList size={24} className="text-emerald-500 mb-4 transition-transform group-hover:scale-110" />
              <div className="font-mono text-[28px] font-bold text-[var(--text)] mb-1 leading-none">{stats.trainings || 0}</div>
              <div className="font-dm text-[12px] text-[var(--text-muted)] uppercase tracking-widest font-bold flex items-center gap-2">
                📚 Completed Trainings
              </div>
            </div>

            <div onClick={() => navigate('/followup')} className="bg-[var(--card)] border border-[var(--border)] rounded-[24px] p-6 hover:border-[var(--blue)]/30 transition-all cursor-pointer group hover:-translate-y-1 relative shadow-[var(--shadow-card)]">
              <Clock size={24} className="text-amber-500 mb-4 transition-transform group-hover:scale-110" />
              <div className="font-mono text-[28px] font-bold text-[var(--text)] mb-1 leading-none">{stats.followups || 0}</div>
              <div className="font-dm text-[12px] text-[var(--text-muted)] uppercase tracking-widest font-bold flex items-center gap-2">
                ⏰ Pending Follow-up
              </div>
              {stats.followups > 0 && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-red-900/40">
                  <span className="text-[10px] font-black text-white">{stats.followups}</span>
                </div>
              )}
            </div>

            <div onClick={() => navigate('/signups')} className="bg-[var(--card)] border border-[var(--border)] rounded-[24px] p-6 hover:border-[var(--blue)]/30 transition-all cursor-pointer group hover:-translate-y-1 shadow-[var(--shadow-card)]">
              <CheckCircle size={24} className="text-emerald-600 mb-4 transition-transform group-hover:scale-110" />
              <div className="font-mono text-[28px] font-bold text-[var(--text)] mb-1 leading-none">{stats.signups || 0}</div>
              <div className="font-dm text-[12px] text-[var(--text-muted)] uppercase tracking-widest font-bold flex items-center gap-2">
                ✍️ Signup
              </div>
            </div>

            <div onClick={() => navigate('/signups')} className="bg-[var(--card)] border border-[var(--border)] rounded-[24px] p-6 hover:border-[var(--blue)]/30 transition-all cursor-pointer group hover:-translate-y-1 shadow-[var(--shadow-card)]">
              <PhoneCall size={24} className="text-indigo-500 mb-4 transition-transform group-hover:scale-110" />
              <div className="font-mono text-[28px] font-bold text-[var(--text)] mb-1 leading-none">{stats.signupFollowups || 0}</div>
              <div className="font-dm text-[12px] text-[var(--text-muted)] uppercase tracking-widest font-bold flex items-center gap-2">
                📞 Signup Follow-up
              </div>
            </div>

            <div onClick={() => navigate('/signups')} className="bg-[var(--card)] border border-emerald-500/20 rounded-[24px] p-6 hover:bg-emerald-500/5 transition-all cursor-pointer group hover:-translate-y-1 shadow-[var(--shadow-card)]">
              <TargetIcon size={24} className="text-emerald-500 mb-4 transition-transform group-hover:scale-110" />
              <div className="font-mono text-[28px] font-bold text-[var(--text)] mb-1 leading-none">{stats.deals || 0}</div>
              <div className="font-dm text-[12px] text-[var(--text-muted)] uppercase tracking-widest font-bold flex items-center gap-2">
                ✅ Deal Done
              </div>
            </div>
          </div>
        </div>

        {/* Schedule Sidebar (Lg: 4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[28px] p-8 h-full flex flex-col shadow-[var(--shadow-card)]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-syne font-bold text-[18px] text-[var(--text)]">Daily Ritual</h2>
              <button 
                onClick={() => {
                  setEditingSchedule(null);
                  setScheduleData({ time: '09:00', task: '', reminder: true });
                  setShowScheduleModal(true);
                }}
                className="w-8 h-8 rounded-lg bg-[var(--bg3)] flex items-center justify-center text-[var(--blue)] hover:bg-[var(--blue)] hover:text-white transition-all border border-[var(--border)]"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {schedules.map((item, idx) => (
                <div key={idx} className="group relative flex items-start gap-4 p-4 rounded-[18px] bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--bg3)] transition-all">
                  <div className="font-mono text-[13px] font-bold text-[var(--blue)] mt-0.5">{item.time}</div>
                  <div className="flex-1">
                    <p className="font-dm text-[15px] text-[var(--text)] leading-tight">{item.task}</p>
                    {item.reminder && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Bell size={10} className="text-[var(--blue)]" />
                        <span className="text-[11px] text-[var(--blue)] opacity-70 font-medium italic">Reminder active</span>
                      </div>
                    )}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingSchedule(item);
                        setScheduleData({ time: item.time, task: item.task, reminder: item.reminder });
                        setShowScheduleModal(true);
                      }}
                      className="p-1.5 bg-[var(--bg3)] rounded-lg text-[var(--text-muted)] hover:text-[var(--blue)]"
                    >
                      <Plus size={14} className="rotate-45" />
                    </button>
                    <button 
                      onClick={() => handleDeleteSchedule(item.id)}
                      className="p-1.5 bg-[var(--bg3)] rounded-lg text-[var(--text-muted)] hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {schedules.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-[var(--bg3)] flex items-center justify-center mb-4">
                    <ClipboardList size={32} className="text-[var(--text-muted)]" />
                  </div>
                  <p className="font-dm text-[14px] text-[var(--text-muted)]">No rituals planned<br/>for today.</p>
                </div>
              )}
            </div>

            {/* Logout Link (Minimal) */}
            <button 
              onClick={logout}
              className="mt-8 font-dm text-[12px] text-[var(--text-muted)] hover:text-red-500 transition-colors uppercase tracking-[2px] font-black self-center"
            >
              Sign Out Session
            </button>
          </div>
        </div>
      </div>
      {/* Target Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-[var(--bg)]/80 backdrop-blur-xl z-[80] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-[var(--bg2)] border border-[var(--border)] w-full max-w-md rounded-[32px] p-8 shadow-[var(--shadow)] relative">
            <button onClick={() => setShowTargetModal(false)} className="absolute top-6 right-6 p-2 text-[var(--text-muted)] hover:text-[var(--text)] rounded-xl bg-[var(--bg3)] transition-all">
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[var(--blue-dim)] flex items-center justify-center text-[var(--blue)] border border-[var(--blue)]/20">
                <TargetIcon size={24} />
              </div>
              <div>
                <h3 className="font-syne font-bold text-[18px] text-[var(--text)]">Configure Target</h3>
                <p className="font-dm text-[13px] text-[var(--text-muted)]">Targets can only be set on the 1st of month.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="font-dm text-[11px] text-[var(--text-muted)] uppercase font-black tracking-widest pl-1">Leads Target</label>
                <input 
                  type="number"
                  value={targetData.leadsTarget}
                  onChange={(e) => setTargetData({...targetData, leadsTarget: e.target.value})}
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-2xl p-4 text-[var(--text)] outline-none focus:border-[var(--blue)] transition-all font-mono"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <label className="font-dm text-[11px] text-[var(--text-muted)] uppercase font-black tracking-widest pl-1">Signups Target</label>
                <input 
                  type="number"
                  value={targetData.signupsTarget}
                  onChange={(e) => setTargetData({...targetData, signupsTarget: e.target.value})}
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-2xl p-4 text-[var(--text)] outline-none focus:border-[var(--blue)] transition-all font-mono"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <label className="font-dm text-[11px] text-[var(--text-muted)] uppercase font-black tracking-widest pl-1">Deals Target</label>
                <input 
                  type="number"
                  value={targetData.dealsTarget}
                  onChange={(e) => setTargetData({...targetData, dealsTarget: e.target.value})}
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-2xl p-4 text-[var(--text)] outline-none focus:border-[var(--blue)] transition-all font-mono"
                  placeholder="0"
                />
              </div>

              <button 
                onClick={handleSaveTarget}
                className="w-full bg-[var(--blue)] py-4 rounded-full font-syne font-bold text-white shadow-xl shadow-[var(--shadow-blue)] hover:bg-[var(--blue2)] transition-all mt-4"
              >
                Commit Goals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-[var(--bg)]/80 backdrop-blur-xl z-[80] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-[var(--bg2)] border border-[var(--border)] w-full max-w-md rounded-[32px] p-8 shadow-[var(--shadow)] relative">
            <button onClick={() => setShowScheduleModal(false)} className="absolute top-6 right-6 p-2 text-[var(--text-muted)] hover:text-[var(--text)] rounded-xl bg-[var(--bg3)] transition-all">
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="font-syne font-bold text-[18px] text-[var(--text)]">{editingSchedule ? 'Modify Ritual' : 'New Ritual'}</h3>
                <p className="font-dm text-[13px] text-[var(--text-muted)]">Plan your day for consistent growth.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="font-dm text-[11px] text-[var(--text-muted)] uppercase font-black tracking-widest pl-1">Task Title</label>
                <input 
                  type="text"
                  value={scheduleData.task}
                  onChange={(e) => setScheduleData({...scheduleData, task: e.target.value})}
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-2xl p-4 text-[var(--text)] outline-none focus:border-[var(--blue)] transition-all"
                  placeholder="e.g., Morning Prospecting"
                />
              </div>

              <div className="space-y-2">
                <label className="font-dm text-[11px] text-[var(--text-muted)] uppercase font-black tracking-widest pl-1">Scheduled Time</label>
                <input 
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData({...scheduleData, time: e.target.value})}
                  className="w-full bg-[var(--bg3)] border border-[var(--border)] rounded-2xl p-4 text-[var(--text)] outline-none focus:border-[var(--blue)] transition-all font-mono"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-[var(--bg3)] border border-[var(--border)] rounded-2xl">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-[var(--text-muted)]" />
                  <span className="font-dm text-[14px] text-[var(--text-secondary)]">Enable In-app Notification</span>
                </div>
                <button 
                  onClick={() => setScheduleData({...scheduleData, reminder: !scheduleData.reminder})}
                  className={`w-12 h-6 rounded-full transition-all relative ${scheduleData.reminder ? 'bg-[var(--blue)]' : 'bg-gray-400'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${scheduleData.reminder ? 'right-1' : 'left-1'}`}></div>
                </button>
              </div>

              <button 
                onClick={handleSaveSchedule}
                className="w-full bg-[var(--blue)] py-4 rounded-full font-syne font-bold text-white shadow-xl shadow-[var(--shadow-blue)] hover:bg-[var(--blue2)] transition-all mt-4"
              >
                {editingSchedule ? 'Update Task' : 'Save Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
