import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';

import { Play, Copy, ExternalLink, Plus, MessageSquare, Trash2, CheckCircle, Clock, X, Edit2 } from 'lucide-react';
import './../App.css';

const Training: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [trainings, setTrainings] = useState<any[]>([]);
  const [type, setType] = useState('signup');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTraining, setEditingTraining] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', link: '', type: 'signup' });

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(db, 'trainings'),
      where('userId', '==', user.id),
      where('type', '==', type),
      orderBy('step', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setTrainings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Training sync error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, type]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingTraining) {
        await updateDoc(doc(db, 'trainings', editingTraining.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        showToast("Training updated ✅", "success");
      } else {
        // Auto assign step
        const step = trainings.length + 1;
        await addDoc(collection(db, 'trainings'), {
          ...formData,
          userId: user.id,
          step,
          createdAt: serverTimestamp()
        });
        showToast("Training added ✅", "success");
      }
      setShowModal(false);
      setEditingTraining(null);
      setFormData({ title: '', link: '', type: type });
    } catch (err) {
      console.error(err);
      showToast("Failed to save training", "error");
    }
  };

  const handleDelete = async (t: any) => {
    if (!confirm('Are you sure you want to delete this training step? Remaining steps will be re-indexed.')) return;
    try {
      await deleteDoc(doc(db, 'trainings', t.id));
      
      // Reorder remaining steps
      const remaining = trainings.filter(item => item.id !== t.id);
      const batch = writeBatch(db);
      remaining.forEach((item, index) => {
        const ref = doc(db, 'trainings', item.id);
        batch.update(ref, { step: index + 1 });
      });
      await batch.commit();
      
      showToast("Training deleted & reordered", "success");
    } catch (err) {
      console.error(err);
      showToast("Delete failed", "error");
    }
  };

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
      `📚 Training Step ${step}: ${title}\n\n${link}\n\nShared via TRAKZY AI`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      <div className="dashboard-container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Training Materials</h1>
          <button 
            onClick={() => {
              setEditingTraining(null);
              setFormData({ title: '', link: '', type: type });
              setShowModal(true);
            }} 
            className="bg-blue-600 p-2 rounded-lg hover:bg-blue-500 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mb-6 w-fit">
          <button
            onClick={() => setType('signup')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
              type === 'signup' ? 'bg-blue-600 text-white' : 'text-gray-400'
            }`}
          >
            Signup Training
          </button>
          <button
            onClick={() => setType('deal_done')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
              type === 'deal_done' ? 'bg-blue-600 text-white' : 'text-gray-400'
            }`}
          >
            Deal Done Training
          </button>
        </div>

        <div className="space-y-4">
          {trainings.map((t, idx) => (
            <div key={t.id} className="glass-card flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold border border-blue-500/20">
                    {t.step}
                  </div>
                  <div>
                    <h3 className="font-bold">{t.title}</h3>
                    <p className="text-[10px] text-gray-500 break-all">{t.link}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => {
                      setEditingTraining(t);
                      setFormData({ title: t.title, link: t.link, type: t.type });
                      setShowModal(true);
                    }}
                    className="p-1.5 text-gray-500 hover:text-blue-500 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(t)}
                    className="p-1.5 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button 
                   onClick={() => window.open(t.link, '_blank')}
                   className="py-2.5 bg-white/5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold hover:bg-white/10 transition-all"
                >
                  <Play size={14} className="text-blue-500" /> Watch
                </button>
                <button 
                  onClick={() => copyTrainingLink(t.link)}
                  className="py-2.5 bg-white/5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold hover:bg-white/10 transition-all"
                >
                  <Copy size={14} className="text-emerald-500" /> Copy
                </button>
                <button 
                  onClick={() => shareTrainingOnWhatsApp(t.title, t.link, t.step)}
                  className="py-2.5 bg-white/5 rounded-xl flex items-center justify-center gap-2 text-xs font-bold hover:bg-white/10 transition-all"
                >
                  <MessageSquare size={14} className="text-green-500" /> Share
                </button>
              </div>
            </div>
          ))}
          {!loading && trainings.length === 0 && (
            <div className="text-center py-20 text-gray-400">No training steps found.</div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[#0A0A0A]/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="glass-card w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{editingTraining ? 'Edit Training' : 'Add Training'}</h2>
              <X className="cursor-pointer" onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="input-group">
                <label>Type</label>
                <select 
                  className="w-full bg-white/5 p-3 rounded-lg border border-white/10 text-white" 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="signup">Signup Training</option>
                  <option value="deal_done">Deal Done Training</option>
                </select>
              </div>
              <div className="input-group">
                <label>Title</label>
                <input 
                  type="text" 
                  className="w-full" 
                  required 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>
              <div className="input-group">
                <label>Video/Doc Link</label>
                <input 
                  type="url" 
                  className="w-full" 
                  required 
                  value={formData.link}
                  onChange={(e) => setFormData({...formData, link: e.target.value})}
                />
              </div>
              <button type="submit" className="btn btn-primary">{editingTraining ? 'Update Step' : 'Create Step'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Training;
