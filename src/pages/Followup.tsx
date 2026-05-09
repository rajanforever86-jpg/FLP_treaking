import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  addDoc,
  doc,
  getDoc,
  orderBy,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';

import { Phone, CheckCircle, XCircle, Clock, ChevronRight, MessageSquare, X } from 'lucide-react';
import { formatDate } from '../utils/helpers';
import './../App.css';

const Followup: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState<any>({ overdue: [], today: [], upcoming: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<any>({});

  const DayPicker = ({ value, onChange, label }: { value: string, onChange: (val: string) => void, label: string }) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    
    const daysInMonth = new Date(currentYear, selectedMonth + 1, 0).getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="font-dm text-[12px] text-gray-500 uppercase font-bold tracking-widest">{label}</label>
          <div className="flex gap-1">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-[12px] font-bold text-blue-500 border-none outline-none cursor-pointer"
            >
              {months.map((m, i) => <option key={m} value={i} className="bg-[#0F0F0F]">{m}</option>)}
            </select>
            <span className="text-[12px] font-bold text-gray-700">{currentYear}</span>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dateStr = `${currentYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = value === dateStr;
            return (
              <button
                key={day}
                onClick={(e) => { e.preventDefault(); onChange(dateStr); }}
                className={`min-w-[44px] h-11 rounded-xl border flex items-center justify-center transition-all font-mono font-bold text-[14px] ${isSelected ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(db, 'followups'),
      where('userId', '==', user.id),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const todayStr = new Date().toISOString().split('T')[0];
      
      setData({
        overdue: all.filter((f: any) => f.scheduledDate < todayStr),
        today: all.filter((f: any) => f.scheduledDate === todayStr),
        upcoming: all.filter((f: any) => f.scheduledDate > todayStr)
      });
      setLoading(false);
    }, (error) => {
      console.error("Real-time followups sync error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const fetchFollowups = async () => {
    // Handled by onSnapshot
  };

  const handleStatusUpdate = async (type: string, data: any) => {
    if (!user || !selected) return;
    
    try {
      const followupRef = doc(db, 'followups', selected.id);
      const leadRef = doc(db, 'leads', selected.leadId);
      
      // Update current followup status
      await updateDoc(followupRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        outcome: type,
        updatedAt: serverTimestamp()
      });

      if (type === 'not_interested') {
        await updateDoc(leadRef, {
          status: 'not_interested',
          failReason: data.reason,
          updatedAt: serverTimestamp()
        });
        showToast("Marked Not Interested", "success");
      } else if (type === 'followup_again') {
        // Create new followup
        await addDoc(collection(db, 'followups'), {
          userId: user.id,
          leadId: selected.leadId,
          leadName: selected.leadName,
          leadPhone: selected.leadPhone || selected.phone || '',
          type: selected.type || 'plan_share',
          scheduledDate: data.date,
          scheduledTime: data.time,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        
        await updateDoc(leadRef, {
          planShareDate: data.date,
          planShareTime: data.time,
          updatedAt: serverTimestamp()
        });
        showToast("Follow-up rescheduled 🔁", "success");
      } else if (type === 'no_receive') {
        // Create new followup
        await addDoc(collection(db, 'followups'), {
          userId: user.id,
          leadId: selected.leadId,
          leadName: selected.leadName,
          leadPhone: selected.leadPhone || selected.phone || '',
          type: 'no_receive',
          scheduledDate: data.date,
          scheduledTime: data.time,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        
        const leadSnap = await getDoc(leadRef);
        const currentCount = leadSnap.exists() ? (leadSnap.data().noReceiveCount || 0) : 0;

        await updateDoc(leadRef, {
          status: 'no_receive',
          noReceiveCount: currentCount + 1,
          updatedAt: serverTimestamp()
        });
        showToast("Callback scheduled 📵", "success");
      } else if (type === 'signup_done') {
        await updateDoc(leadRef, {
          status: 'signup_done',
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'signups'), {
          userId: user.id,
          leadId: selected.leadId,
          fullName: selected.leadName,
          phone: selected.phone || selected.leadPhone || '',
          uplineId: user.id,
          signupDate: serverTimestamp(),
          dealStatus: 'pending',
          trainingProgress: [],
          createdAt: serverTimestamp()
        });
        showToast("🎉 Signup Done!", "success");
      }

      setSelected(null);
      setShowReschedule(false);
      setRescheduleData({});
    } catch (err) {
      console.error("Followup response error:", err);
      showToast("Failed to record response.", "error");
    }
  };

  const FollowupCard: React.FC<{ item: any; colorClass: string }> = ({ item, colorClass }) => (
    <div 
      className="bg-[var(--card)] border border-[var(--border)] rounded-[24px] p-6 flex justify-between items-center cursor-pointer hover:bg-[var(--bg3)] transition-all border-l-4 shadow-[var(--shadow-card)] group"
      style={{ borderLeftColor: colorClass === 'overdue' ? 'var(--error)' : colorClass === 'today' ? '#f59e0b' : 'var(--blue)' }}
      onClick={() => setSelected(item)}
    >
      <div>
        <h3 className="font-syne font-bold text-[16px] text-[var(--text)]">{item.leadName}</h3>
        <p className="font-dm text-[12px] text-[var(--text-secondary)] capitalize mb-2">{item.type?.replace('_', ' ')} Followup</p>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[var(--blue)]" />
          <span className="font-mono text-[12px] font-bold text-[var(--text-muted)] tracking-tighter">{formatDate(item.scheduledDate)} — {item.scheduledTime}</span>
        </div>
      </div>
      <ChevronRight size={20} className="text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
    </div>
  );

  return (
    <div className="min-h-screen pb-32 pt-8 px-6 max-w-7xl mx-auto animate-fade-up">
      <Navbar />
      <div className="dashboard-container">
        <h1 className="font-syne font-black text-[32px] text-[var(--text)] mb-2">Pending Followups</h1>
        <p className="font-dm text-[14px] text-[var(--text-secondary)] mb-10">Don't let your prospects go cold.</p>

        <div className="space-y-10">
          {data.overdue?.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-red-500 uppercase tracking-widest">🚨 Overdue</h2>
                <span className="bg-red-500/20 text-red-500 text-[10px] px-2 py-0.5 rounded-full font-bold">{data.overdue.length}</span>
              </div>
              <div className="space-y-3">
                {data.overdue.map((f: any) => <FollowupCard key={f.id} item={f} colorClass="overdue" />)}
              </div>
            </section>
          )}

          {data.today?.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-amber-500 uppercase tracking-widest">📅 Today</h2>
                <span className="bg-amber-500/20 text-amber-500 text-[10px] px-2 py-0.5 rounded-full font-bold">{data.today.length}</span>
              </div>
              <div className="space-y-3">
                {data.today.map((f: any) => <FollowupCard key={f.id} item={f} colorClass="today" />)}
              </div>
            </section>
          )}

          {data.upcoming?.length > 0 && (
            <section>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-blue-500 uppercase tracking-widest">🔜 Upcoming</h2>
                <span className="bg-blue-500/20 text-blue-500 text-[10px] px-2 py-0.5 rounded-full font-bold">{data.upcoming.length}</span>
              </div>
              <div className="space-y-3">
                {data.upcoming.map((f: any) => <FollowupCard key={f.id} item={f} colorClass="upcoming" />)}
              </div>
            </section>
          )}

          {!loading && !data.overdue?.length && !data.today?.length && !data.upcoming?.length && (
            <div className="text-center py-20 text-gray-400">All caught up! No pending followups.</div>
          )}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-[var(--bg)]/90 backdrop-blur-xl z-[100] p-6 flex flex-col items-center justify-center animate-in fade-in duration-300">
          <button onClick={() => setSelected(null)} className="absolute top-8 right-8 p-3 text-[var(--text-muted)] hover:text-[var(--text)] rounded-full bg-[var(--bg3)] transition-all">
            <X size={28} />
          </button>
          
          <div className="bg-[var(--bg2)] border border-[var(--border)] w-full max-w-md rounded-[40px] p-8 shadow-[var(--shadow)] text-center">
            <div className="w-20 h-20 bg-[var(--blue)] rounded-3xl flex items-center justify-center text-3xl font-black text-white mx-auto mb-6 shadow-xl shadow-[var(--shadow-blue)]">
              {selected.leadName?.charAt(0)}
            </div>
            <h2 className="font-syne font-black text-[28px] text-[var(--text)] mb-1 leading-tight">{selected.leadName}</h2>
            <p className="font-mono text-[12px] text-[var(--blue)] font-black uppercase tracking-[3px] mb-8">
              {selected.type?.replace('_', ' ')} FOLLOW-UP
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <a href={`tel:${selected.leadPhone}`} className="flex flex-col items-center gap-3 p-5 bg-[var(--bg3)] rounded-[24px] border border-[var(--border)] hover:bg-[var(--blue-dim)] hover:text-[var(--blue)] hover:border-[var(--blue)]/40 transition-all font-bold">
                <Phone size={24} className="text-[var(--blue)]" />
                <span className="text-[12px] font-syne uppercase tracking-wider">Call Now</span>
              </a>
              <a href={`https://wa.me/91${selected.leadPhone}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-3 p-5 bg-[var(--bg3)] rounded-[24px] border border-[var(--border)] hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/40 transition-all font-bold">
                <MessageSquare size={24} className="text-emerald-500" />
                <span className="text-[12px] font-syne uppercase tracking-wider">WhatsApp</span>
              </a>
            </div>

            <div className="space-y-4">
              <div className="font-dm text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[3px] mb-2">Response Actions</div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowReschedule('not_interested')}
                  className={`py-5 rounded-[22px] font-syne font-bold flex flex-col items-center justify-center gap-2 transition-all shadow-sm ${showReschedule === 'not_interested' ? 'bg-[var(--error)] text-white shadow-lg' : 'bg-[var(--error)]/5 text-[var(--error)] border border-[var(--error)]/20'}`}
                >
                  <XCircle size={22} />
                  <span className="text-[12px]">No Interest</span>
                </button>
                <button 
                  onClick={() => setShowReschedule('followup_again')}
                  className={`py-5 rounded-[22px] font-syne font-bold flex flex-col items-center justify-center gap-2 transition-all shadow-sm ${showReschedule === 'followup_again' ? 'bg-[var(--blue)] text-white shadow-lg' : 'bg-[var(--blue-dim)] text-[var(--blue)] border border-[var(--blue)]/20'}`}
                >
                  <Clock size={22} />
                  <span className="text-[12px]">Follow-up</span>
                </button>
                <button 
                  onClick={() => handleStatusUpdate('signup_done', {})}
                  className="py-5 bg-emerald-500/5 border border-emerald-500/20 text-emerald-500 rounded-[22px] font-syne font-bold flex flex-col items-center justify-center gap-2 hover:bg-emerald-500/10 transition-all"
                >
                  <CheckCircle size={22} />
                  <span className="text-[12px]">Signup Done</span>
                </button>
                <button 
                  onClick={() => setShowReschedule('no_receive')}
                  className={`py-5 rounded-[22px] font-syne font-bold flex flex-col items-center justify-center gap-2 transition-all shadow-sm ${showReschedule === 'no_receive' ? 'bg-amber-500 text-white shadow-lg' : 'bg-amber-500/5 text-amber-500 border border-amber-500/20'}`}
                >
                  <Phone size={22} />
                  <span className="text-[12px]">Not Receive</span>
                </button>
              </div>
            </div>

            {showReschedule && showReschedule !== 'signup_done' && (
              <div className="mt-8 pt-8 border-t border-[var(--border)] space-y-6 animate-fade-up">
                <h3 className="font-syne font-bold text-[var(--text)] text-[18px] capitalize leading-none">
                  {showReschedule.replace('_', ' ')} Details
                </h3>
                <div className="space-y-4">
                  {showReschedule === 'not_interested' && (
                    <div className="space-y-2">
                      <label className="font-dm text-[11px] text-[var(--text-muted)] uppercase font-black tracking-widest block text-left pl-2">Loss Reason</label>
                      <select 
                        className="w-full bg-[var(--bg3)] p-4 rounded-2xl border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--error)] transition-all font-medium"
                        onChange={(e) => setRescheduleData({...rescheduleData, reason: e.target.value})}
                      >
                        <option value="">Select Reason</option>
                        <option value="Price Issue">Price Issue</option>
                        <option value="No Time">No Time</option>
                        <option value="Not Convinced">Not Convinced</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  )}

                  {['followup_again', 'no_receive'].includes(showReschedule) && (
                    <>
                      <DayPicker 
                        label="New Schedule Date" 
                        value={rescheduleData.date || ''} 
                        onChange={(val) => setRescheduleData({...rescheduleData, date: val})}
                      />

                      <div className="space-y-2">
                        <label className="font-dm text-[11px] text-[var(--text-muted)] uppercase font-black tracking-widest block text-left pl-2">Execution Time</label>
                        <input 
                          type="time" 
                          className="w-full bg-[var(--bg3)] p-4 rounded-2xl border border-[var(--border)] text-[var(--text)] outline-none focus:border-[var(--blue)] transition-all font-mono font-bold" 
                          onChange={(e) => setRescheduleData({...rescheduleData, time: e.target.value})} 
                        />
                      </div>
                    </>
                  )}

                  <button 
                    onClick={() => handleStatusUpdate(showReschedule, rescheduleData)}
                    className={`w-full py-4 rounded-full font-syne font-bold text-white transition-all shadow-xl ${showReschedule === 'not_interested' ? 'bg-[var(--error)] hover:bg-red-600 shadow-red-900/20' : 'bg-[var(--blue)] hover:bg-[var(--blue2)] shadow-[var(--shadow-blue)]'}`}
                  >
                    Confirm & Update Pipeline
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Followup;
