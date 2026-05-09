import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc,
  addDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';

import { Phone, CheckCircle, Clock, ChevronRight, MessageSquare, ExternalLink, Copy, X } from 'lucide-react';
import { formatDate } from '../utils/helpers';
import './../App.css';

const Signups: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [signups, setSignups] = useState<any[]>([]);
  const [activeSignup, setActiveSignup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('signup'); // signup or deal_done
  const [trainings, setTrainings] = useState<any[]>([]);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(db, 'signups'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setSignups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Real-time signups sync error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Real-time progress tracker when a signup is open
  useEffect(() => {
    if (!activeSignup || !user) return;

    setLoadingProgress(true);
    const q = query(
      collection(db, 'trainingProgress'),
      where('signupId', '==', activeSignup.id),
      where('status', '==', 'complete')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const completed = snap.docs.map(doc => doc.data().trainingId);
      setCompletedSteps(completed);
      setLoadingProgress(false);
    });

    return () => unsubscribe();
  }, [activeSignup, user]);

  const openSignup = async (signupData: any) => {
    try {
      setActiveSignup(signupData);
      const q = query(
        collection(db, 'trainings'),
        where('userId', '==', user?.id),
        where('type', '==', activeTab),
        orderBy('step', 'asc')
      );
      const snap = await getDocs(q);
      setTrainings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    }
  };

  // Re-fetch trainings if tab changes while signup is open
  useEffect(() => {
    if (activeSignup && user) {
      const q = query(
        collection(db, 'trainings'),
        where('userId', '==', user.id),
        where('type', '==', activeTab),
        orderBy('step', 'asc')
      );
      getDocs(q).then(snap => {
        setTrainings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }
  }, [activeTab, activeSignup, user]);

  const copyTrainingLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      showToast("Link copied! 📋", "success");
    } catch (err) {
      const el = document.createElement('textarea');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      showToast("Link copied! 📋", "success");
    }
  };

  const shareTrainingOnWhatsApp = (title: string, link: string, step: number) => {
    const msg = encodeURIComponent(
      `📚 Step ${step}: ${title}\n${link}\n\nShared via TRAKZY AI`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const completeStep = async (signupId: string, trainingId: string, stepNum: number) => {
    if (!user) return;
    try {
      const progressId = `${signupId}_${trainingId}`;
      await setDoc(doc(db, 'trainingProgress', progressId), {
        userId: user.id,
        signupId,
        trainingId,
        status: 'complete',
        completedAt: serverTimestamp()
      });
      showToast(`Step ${stepNum} completed! ✅`, "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to complete step", "error");
    }
  };

  const updateDeal = async (signupId: string, status: string, reason?: string) => {
    try {
      const ref = doc(db, 'signups', signupId);
      const now = new Date();
      const updateData: any = {
        dealStatus: status,
        updatedAt: now
      };

      if (status === 'done') {
        updateData.dealDoneDate = now;
        showToast("🎉 Deal Done!", "success");
      } else if (status === 'deal_pending') {
        showToast("Marked as Pending ⏳", "success");
      } else if (status === 'deal_failed') {
        updateData.dealFailReason = reason || 'Unspecified';
        showToast("Marked as Failed ❌", "success");
      }

      await updateDoc(ref, updateData);
      setActiveSignup(null);
    } catch (err) {
      console.error(err);
      showToast("Update failed", "error");
    }
  };

  const TrainingTracker = ({ signup, trainingList }: { signup: any; trainingList: any[] }) => {
    const isAllComplete = trainingList.length > 0 && trainingList.every(t => completedSteps.includes(t.id));

    return (
      <div className="fixed inset-0 bg-[var(--bg)]/95 backdrop-blur-xl z-[100] p-6 overflow-y-auto animate-in fade-in slide-in-from-bottom-4">
        <div className="max-w-2xl mx-auto pb-32">
          <div className="flex justify-between items-center mb-10 mt-6">
            <div>
              <h2 className="font-syne font-black text-[28px] text-[var(--text)] leading-tight">Training: {signup.fullName}</h2>
              <p className="font-dm text-[14px] text-[var(--text-secondary)]">Complete all steps to unlock final deal status.</p>
            </div>
            <button onClick={() => setActiveSignup(null)} className="w-12 h-12 flex items-center justify-center bg-[var(--bg3)] rounded-full text-[var(--text-muted)] hover:text-[var(--text)] transition-all border border-[var(--border)]"><X size={24} /></button>
          </div>

          <div className="flex bg-[var(--bg2)] p-1.5 rounded-[22px] border border-[var(--border)] mb-10 shadow-sm">
            <button 
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-3 rounded-[18px] text-[13px] font-syne font-bold uppercase tracking-wider transition-all ${activeTab === 'signup' ? 'bg-[var(--blue)] text-white shadow-lg shadow-[var(--shadow-blue)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
            >Signup Training</button>
            <button 
              onClick={() => setActiveTab('deal_done')}
              className={`flex-1 py-3 rounded-[18px] text-[13px] font-syne font-bold uppercase tracking-wider transition-all ${activeTab === 'deal_done' ? 'bg-[var(--blue)] text-white shadow-lg shadow-[var(--shadow-blue)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
            >Deal Done Training</button>
          </div>

          <div className="space-y-6 mb-12">
            {trainingList.map((t, idx) => {
              const isCompleted = completedSteps.includes(t.id);
              const isLocked = idx > 0 && !completedSteps.includes(trainingList[idx-1].id);

              return (
                <div key={t.id} className={`bg-[var(--card)] border border-[var(--border)] rounded-[32px] p-8 transition-all duration-500 shadow-[var(--shadow-card)] ${isLocked ? 'opacity-40 grayscale pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-syne font-black text-[18px] border transition-all ${
                        isCompleted ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-lg shadow-emerald-500/10' : 'bg-[var(--blue-dim)] text-[var(--blue)] border-[var(--border-blue)]'
                      }`}>
                        {t.step}
                      </div>
                      <div>
                        <h3 className="font-syne font-bold text-[18px] text-[var(--text)] flex items-center gap-3">
                          {t.title}
                          {isCompleted && <CheckCircle size={20} className="text-emerald-500" strokeWidth={3} />}
                        </h3>
                        <p className="font-mono text-[11px] text-[var(--text-muted)] truncate max-w-[200px] mt-1">{t.link}</p>
                      </div>
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
                       <button 
                          onClick={() => shareTrainingOnWhatsApp(t.title, t.link, t.step)}
                          className="py-4 bg-[#25D366] rounded-2xl flex items-center justify-center gap-3 text-[14px] font-syne font-bold hover:brightness-110 transition-all text-white shadow-lg shadow-green-900/10"
                       >
                          <MessageSquare size={18} /> WhatsApp
                       </button>
                       <button 
                          onClick={() => copyTrainingLink(t.link)}
                          className="py-4 bg-[var(--blue)] rounded-2xl flex items-center justify-center gap-3 text-[14px] font-syne font-bold hover:brightness-110 transition-all text-white shadow-lg shadow-[var(--shadow-blue)]"
                       >
                          <Copy size={18} /> Copy Link
                       </button>
                      
                      {!isCompleted ? (
                        <button 
                          onClick={() => completeStep(signup.id, t.id, t.step)}
                          className="md:col-span-2 py-4 mt-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center gap-3 text-[14px] font-syne font-bold text-amber-500 hover:bg-amber-500/20 transition-all"
                        >
                          <Clock size={18} /> Mark as Complete
                        </button>
                      ) : (
                        <button 
                          className="md:col-span-2 py-4 mt-2 bg-emerald-500 border border-emerald-500/20 rounded-full flex items-center justify-center gap-3 text-[14px] font-syne font-bold text-white shadow-xl shadow-emerald-900/10"
                        >
                          🎉 Step Finished
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!loading && trainingList.length === 0 && (
              <div className="text-center py-20 bg-[var(--bg3)] border border-dashed border-[var(--border)] rounded-[40px]">
                <p className="font-dm text-[15px] text-[var(--text-muted)]">No trainings configured for this stage.</p>
              </div>
            )}
          </div>

          {isAllComplete && (
            <div className="bg-[var(--card)] border-2 border-emerald-500/40 rounded-[48px] p-10 text-center animate-in zoom-in-95 shadow-2xl shadow-emerald-500/5">
              <div className="mb-10">
                <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white text-[40px] mx-auto mb-6 shadow-xl shadow-emerald-500/20">🏆</div>
                <h3 className="font-syne font-black text-[28px] text-emerald-500 leading-tight">Training Complete!</h3>
                <p className="font-dm text-[16px] text-[var(--text-secondary)] mt-2">Select the final deal outcome below.</p>
              </div>
              <div className="flex flex-col gap-4 max-w-sm mx-auto">
                <button 
                  onClick={() => updateDeal(signup.id, 'done')}
                  className="w-full py-5 bg-emerald-500 rounded-[24px] font-syne font-bold text-[16px] text-white hover:brightness-110 shadow-2xl shadow-emerald-500/30 transition-all active:scale-95"
                >
                  ✅ Confirm Deal Success
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => updateDeal(signup.id, 'deal_pending')}
                    className="py-4 bg-[var(--bg3)] border border-[var(--border)] rounded-[22px] font-syne font-bold text-[14px] text-[var(--text-secondary)] hover:bg-[var(--bg2)] transition-all"
                  >
                    ⏳ Pending
                  </button>
                  <button 
                    onClick={() => { const r = prompt('Reason for failure:'); if(r) updateDeal(signup.id, 'deal_failed', r); }}
                    className="py-4 bg-[var(--error)]/5 border border-[var(--error)]/20 text-[var(--error)] rounded-[22px] font-syne font-bold text-[14px] hover:bg-[var(--error)]/10 transition-all uppercase tracking-widest"
                  >
                    ❌ Failed
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-32 pt-8 px-6 max-w-7xl mx-auto animate-fade-up">
      <Navbar />
      <div className="dashboard-container">
        <h1 className="font-syne font-black text-[32px] text-[var(--text)] mb-2">Signups</h1>
        <p className="font-dm text-[14px] text-[var(--text-secondary)] mb-10">New partners joined via your network.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {signups.map((s) => (
            <div 
              key={s.id} 
              className="bg-[var(--card)] border border-[var(--border)] rounded-[32px] p-8 flex flex-col cursor-pointer hover:bg-[var(--bg3)] transition-all border-l-4 shadow-[var(--shadow-card)] group"
              style={{ borderLeftColor: 'var(--success)' }}
              onClick={() => openSignup(s)}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-syne font-bold text-[18px] text-[var(--text)] mb-1">{s.fullName}</h3>
                  <p className="font-dm text-[13px] text-[var(--text-secondary)]">Joined {formatDate(s.signupDate || s.createdAt)}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  s.dealStatus === 'done' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                  s.dealStatus === 'deal_failed' ? 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20' :
                  'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}>
                  {s.dealStatus?.replace('_', ' ') || 'Pending'}
                </div>
              </div>
              
              <div className="mt-auto pt-6 border-t border-[var(--border)] flex justify-between items-center">
                <p className="font-dm text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tight">Upline: <span className="text-[var(--blue)]">{s.uplineName || "Direct"}</span></p>
                <ChevronRight size={20} className="text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
          {!loading && signups.length === 0 && (
            <div className="text-center py-20 text-gray-400">No signups found.</div>
          )}
        </div>
      </div>

      {activeSignup && <TrainingTracker signup={activeSignup} trainingList={trainings} />}
    </div>
  );
};

export default Signups;
