import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import Navbar from '../components/Navbar';

import { 
  User, 
  Phone, 
  TrendingUp, 
  Calendar, 
  ChevronRight, 
  X, 
  Target, 
  CheckCircle2, 
  Clock, 
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import './../App.css';

const Team: React.FC = () => {
  const { profile } = useAuth();
  const [level, setLevel] = useState('1');
  const [gen1Members, setGen1Members] = useState<any[]>([]);
  const [gen2Members, setGen2Members] = useState<any[]>([]);
  const [gen3Members, setGen3Members] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [memberStats, setMemberStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchMemberData = async (memberId: string) => {
    try {
      // Leads count
      const leadsSnap = await getDocs(
        query(collection(db, 'leads'),
        where('userId', '==', memberId))
      );
      
      // Signups count
      const signupsSnap = await getDocs(
        query(collection(db, 'signups'),
        where('userId', '==', memberId))
      );
      
      // Deals count
      const dealsSnap = await getDocs(
        query(collection(db, 'signups'),
        where('userId', '==', memberId),
        where('dealStatus', '==', 'done'))
      );
      
      // Pending followups
      const followupsSnap = await getDocs(
        query(collection(db, 'followups'),
        where('userId', '==', memberId),
        where('status', '==', 'pending'))
      );
      
      return {
        leadsCount: leadsSnap.size,
        signupsCount: signupsSnap.size,
        dealsCount: dealsSnap.size,
        pendingCount: followupsSnap.size
      };
    } catch (err) {
      console.error("Error fetching member stats:", err);
      return { leadsCount: 0, signupsCount: 0, dealsCount: 0, pendingCount: 0 };
    }
  };

  const fetchGen1 = async () => {
    if (!profile?.referralCode) return [];
    const q = query(
      collection(db, 'users'),
      where('referredBy', '==', profile.referralCode)
    );
    const snap = await getDocs(q);
    const membersData = await Promise.all(snap.docs.map(async (d) => {
      const data = d.data();
      const stats = await fetchMemberData(d.id);
      return { id: d.id, ...data, ...stats };
    }));
    setGen1Members(membersData);
    return membersData;
  };

  const fetchGen2 = async (g1: any[]) => {
    const gen1Codes = g1.map(m => m.referralCode).filter(Boolean);
    if (gen1Codes.length === 0) {
      setGen2Members([]);
      return [];
    }
    
    const membersData: any[] = [];
    for (const code of gen1Codes) {
      const q = query(
        collection(db, 'users'),
        where('referredBy', '==', code)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const stats = await fetchMemberData(d.id);
        membersData.push({ id: d.id, ...d.data(), ...stats });
      }
    }
    setGen2Members(membersData);
    return membersData;
  };

  const fetchGen3 = async (g2: any[]) => {
    const gen2Codes = g2.map(m => m.referralCode).filter(Boolean);
    if (gen2Codes.length === 0) {
      setGen3Members([]);
      return [];
    }
    
    const membersData: any[] = [];
    for (const code of gen2Codes) {
      const q = query(
        collection(db, 'users'),
        where('referredBy', '==', code)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const stats = await fetchMemberData(d.id);
        membersData.push({ id: d.id, ...d.data(), ...stats });
      }
    }
    setGen3Members(membersData);
    return membersData;
  };

  useEffect(() => {
    if (!profile) return;

    const fetchAllData = async () => {
      setLoading(true);
      try {
        const g1 = await fetchGen1();
        const g2 = await fetchGen2(g1);
        await fetchGen3(g2);
      } catch (err) {
        console.error("Error fetching team hierarchy:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [profile]);

  useEffect(() => {
    if (level === '1') setMembers(gen1Members);
    else if (level === '2') setMembers(gen2Members);
    else if (level === '3') setMembers(gen3Members);
  }, [level, gen1Members, gen2Members, gen3Members]);

  const getActivityStatus = (lastActive: any) => {
    if (!lastActive) return 'inactive';
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diff = now.getTime() - lastActiveDate.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    
    if (days < 1) return 'active';
    if (days < 3) return 'idle';
    return 'inactive';
  };

  const openMemberModal = async (member: any) => {
    setSelectedMember(member);
    setStatsLoading(true);
    const stats = await fetchMemberData(member.id);
    setMemberStats(stats);
    setStatsLoading(false);
  };

  return (
    <div className="min-h-screen pb-32 pt-8 px-6 max-w-7xl mx-auto">
      <Navbar />
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10 animate-fade-up">
        <div>
          <h1 className="font-syne font-black text-[32px] text-[var(--text)]">Team Network</h1>
          <p className="font-dm text-[14px] text-[var(--text-secondary)]">Manage your business hierarchy up to Gen 3.</p>
        </div>
        
        <div className="flex bg-[var(--bg2)] p-1.5 rounded-2xl border border-[var(--border)] shadow-sm">
          {['1', '2', '3'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setLevel(lvl)}
              className={`px-6 py-2.5 rounded-xl text-[13px] font-syne font-bold uppercase tracking-wider transition-all ${
                level === lvl ? 'bg-[var(--blue)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}
            >
              GEN {lvl}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-[var(--blue)] border-t-transparent rounded-full animate-spin"></div>
            <p className="font-dm text-[14px] text-[var(--text-secondary)]">Assembling team data...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-[var(--bg2)] border border-[var(--border)] rounded-[32px]">
            <p className="font-syne font-bold text-[18px] text-[var(--text-secondary)] mb-2">No Members in GEN {level}</p>
            <p className="font-dm text-[14px] text-[var(--text-muted)]">Time to expand your network!</p>
          </div>
        ) : members.map((member) => {
          const status = getActivityStatus(member.lastActive);
          return (
            <motion.div 
              layoutId={member.id}
              key={member.id} 
              onClick={() => openMemberModal(member)}
              className="bg-[var(--card)] border border-[var(--border)] rounded-[32px] p-8 relative overflow-hidden group cursor-pointer hover:shadow-[var(--shadow-card)] hover:-translate-y-1 transition-all duration-300"
            >
              {/* Decorative Wave */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--blue)] opacity-[0.03] -mr-16 -mt-16 rounded-full group-hover:scale-125 transition-transform duration-500"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-syne font-bold text-[18px] text-[var(--text)] truncate">{member.fullName}</h3>
                    <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-[var(--blue-dim)] border border-[var(--border-blue)] rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--blue)]"></div>
                      <span className="text-[10px] font-black text-[var(--blue)] uppercase">{member.rank}</span>
                    </div>
                  </div>
                  <p className="font-mono text-[13px] text-[var(--text-secondary)] flex items-center gap-2">
                    <Phone size={13} className="text-[var(--text-muted)]" /> {member.phone}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div className={`w-3 h-3 rounded-full shadow-sm ${
                    status === 'active' ? 'bg-emerald-500' : status === 'idle' ? 'bg-amber-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-tighter">{status}</span>
                </div>
              </div>

              <div className="h-[1px] bg-[var(--border)] mb-6"></div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="font-dm text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Leads</p>
                  <p className="font-syne font-black text-[16px] text-[var(--blue)]">{member.leadsCount || 0}</p>
                </div>
                <div className="text-center">
                  <p className="font-dm text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Signups</p>
                  <p className="font-syne font-black text-[16px] text-emerald-500">{member.signupsCount || 0}</p>
                </div>
                <div className="text-center">
                  <p className="font-dm text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Deals</p>
                  <p className="font-syne font-black text-[16px] text-amber-500">{member.dealsCount || 0}</p>
                </div>
                <div className="text-center">
                  <p className="font-dm text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Pending</p>
                  <p className="font-syne font-black text-[16px] text-red-500">{member.pendingCount || 0}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Read Only Modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div 
              layoutId={selectedMember.id}
              className="bg-[var(--bg2)] border border-[var(--border)] rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
            >
              <div className="sticky top-0 z-10 bg-[var(--bg2)]/80 backdrop-blur-md p-8 border-b border-[var(--border)] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[var(--blue)] rounded-2xl flex items-center justify-center text-white shadow-lg">
                    <User size={28} />
                  </div>
                  <div>
                    <h2 className="font-syne font-black text-[24px] text-[var(--text)] leading-tight">{selectedMember.fullName}</h2>
                    <p className="font-dm text-[14px] text-[var(--text-secondary)]">Member Profile Dashboard (Read-Only)</p>
                  </div>
                </div>
                <button onClick={() => setSelectedMember(null)} className="w-12 h-12 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg2)] transition-all">
                  <X size={24} className="text-[var(--text-secondary)]" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                {/* Stats Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Leads', val: memberStats?.leadsCount || 0, icon: Target, color: 'text-[var(--blue)]', bg: 'bg-[var(--blue)]/5' },
                    { label: 'Signups', val: memberStats?.signupsCount || 0, icon: User, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
                    { label: 'Deals', val: memberStats?.dealsCount || 0, icon: CheckCircle2, color: 'text-amber-500', bg: 'bg-amber-500/5' },
                    { label: 'Pending', val: memberStats?.pendingCount || 0, icon: Clock, color: 'text-red-500', bg: 'bg-red-500/5' }
                  ].map(stat => (
                    <div key={stat.label} className={`${stat.bg} p-6 rounded-3xl border border-[var(--border)] flex flex-col items-center justify-center text-center`}>
                      <stat.icon className={`${stat.color} mb-3`} size={24} />
                      <p className="font-syne font-black text-[24px] text-[var(--text)] leading-none">{stat.val}</p>
                      <p className="font-dm text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Additional Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4 text-[var(--text-secondary)]">
                      <TrendingUp size={18} />
                      <span className="font-syne font-bold text-[14px] uppercase tracking-wider">Performance Rank</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-[32px]">🏅</div>
                      <div>
                        <p className="font-syne font-black text-[20px] text-[var(--text)]">{selectedMember.rank}</p>
                        <p className="font-dm text-[12px] text-[var(--text-muted)] uppercase font-bold tracking-tighter">Current Designation</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4 text-[var(--text-secondary)]">
                      <Calendar size={18} />
                      <span className="font-syne font-bold text-[14px] uppercase tracking-wider">Join Date</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-[32px]">📅</div>
                      <div>
                        <p className="font-syne font-black text-[20px] text-[var(--text)]">{new Date(selectedMember.createdAt).toLocaleDateString()}</p>
                        <p className="font-dm text-[12px] text-[var(--text-muted)] uppercase font-bold tracking-tighter">Authorized Partner</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Status Banner */}
                <div className="bg-[var(--blue-dim)] border border-[var(--border-blue)] rounded-3xl p-8 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-[var(--blue)] rounded-2xl text-white">
                      <Activity size={24} />
                    </div>
                    <div>
                      <p className="font-syne font-black text-[18px] text-[var(--blue)]">Real-time Activity</p>
                      <p className="font-dm text-[14px] text-[var(--text-secondary)]">Last seen: {new Date(selectedMember.lastActive).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="hidden md:block">
                     <span className={`px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-widest ${
                       getActivityStatus(selectedMember.lastActive) === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-[var(--text-muted)]/10 text-[var(--text-muted)] border border-[var(--border)]'
                     }`}>
                       {getActivityStatus(selectedMember.lastActive)}
                     </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Team;

