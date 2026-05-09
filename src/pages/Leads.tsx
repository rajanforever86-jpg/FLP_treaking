import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp,
  orderBy,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useToast } from '../context/ToastContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Navbar from '../components/Navbar';

import { 
  Plus, 
  Search, 
  Phone, 
  MessageSquare, 
  Filter, 
  FileUp, 
  ChevronRight, 
  X, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  MoreVertical,
  Target as TargetIcon
} from 'lucide-react';
import { formatDate } from '../utils/helpers';
import './../App.css';

const Leads: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [leads, setLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [counts, setCounts] = useState<{ [key: string]: number }>({});

  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const tabs = ['All', 'pending', 'plan_share', 'not_interested', 'no_receive', 'signup_done'];

  useEffect(() => {
    // Calculate live counts whenever leads state changes
    const newCounts: { [key: string]: number } = { All: leads.length };
    tabs.forEach(tab => {
      if (tab !== 'All') {
        newCounts[tab] = leads.filter(l => l.status === tab).length;
      }
    });
    setCounts(newCounts);
  }, [leads]);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(db, 'leads'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeads(leadsData);
      setLoading(false);
    }, (error) => {
      console.error("Real-time leads sync error:", error);
      showToast("Real-time sync failed. Check permissions.", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const fetchLeads = async () => {
    // This is now handled by onSnapshot, keeping empty for compatibility if called elsewhere
  };

  const filteredLeads = leads.filter(l => {
    const matchesTab = activeTab === 'All' || l.status === activeTab;
    const matchesSearch = (l.name?.toLowerCase() || '').includes(search.toLowerCase()) || (l.phone || '').includes(search);
    return matchesTab && matchesSearch;
  });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) {
      console.log("Import cancelled: No file or user session found.");
      return;
    }

    console.log("--- Starting Import Process ---");
    console.log("File Name:", file.name);
    console.log("File Size:", file.size, "bytes");
    console.log("User ID:", user.id);

    setLoading(true);
    const fileName = file.name.toLowerCase();
    
    try {
      if (fileName.endsWith('.csv')) {
        console.log("Detected CSV file format.");
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            console.log("PapaParse complete. Found", results.data.length, "rows.");
            if (results.errors.length > 0) {
              console.warn("PapaParse reported errors:", results.errors);
            }
            await processImportedData(results.data);
          },
          error: (error) => {
            console.error("CSV Parse Error:", error);
            alert("Failed to parse CSV file: " + error.message);
            setLoading(false);
          }
        });
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        console.log("Detected Excel file format.");
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const bstr = event.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);
            console.log("XLSX parse complete. Found", data.length, "rows in sheet:", wsname);
            await processImportedData(data);
          } catch (err) {
            console.error("Excel Parse Error:", err);
            alert("Failed to parse Excel file.");
            setLoading(false);
          }
        };
        reader.readAsBinaryString(file);
      } else {
        alert("Please upload a .csv or .xlsx file.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Import processing error:", err);
      alert("An error occurred during import.");
      setLoading(false);
    }
  };

  const processImportedData = async (rawData: any[]) => {
    console.log("Processing", rawData.length, "records...");
    
    if (rawData.length > 0) {
      const detectedColumns = Object.keys(rawData[0]).map(k => k.trim());
      console.log("Detected Columns in file:", detectedColumns);
      console.log("DEBUG: First Raw Row Object:", rawData[0]);
    }

    let imported = 0;
    let skipped = 0;
    let duplicates = 0;
    let errors = 0;

    // Define header aliases
    const NAME_HEADERS = ['name', 'full name', 'fullname', 'lead name', 'customer name'];
    const PHONE_HEADERS = ['phone', 'mobile', 'mobile number', 'phone number', 'contact', 'whatsapp number', 'number'];
    const AGE_HEADERS = ['age', 'years'];
    const CITY_HEADERS = ['city', 'location', 'town', 'address'];

    // Get existing phone numbers for duplicate check
    const existingPhones = new Set(leads.map(l => String(l.phone).trim()));
    console.log("Existing leads in state:", existingPhones.size);

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      
      // Normalize keys: trim and lowercase
      const data: any = {};
      Object.keys(row).forEach(k => {
        data[k.trim().toLowerCase()] = row[k];
      });

      // Flexible mapping for Name
      let name = '';
      for (const h of NAME_HEADERS) {
        if (data[h]) {
          name = String(data[h]).trim();
          break;
        }
      }

      // Flexible mapping for Phone
      let phone = '';
      for (const h of PHONE_HEADERS) {
        if (data[h]) {
          phone = String(data[h]).trim();
          break;
        }
      }

      // Flexible mapping for Age
      let age = null;
      for (const h of AGE_HEADERS) {
        if (data[h]) {
          age = parseInt(data[h]) || null;
          break;
        }
      }

      // Flexible mapping for City
      let city = '';
      for (const h of CITY_HEADERS) {
        if (data[h]) {
          city = String(data[h]).trim();
          break;
        }
      }

      if (!name || !phone) {
        console.warn(`Row [${i + 1}] skipped: Missing name or phone.`, { 
          name, 
          phone, 
          raw_row: row,
          normalized_keys: Object.keys(data)
        });
        skipped++;
        continue;
      }

      if (existingPhones.has(phone)) {
        console.warn(`Row [${i + 1}] skipped: Duplicate phone number.`, phone);
        duplicates++;
        continue;
      }

      console.log(`Attempting to save lead [${i + 1}]: ${name} (${phone})`);

      try {
        const leadData = {
          userId: user.id,
          name,
          age,
          city,
          phone,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'leads'), leadData);
        console.log(`Lead [${i + 1}] saved successfully! Document ID:`, docRef.id);
        
        imported++;
        // Add to local check set to prevent duplicates within the same import batch
        existingPhones.add(phone);
      } catch (err: any) {
        console.error(`ERROR saving lead [${i + 1}] (${name}):`, err);
        errors++;
        
        // If it's a permission error, we should get detailed info
        if (err.message && err.message.includes('permission')) {
          try {
            handleFirestoreError(err, OperationType.WRITE, 'leads');
          } catch (detailedError) {
            console.error("Detailed Permission Error:", detailedError);
          }
        }
      }
    }

    console.log("--- Import Process Summary ---");
    console.log("Total Records:", rawData.length);
    console.log("Imported:", imported);
    console.log("Duplicates:", duplicates);
    console.log("Skipped (Invalid):", skipped);
    console.log("Errors (Firestore):", errors);

    showToast(`Import Success: ${imported} Leads`, "success");
    
    await fetchLeads();
    setLoading(false);
    // Reset file input
    const fileInput = document.getElementById('csv-import') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const deleteLead = async (leadId: string) => {
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      setLeads(prev => prev.filter(l => l.id !== leadId));
      setSelectedLead(null);
      showToast("Lead deleted ✅", "success");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Delete failed ❌", "error");
    }
  };

  const deleteSelected = async () => {
    if (selectedLeadIds.length === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all(
        selectedLeadIds.map(id =>
          deleteDoc(doc(db, 'leads', id))
        )
      );
      setLeads(prev =>
        prev.filter(l => 
          !selectedLeadIds.includes(l.id)
        )
      );
      const count = selectedLeadIds.length;
      setSelectedLeadIds([]);
      setSelectionMode(false);
      showToast(`${count} leads deleted ✅`, "success");
    } catch (err) {
      console.error("Bulk delete:", err);
      showToast("Delete failed ❌", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteAllLeads = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const q = query(
        collection(db, 'leads'),
        where('userId', '==', user.id)
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        showToast("No leads to delete", "error");
        return;
      }

      // Batch delete 400 at a time
      for (let i = 0; i < snap.docs.length; i += 400) {
        const batchDocs = snap.docs.slice(i, i + 400);
        await Promise.all(
          batchDocs.map(d => deleteDoc(d.ref))
        );
      }
      
      setLeads([]);
      setSelectedLeadIds([]);
      setSelectionMode(false);
      showToast("All leads deleted ✅", "success");
    } catch (err) {
      console.error("Delete all:", err);
      showToast("Delete all failed ❌", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const selectAll = () => {
    const visibleIds = filteredLeads.map(l => l.id);
    setSelectedLeadIds(visibleIds);
  };

  const deselectAll = () => {
    setSelectedLeadIds([]);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
    setSelectedLeadIds([]);
  };

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedLeadIds(prev =>
      prev.includes(id)
        ? prev.filter(lid => lid !== id)
        : [...prev, id]
    );
  };
  const updateStatus = async (leadId: string, lead: any, payload: any) => {
    if (!user) return;
    try {
      const leadRef = doc(db, 'leads', leadId);
      const updateData: any = {
        ...payload,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(leadRef, updateData);
      
      // Side effects for different statuses
      if (payload.status === 'not_interested' && payload.futureFollowupDate) {
        await addDoc(collection(db, 'followups'), {
          userId: user.id,
          leadId,
          leadName: lead.name,
          phone: lead.phone,
          type: 'future_reminder',
          scheduledDate: payload.futureFollowupDate,
          status: 'pending',
          createdAt: serverTimestamp()
        });
      } else if (payload.status === 'plan_share') {
        await addDoc(collection(db, 'followups'), {
          userId: user.id,
          leadId,
          leadName: lead.name,
          phone: lead.phone,
          type: 'plan_share',
          scheduledDate: payload.planShareDate,
          scheduledTime: payload.planShareTime,
          status: 'pending',
          createdAt: serverTimestamp()
        });
      } else if (payload.status === 'no_receive') {
        await addDoc(collection(db, 'followups'), {
          userId: user.id,
          leadId,
          leadName: lead.name,
          phone: lead.phone,
          type: 'no_receive',
          scheduledDate: payload.noReceiveDate,
          scheduledTime: payload.noReceiveTime,
          status: 'pending',
          createdAt: serverTimestamp()
        });
      } else if (payload.status === 'signup_done') {
        await addDoc(collection(db, 'signups'), {
          userId: user.id,
          leadId,
          fullName: lead.name,
          phone: lead.phone,
          uplineId: user.id,
          signupDate: serverTimestamp(),
          dealStatus: 'pending',
          trainingProgress: [],
          createdAt: serverTimestamp()
        });
      }
      
      setSelectedLead(null);
      showToast("Pipeline updated successfully!", "success");
    } catch (err) {
      console.error("Update error:", err);
      showToast("Update failed. Please check your connection.", "error");
    }
  };

  const DayPicker = ({ value, onChange, label }: { value: string, onChange: (val: string) => void, label: string }) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    
    const daysInMonth = new Date(currentYear, selectedMonth + 1, 0).getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="font-dm text-[12px] text-[var(--text-muted)] uppercase font-bold tracking-widest">{label}</label>
          <div className="flex gap-1">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-[12px] font-bold text-[var(--blue)] border-none outline-none cursor-pointer"
            >
              {months.map((m, i) => <option key={m} value={i} className="bg-[var(--bg2)]">{m}</option>)}
            </select>
            <span className="text-[12px] font-bold text-[var(--text-secondary)]">{currentYear}</span>
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
                className={`min-w-[44px] h-11 rounded-xl border flex items-center justify-center transition-all font-mono font-bold text-[14px] ${isSelected ? 'bg-[var(--blue)] border-[var(--blue)] text-white shadow-lg' : 'bg-[var(--bg3)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg2)]'}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const LeadProfilePanel = ({ lead }: { lead: any }) => {
    const [action, setAction] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
      if (action === 'no_receive') {
        setFormData({ attempts: (lead.attempts || 0) + 1 });
      } else {
        setFormData({});
      }
    }, [action]);

    const handleAction = (type: string) => {
      setAction(type);
    };

    const handleConfirmUpdate = async (status: string, data: any) => {
      let finalStatus = status;
      let finalData = { ...data };
      
      if (status === 'no_receive') {
        const attempts = (lead.noReceiveCount || 0) + 1;
        if (attempts >= 3) {
          if (window.confirm("3 attempts made. Drop this lead?")) {
            finalStatus = 'dropped';
            finalData = { ...data, noReceiveCount: attempts };
          } else {
            finalData = { ...data, noReceiveCount: attempts };
          }
        } else {
          finalData = { ...data, noReceiveCount: attempts };
        }
      }
      await updateStatus(lead.id, lead, { status: finalStatus, ...finalData });
    };

    return (
      <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedLead(null)}></div>
        <div className="relative w-full md:w-[480px] h-full bg-[var(--bg2)] border-l border-[var(--border)] shadow-[var(--shadow)] overflow-y-auto animate-in slide-in-from-right duration-500 ease-out">
          <div className="sticky top-0 z-20 bg-[var(--bg2)]/80 backdrop-blur-md px-8 py-6 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="font-syne font-black text-[22px] text-[var(--text)]">Lead Profile</h2>
            <button onClick={() => setSelectedLead(null)} className="w-10 h-10 rounded-full bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--bg2)] transition-all">
              <X size={20} className="text-[var(--text-muted)]" />
            </button>
          </div>

          <div className="p-8">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-[32px] p-8 mb-8 relative overflow-hidden group shadow-[var(--shadow-card)]">
              <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <TargetIcon size={120} className="text-[var(--blue)] rotate-12" />
              </div>
              <h3 className="font-syne font-black text-[28px] text-[var(--text)] leading-none mb-3 break-words relative z-10">{lead.name}</h3>
              <p className="font-mono text-[13px] text-[var(--blue)] font-black uppercase tracking-[2px] mb-8 relative z-10">Age {lead.age || '—'} / {lead.city || 'Undeclared'}</p>
              
              <div className="flex gap-4 relative z-10">
                <a 
                  href={`tel:${lead.phone}`} 
                  className="flex-1 bg-[var(--blue)] h-14 rounded-2xl flex items-center justify-center gap-3 font-syne font-bold text-white hover:brightness-110 transition-all shadow-[var(--shadow-blue)] active:scale-95"
                >
                  <Phone size={20} /> Call Now
                </a>
                <a 
                  href={`https://wa.me/91${lead.phone}`} 
                  target="_blank"
                  rel="noreferrer"
                  className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 hover:bg-emerald-500/20 transition-all"
                >
                  <MessageSquare size={22} />
                </a>
              </div>
            </div>

            <div className="space-y-6">
              <div className="font-dm text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[3px] border-b border-[var(--border)] pb-3 mb-2">Update Pipeline</div>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => handleAction('not_interested')} 
                  className={`py-5 px-4 rounded-[22px] border font-syne font-bold text-[13px] transition-all ${action === 'not_interested' ? 'bg-[var(--error)] border-[var(--error)] text-white shadow-lg' : 'bg-[var(--error)]/5 border-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/10'}`}
                >
                  Not Interested
                </button>
                <button 
                  onClick={() => handleAction('plan_share')} 
                  className={`py-5 px-4 rounded-[22px] border font-syne font-bold text-[13px] transition-all ${action === 'plan_share' ? 'bg-[var(--blue)] border-[var(--blue)] text-white shadow-lg shadow-[var(--shadow-blue)]' : 'bg-[var(--blue-dim)] border-[var(--border-blue)] text-[var(--blue)] hover:bg-[var(--blue-dim)]/80'}`}
                >
                  Plan Shared
                </button>
                <button 
                  onClick={() => handleAction('no_receive')} 
                  className={`py-5 px-4 rounded-[22px] border font-syne font-bold text-[13px] transition-all ${action === 'no_receive' ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-amber-500/5 border-amber-500/10 text-amber-500 hover:bg-amber-500/10'}`}
                >
                  No Receive
                </button>
                <button 
                  onClick={() => handleConfirmUpdate('signup_done', {})} 
                  className="py-5 px-4 bg-emerald-500/5 border border-emerald-500/10 rounded-[22px] text-emerald-500 font-syne font-bold text-[13px] hover:bg-emerald-500/10 transition-all"
                >
                  Signup Done
                </button>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => deleteLead(lead.id)}
                  className="w-full py-4 rounded-2xl bg-[var(--error)]/5 border border-[var(--error)]/10 text-[var(--error)] font-syne font-bold text-[13px] hover:bg-[var(--error)]/10 transition-all uppercase tracking-widest"
                >
                  Delete Lead Permanent
                </button>
              </div>

              {action === 'not_interested' && (
                <div className="bg-[var(--card)] border border-[var(--error)]/20 rounded-[32px] p-8 space-y-6 animate-fade-up shadow-[var(--shadow-card)]">
                  <h4 className="font-syne font-black text-[var(--text)] text-[18px]">Refusal Insights</h4>
                  <div className="space-y-3">
                    {['Price Issue', 'No Time', 'Not Convinced', 'Other'].map(reason => (
                      <label key={reason} className="flex items-center gap-4 p-5 bg-[var(--bg3)] border border-[var(--border)] rounded-[20px] cursor-pointer hover:bg-[var(--bg2)] transition-all">
                        <input 
                          type="radio" 
                          name="reason" 
                          value={reason} 
                          className="w-5 h-5 accent-[var(--error)]"
                          onChange={(e) => setFormData({...formData, failReason: e.target.value})} 
                        />
                        <span className="font-dm text-[15px] text-[var(--text-secondary)] font-medium">{reason}</span>
                      </label>
                    ))}
                  </div>
                  
                  <DayPicker 
                    label="Future Followup (Optional)" 
                    value={formData.futureFollowupDate || ''} 
                    onChange={(val) => setFormData({...formData, futureFollowupDate: val})}
                  />

                  <button 
                    onClick={() => handleConfirmUpdate('not_interested', formData)} 
                    className="w-full bg-[var(--error)] py-4 rounded-full font-syne font-bold text-white hover:brightness-110 transition-all shadow-lg"
                  >Confirm Failure</button>
                </div>
              )}

              {action === 'plan_share' && (
                <div className="bg-[var(--card)] border border-[var(--blue)]/20 rounded-[32px] p-8 space-y-6 animate-fade-up shadow-[var(--shadow-card)]">
                  <h4 className="font-syne font-black text-[var(--text)] text-[18px]">Follow-up Schedule</h4>
                  
                  <DayPicker 
                    label="Execution Day" 
                    value={formData.planShareDate || ''} 
                    onChange={(val) => setFormData({...formData, planShareDate: val})}
                  />

                  <div className="space-y-2">
                    <label className="font-dm text-[11px] text-[var(--text-muted)] uppercase font-black tracking-widest pl-2">Time (HH:MM)</label>
                    <input 
                      type="time" 
                      className="w-full bg-[var(--bg3)] p-4 rounded-2xl border border-[var(--border)] text-[var(--text)] font-mono font-bold outline-none focus:border-[var(--blue)]" 
                      required 
                      onChange={(e) => setFormData({...formData, planShareTime: e.target.value})} 
                    />
                  </div>

                  <button 
                    onClick={() => handleConfirmUpdate('plan_share', formData)} 
                    className="w-full bg-[var(--blue)] py-4 rounded-full font-syne font-bold text-white hover:brightness-110 transition-all shadow-lg shadow-[var(--shadow-blue)]"
                  >Confirm Reminder</button>
                </div>
              )}

              {action === 'no_receive' && (
                <div className="bg-[var(--card)] border border-amber-500/20 rounded-[32px] p-8 space-y-6 animate-fade-up shadow-[var(--shadow-card)]">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-syne font-black text-[var(--text)] text-[18px]">Callback Registry</h4>
                    <span className="bg-amber-500/10 text-amber-500 text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-sm border border-amber-500/20">
                      Attempt {(lead.noReceiveCount || 0) + 1} / 3
                    </span>
                  </div>

                  <DayPicker 
                    label="Schedule New Attempt" 
                    value={formData.noReceiveDate || ''} 
                    onChange={(val) => setFormData({...formData, noReceiveDate: val})}
                  />

                  <div className="space-y-2">
                    <label className="font-dm text-[11px] text-[var(--text-muted)] uppercase font-black tracking-widest pl-2">Attempt Time</label>
                    <input 
                      type="time" 
                      className="w-full bg-[var(--bg3)] p-4 rounded-2xl border border-[var(--border)] text-[var(--text)] font-mono font-bold outline-none focus:border-amber-500" 
                      onChange={(e) => setFormData({...formData, noReceiveTime: e.target.value})} 
                    />
                  </div>

                  <button 
                    onClick={() => handleConfirmUpdate('no_receive', formData)} 
                    className="w-full bg-amber-500 py-4 rounded-full font-syne font-bold text-white hover:brightness-110 transition-all shadow-lg shadow-amber-900/10"
                  >Log Retry Attempt</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-32 pt-8 px-6 max-w-7xl mx-auto animate-fade-up">
      <Navbar />
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10">
        <div>
          <h1 className="font-syne font-black text-[32px] text-[var(--text)]">Leads Pipeline</h1>
          <p className="font-dm text-[14px] text-[var(--text-secondary)]">Manage your conversion funnel with TRAKZY AI.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={toggleSelectionMode}
            style={{
              background: selectionMode ? 'rgba(239,68,68,0.15)' : 'var(--blue-dim)',
              color: selectionMode ? '#EF4444' : 'var(--blue)',
              border: selectionMode ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border-blue)',
              borderRadius: 50,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {selectionMode ? 'Cancel' : 'Select'}
          </button>

          <label className="h-14 bg-[var(--bg3)] border border-[var(--border)] rounded-[18px] px-6 flex items-center justify-center gap-3 cursor-pointer hover:bg-[var(--bg2)] transition-all group active:scale-95">
            <FileUp size={20} className="text-[var(--blue)] group-hover:scale-110 transition-transform" />
            <span className="font-syne font-bold text-[14px] text-[var(--text)]">Import File</span>
            <input id="csv-import" type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleImport} />
          </label>
          
          <button 
            onClick={() => setShowDeleteAllConfirm(true)}
            className="h-14 px-6 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-[18px] font-syne font-bold text-[14px] text-[var(--error)] hover:bg-[var(--error)]/20 transition-all font-bold"
          >
            Delete All
          </button>

          <button className="w-14 h-14 bg-[var(--blue)] rounded-[18px] flex items-center justify-center text-white hover:brightness-110 shadow-lg shadow-[var(--shadow-blue)] active:scale-95">
            <Plus size={24} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar scroll-smooth">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-8 py-3.5 rounded-[18px] whitespace-nowrap text-[13px] font-syne font-bold tracking-wider uppercase transition-all duration-300 ${
              activeTab === tab 
                ? 'bg-[var(--blue)] text-white shadow-lg shadow-[var(--shadow-blue)] border-transparent' 
                : 'bg-[var(--bg3)] text-[var(--text-muted)] border border-[var(--border)] hover:bg-[var(--bg2)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab === 'All' ? 'Complete Fleet' : tab.replace('_', ' ')}
            {` (${counts[tab] || 0})`}
          </button>
        ))}
      </div>

      {selectionMode && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--blue-dim)',
          border: '1px solid var(--border-blue)',
          borderRadius: 14,
          marginBottom: 12
        }} className="animate-fade-down">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={selectAll} className="font-syne font-bold text-[13px] text-[var(--blue)]">Select All</button>
            <button onClick={deselectAll} className="font-syne font-bold text-[13px] text-[var(--text-muted)]">Deselect All</button>
            <span className="font-mono text-[14px] text-[var(--blue)] font-bold">{selectedLeadIds.length} selected</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              onClick={deleteSelected}
              disabled={selectedLeadIds.length === 0 || isDeleting}
              style={{
                background: selectedLeadIds.length > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(0,0,0,0.05)',
                color: selectedLeadIds.length > 0 ? '#EF4444' : 'var(--text-muted)',
                border: selectedLeadIds.length > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border)',
                borderRadius: 50,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: selectedLeadIds.length > 0 ? 'pointer' : 'not-allowed'
              }}
            >
              {isDeleting ? 'Deleting...' : `Delete (${selectedLeadIds.length})`}
            </button>
            <button onClick={toggleSelectionMode} className="font-syne font-bold text-[13px] text-[var(--text-secondary)]">Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-10 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--blue)] transition-colors" size={20} />
        <input 
          type="text" 
          placeholder="Lookup by name or phone..." 
          className="w-full h-16 bg-[var(--card)] border border-[var(--border)] rounded-[22px] pl-14 pr-6 text-[var(--text)] font-dm text-[16px] outline-none focus:border-[var(--blue)] focus:bg-[var(--bg2)] transition-all placeholder:text-[var(--text-muted)] shadow-[var(--shadow-card)]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Leads List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeads.map((lead) => (
          <div 
            key={lead.id} 
            className={`group border rounded-[32px] p-8 flex flex-col cursor-pointer transition-all duration-300 hover:shadow-[var(--shadow-card)] shadow-[var(--shadow)]`}
            style={{
              borderColor: selectedLeadIds.includes(lead.id) ? '#2563EB' : 'var(--border)',
              background: selectedLeadIds.includes(lead.id) ? 'rgba(37,99,235,0.06)' : 'var(--card)',
              userSelect: 'none'
            }}
            onClick={() => selectionMode ? toggleSelect(lead.id) : setSelectedLead(lead)}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--blue-dim)] border border-[var(--border-blue)] flex items-center justify-center font-syne font-black text-[var(--blue)] text-[20px] group-hover:scale-105 transition-transform">
                  {lead.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-syne font-bold text-[var(--text)] text-[18px] leading-tight mb-1">{lead.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[var(--text-muted)]">{lead.phone}</span>
                  </div>
                </div>
              </div>
              {selectionMode && (
                <div 
                  style={{
                    width: 22, height: 22,
                    borderRadius: 6,
                    border: selectedLeadIds.includes(lead.id) ? 'none' : '2px solid var(--border)',
                    background: selectedLeadIds.includes(lead.id) ? '#2563EB' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {selectedLeadIds.includes(lead.id) && <span className="text-white text-[14px] font-bold">✓</span>}
                </div>
              )}
            </div>
            
            <div className="mt-auto pt-6 border-t border-[var(--border)] flex items-center justify-between">
              <span className={`font-mono text-[10px] px-3 py-1.5 rounded-full font-black tracking-tighter uppercase ${
                lead.status === 'signup_done' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                lead.status === 'plan_share' ? 'bg-[var(--blue-dim)] text-[var(--blue)] border border-[var(--border-blue)]' :
                lead.status === 'not_interested' ? 'bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20' :
                'bg-[var(--bg3)] text-[var(--text-muted)] border border-[var(--border)]'
              }`}>
                {lead.status.replace('_', ' ')}
              </span>
              <ChevronRight size={20} className="text-[var(--text-muted)] group-hover:text-[var(--blue)] group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
        
        {filteredLeads.length === 0 && !loading && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 bg-[var(--bg3)] rounded-[40px] border border-dashed border-[var(--border)]">
            <Filter size={48} className="text-[var(--text-muted)] mb-4" />
            <p className="font-syne font-bold text-[var(--text-muted)] text-lg uppercase tracking-widest">No Sector Matching</p>
            <p className="font-dm text-[var(--text-secondary)] text-sm mt-2">Adjust your search or filter parameters.</p>
          </div>
        )}
      </div>

      {selectionMode && selectedLeadIds.length > 0 && (
        <div className="fixed bottom-24 lg:bottom-12 left-1/2 -translate-x-1/2 z-[60] bg-[var(--blue)] px-8 py-5 rounded-[24px] shadow-[var(--shadow-blue)] flex items-center gap-8 animate-in slide-in-from-bottom duration-500 border border-white/20">
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-tighter text-blue-100 opacity-70">Management Panel</span>
            <span className="font-syne font-bold text-white text-[16px]">{selectedLeadIds.length} Selected</span>
          </div>
          <div className="h-8 w-px bg-white/20"></div>
          <button 
            onClick={deleteSelected}
            className="px-6 py-2.5 bg-[var(--error)] hover:brightness-110 text-white rounded-xl font-syne font-bold text-[14px] transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-red-900/20"
          >
            Delete Selected
          </button>
        </div>
      )}

      {selectedLead && <LeadProfilePanel lead={selectedLead} />}
      {isDeleting && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-[20px] p-8 flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-[var(--blue)] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-syne font-bold text-[var(--text)]">Processing Deletion...</p>
          </div>
        </div>
      )}

      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="text-6xl mb-6">🗑️</div>
            <h3 className="font-syne font-black text-[24px] text-[var(--text)] mb-3 leading-tight">Delete All Leads?</h3>
            <p className="font-dm text-[15px] text-[var(--text-secondary)] mb-10 leading-relaxed">
              This will permanently delete all <span className="font-bold text-[var(--error)]">{leads.length}</span> leads. This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowDeleteAllConfirm(false)}
                className="h-14 rounded-full border border-[var(--border)] bg-[var(--bg3)] text-[var(--text)] font-syne font-bold hover:bg-[var(--bg2)] transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowDeleteAllConfirm(false);
                  deleteAllLeads();
                }}
                className="h-14 rounded-full bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] font-syne font-black hover:bg-[var(--error)]/20 transition-all"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
