import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Navbar from '../components/Navbar';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Target, CheckCircle } from 'lucide-react';
import './../App.css';

const Analysis: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const uid = user.id;

    // 1. Leads Listener
    const unsubLeads = onSnapshot(
      query(collection(db, 'leads'), where('userId', '==', uid)),
      (snap) => {
        const leads = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setStats((prev: any) => ({ ...prev, leads }));
        if (loading) setLoading(false);
      }
    );

    // 2. Signups Listener
    const unsubSignups = onSnapshot(
      query(collection(db, 'signups'), where('userId', '==', uid)),
      (snap) => {
        const signups = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setStats((prev: any) => ({ ...prev, signups }));
      }
    );

    // 3. Team Gen1 Listener (Leaderboard)
    const unsubGen1 = onSnapshot(
      query(collection(db, 'users'), where('referredBy', '==', (user as any).referralCode || '')),
      async (snap) => {
        const gen1 = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        const leaderData = [];
        for (const member of gen1) {
          // This is a bit heavy but for top 10/Gen1 it's okay for now
          const dealsSnap = await getDocs(query(collection(db, 'signups'), where('userId', '==', member.id), where('dealStatus', '==', 'done')));
          leaderData.push({
            name: (member as any).fullName,
            deals: dealsSnap.size,
            rank: (member as any).rank || 'Member'
          });
        }
        leaderData.sort((a, b) => b.deals - a.deals);
        setStats((prev: any) => ({ ...prev, leaderboard: leaderData.slice(0, 10) }));
      }
    );

    return () => {
      unsubLeads();
      unsubSignups();
      unsubGen1();
    };
  }, [user]);

  // Secondary effect to process stats into chart data
  useEffect(() => {
    if (!stats?.leads || !stats?.signups) return;

    const leads = stats.leads;
    const signups = stats.signups;
    const deals = signups.filter((s: any) => s.dealStatus === 'done');
    const now = new Date();

    const ratioLeadSignup = leads.length > 0 ? (signups.length / leads.length) * 100 : 0;
    const ratioSignupDeal = signups.length > 0 ? (deals.length / signups.length) * 100 : 0;

    // Weekly Growth
    const weeklyGrowth: any[] = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      
      const wLeads = leads.filter((l: any) => {
        const d = l.createdAt?.toDate?.() || new Date(l.createdAt);
        return d >= start && d < end;
      }).length;
      const wSignups = signups.filter((s: any) => {
        const d = s.createdAt?.toDate?.() || new Date(s.createdAt);
        return d >= start && d < end;
      }).length;
      const wDeals = deals.filter((d: any) => {
        const date = d.dealDoneDate?.toDate?.() || new Date(d.dealDoneDate || d.updatedAt);
        return date >= start && date < end;
      }).length;

      weeklyGrowth.push({ week: 4 - i, leads: wLeads, signups: wSignups, deals: wDeals });
    }

    // Monthly Snapshot
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const mStats = {
      thisMonth: {
        leads: leads.filter((l: any) => (l.createdAt?.toDate?.() || new Date(l.createdAt)) >= thisMonthStart).length,
        signups: signups.filter((s: any) => (s.createdAt?.toDate?.() || new Date(s.createdAt)) >= thisMonthStart).length,
        deals: deals.filter((d: any) => (d.dealDoneDate?.toDate?.() || new Date(d.dealDoneDate || d.updatedAt)) >= thisMonthStart).length,
      },
      lastMonth: {
        leads: leads.filter((l: any) => {
          const d = l.createdAt?.toDate?.() || new Date(l.createdAt);
          return d >= lastMonthStart && d <= lastMonthEnd;
        }).length,
        signups: signups.filter((s: any) => {
          const d = s.createdAt?.toDate?.() || new Date(s.createdAt);
          return d >= lastMonthStart && d <= lastMonthEnd;
        }).length,
        deals: deals.filter((d: any) => {
          const date = d.dealDoneDate?.toDate?.() || new Date(d.dealDoneDate || d.updatedAt);
          return date >= lastMonthStart && date <= lastMonthEnd;
        }).length,
      }
    };

    // Dead Leads
    const deadReasons: any = {};
    leads.filter((l: any) => l.status === 'not_interested').forEach((l: any) => {
      const r = l.failReason || 'Unspecified';
      deadReasons[r] = (deadReasons[r] || 0) + 1;
    });
    const deadLeadsData = Object.keys(deadReasons).map(reason => ({ name: reason, count: deadReasons[reason] }));

    // Best Call Time
    const callTimes: any = {};
    leads.forEach((l: any) => {
      if (l.updatedAt) {
        const h = (l.updatedAt?.toDate?.() || new Date(l.updatedAt)).getHours();
        callTimes[h] = (callTimes[h] || 0) + 1;
      }
    });
    const callTimeData = Object.keys(callTimes).map(h => ({ hour: `${h}:00`, count: callTimes[h] }));

    setProcessedStats({
      dailyLeads: leads.filter((l: any) => {
        const d = l.createdAt?.toDate?.() || new Date(l.createdAt);
        const today = new Date();
        today.setHours(0,0,0,0);
        return d >= today;
      }).length,
      conversion: { ratio: ratioLeadSignup },
      dealConversion: { ratio: ratioSignupDeal },
      deadLeads: deadLeadsData,
      leaderboard: stats.leaderboard || [],
      snapshot: mStats,
      weeklyGrowth,
      callTime: callTimeData,
      teamDeals: (stats.leaderboard || []).reduce((acc: number, curr: any) => acc + curr.deals, 0)
    });
  }, [stats]);

  const [processedStats, setProcessedStats] = useState<any>(null);

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6 text-center">
      <div className="space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-400 font-medium">Analyzing deep business data...</p>
      </div>
    </div>
  );
  
  if (!stats?.leads) return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Navbar />
      <div className="dashboard-container py-20 text-center">
        <p className="text-gray-500">No lead data to analyze yet.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      <div className="dashboard-container">
        <h1 className="text-2xl font-bold mb-6">Business Analysis</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Lead Conv.</p>
            <h3 className="text-2xl font-bold text-blue-500">{Math.round(processedStats?.conversion?.ratio || 0)}%</h3>
            <p className="text-[10px] text-gray-500">Signup/Leads</p>
          </div>
          <div className="glass-card">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Deal Conv.</p>
            <h3 className="text-2xl font-bold text-emerald-500">{Math.round(processedStats?.dealConversion?.ratio || 0)}%</h3>
            <p className="text-[10px] text-gray-500">Deals/Signups</p>
          </div>
          <div className="glass-card">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Daily Leads</p>
            <h3 className="text-2xl font-bold text-indigo-500">{processedStats?.dailyLeads || 0}</h3>
            <p className="text-[10px] text-gray-500">Added Today</p>
          </div>
          <div className="glass-card">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Team Deals</p>
            <h3 className="text-2xl font-bold text-amber-500">{processedStats?.teamDeals || 0}</h3>
            <p className="text-[10px] text-gray-500">Total Generation</p>
          </div>
        </div>

        {/* Weekly Growth Chart */}
        <div className="glass-card mb-6">
          <h3 className="font-bold mb-4">Weekly Growth</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedStats?.weeklyGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" stroke="#64748b" fontSize={12} tickFormatter={(val) => `Week ${val}`} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                />
                <Bar dataKey="leads" fill="#2563EB" radius={[4, 4, 0, 0]} name="Leads" />
                <Bar dataKey="signups" fill="#10B981" radius={[4, 4, 0, 0]} name="Signups" />
                <Bar dataKey="deals" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Deals" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dead Leads Reasons */}
          <div className="glass-card">
            <h3 className="font-bold mb-4 text-red-500">Dead Leads Analysis</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedStats?.deadLeads || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="name"
                  >
                    {(processedStats?.deadLeads || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {(processedStats?.deadLeads || []).map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">{item.name || 'Other'}</span>
                  <span className="font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="glass-card">
            <h3 className="font-bold mb-4 text-emerald-500">Top Team Performers</h3>
            <div className="space-y-3">
              {processedStats?.leaderboard?.length > 0 ? processedStats.leaderboard.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-gray-300 text-black' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-white/10 text-gray-400'}`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{item.name}</p>
                      <p className="text-[10px] text-gray-500 uppercase">{item.rank}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-500">{item.deals} Deals</p>
                  </div>
                </div>
              )) : (
                <p className="text-center text-gray-500 text-sm py-10">No team data yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Best Call Time */}
        <div className="glass-card mt-6">
          <h3 className="font-bold mb-4 text-blue-500">Best Call Time Response Rate</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedStats?.callTime || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Engagements" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Snapshot */}
        <div className="glass-card mt-6">
          <h3 className="font-bold mb-4">Monthly Snapshot</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[10px] text-gray-400 mb-1">Leads</p>
              <h4 className="text-lg font-bold">{processedStats?.snapshot?.thisMonth?.leads}</h4>
              <p className={`text-[10px] ${processedStats?.snapshot?.thisMonth?.leads >= processedStats?.snapshot?.lastMonth?.leads ? 'text-green-500' : 'text-red-500'}`}>
                {processedStats?.snapshot?.thisMonth?.leads >= processedStats?.snapshot?.lastMonth?.leads ? '↑' : '↓'} 
                {processedStats?.snapshot?.lastMonth?.leads > 0 ? Math.round((Math.abs(processedStats.snapshot.thisMonth.leads - processedStats.snapshot.lastMonth.leads) / processedStats.snapshot.lastMonth.leads) * 100) : 100}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">Signups</p>
              <h4 className="text-lg font-bold">{processedStats?.snapshot?.thisMonth?.signups}</h4>
              <p className={`text-[10px] ${processedStats?.snapshot?.thisMonth?.signups >= processedStats?.snapshot?.lastMonth?.signups ? 'text-green-500' : 'text-red-500'}`}>
                {processedStats?.snapshot?.thisMonth?.signups >= processedStats?.snapshot?.lastMonth?.signups ? '↑' : '↓'}
                {processedStats?.snapshot?.lastMonth?.signups > 0 ? Math.round((Math.abs(processedStats.snapshot.thisMonth.signups - processedStats.snapshot.lastMonth.signups) / processedStats.snapshot.lastMonth.signups) * 100) : 100}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-1">Deals</p>
              <h4 className="text-lg font-bold">{processedStats?.snapshot?.thisMonth?.deals}</h4>
              <p className={`text-[10px] ${processedStats?.snapshot?.thisMonth?.deals >= processedStats?.snapshot?.lastMonth?.deals ? 'text-green-500' : 'text-red-500'}`}>
                {processedStats?.snapshot?.thisMonth?.deals >= processedStats?.snapshot?.lastMonth?.deals ? '↑' : '↓'}
                {processedStats?.snapshot?.lastMonth?.deals > 0 ? Math.round((Math.abs(processedStats.snapshot.thisMonth.deals - processedStats.snapshot.lastMonth.deals) / processedStats.snapshot.lastMonth.deals) * 100) : 100}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis;
