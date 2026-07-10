'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Wrench, 
  Send, 
  CheckCircle, 
  XCircle, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Phone, 
  DollarSign, 
  Clock, 
  ExternalLink,
  RefreshCw,
  Sun,
  Moon,
  Copy,
  Check,
  ClipboardCheck,
  UserCheck
} from 'lucide-react';
import { db, Inspection, isSupabaseConfigured } from '@/lib/db';
import { offlineQueue } from '@/lib/offline-queue';

export default function MechanicDashboard() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [lastSmsMessage, setLastSmsMessage] = useState<{ id: string; phone: string; text: string } | null>(null);

  // Theme state: defaults to dark (true) for greasy hands / bays
  const [isDark, setIsDark] = useState<boolean>(true);

  // Copy state tracker
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Phone Approval Dialog States
  const [verbalApprovalId, setVerbalApprovalId] = useState<string | null>(null);
  const [advisorName, setAdvisorName] = useState<string>('');
  const [loggingApproval, setLoggingApproval] = useState<boolean>(false);

  // Load inspections and offline queue count
  const loadData = async () => {
    try {
      const data = await db.list();
      setInspections(data);
      const queued = await offlineQueue.list();
      setOfflineCount(queued.length);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  // Check network and theme settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      
      // Load saved mechanic theme
      const savedTheme = localStorage.getItem('shopsnap_mechanic_theme');
      if (savedTheme === 'light') {
        setIsDark(false);
      }

      const handleOnline = () => {
        setIsOnline(true);
        triggerSync();
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Listen for custom events
      const handleStorageUpdate = () => loadData();
      const handleQueueUpdate = async () => {
        const queued = await offlineQueue.list();
        setOfflineCount(queued.length);
      };

      window.addEventListener('storage_updated', handleStorageUpdate);
      window.addEventListener('offline_queue_changed', handleQueueUpdate);
      window.addEventListener('storage', handleStorageUpdate);

      loadData();

      // Setup real-time listener if Supabase is active
      let channel: any;
      if (isSupabaseConfigured) {
        const { supabase } = require('@/lib/db');
        channel = supabase
          .channel('schema-db-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'inspections' },
            () => {
              loadData();
            }
          )
          .subscribe();
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('storage_updated', handleStorageUpdate);
        window.removeEventListener('offline_queue_changed', handleQueueUpdate);
        window.removeEventListener('storage', handleStorageUpdate);
        if (channel) {
          channel.unsubscribe();
        }
      };
    }
  }, []);

  // Monitor simulated SMS
  useEffect(() => {
    const checkSms = () => {
      const log = localStorage.getItem('shopsnap_sms_log');
      if (log) {
        try {
          const parsed = JSON.parse(log);
          setLastSmsMessage(parsed);
          const timer = setTimeout(() => {
            setLastSmsMessage(null);
            localStorage.removeItem('shopsnap_sms_log');
          }, 8000);
          return () => clearTimeout(timer);
        } catch {}
      }
    };
    checkSms();
    const interval = setInterval(checkSms, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    localStorage.setItem('shopsnap_mechanic_theme', nextTheme ? 'dark' : 'light');
  };

  const toggleNetwork = () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    if (nextState) {
      triggerSync();
    }
  };

  const triggerSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await offlineQueue.process((msg) => setSyncMessage(msg));
      if (res.successCount > 0) {
        setSyncMessage(`Successfully synced ${res.successCount} queued inspections!`);
        setTimeout(() => setSyncMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error during queue sync:', err);
    } finally {
      setSyncing(false);
      loadData();
    }
  };

  // Action: Copy Quote Link to Clipboard
  const handleCopyLink = (id: string) => {
    if (typeof window !== 'undefined') {
      const link = `${window.location.origin}/quote/${id}`;
      navigator.clipboard.writeText(link).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 3000);
      });
    }
  };

  // Action: Log Verbal Phone Approval
  const handleVerbalApprovalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verbalApprovalId || !advisorName.trim()) return;

    setLoggingApproval(true);
    try {
      const formattedSignature = `Verbal Phone Auth (Logged by: ${advisorName.trim()})`;
      
      // Update local storage / client DB
      await db.update(verbalApprovalId, {
        status: 'APPROVED',
        signature: formattedSignature,
        approvedAt: new Date().toISOString(),
      });

      // Update API
      await fetch('/api/inspections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: verbalApprovalId,
          status: 'APPROVED',
          signature: formattedSignature,
          approvedAt: new Date().toISOString(),
        }),
      });

      setVerbalApprovalId(null);
      setAdvisorName('');
      loadData();
      window.dispatchEvent(new Event('storage_updated'));
    } catch (err) {
      console.error('Error logging verbal approval:', err);
      alert('Failed to log verbal approval');
    } finally {
      setLoggingApproval(false);
    }
  };

  // Action: Complete & Archive Repair Order
  const handleCompleteWork = async (id: string) => {
    const confirmDone = confirm('Are you sure the repair is complete? This will clear it from the active dashboard.');
    if (!confirmDone) return;

    try {
      // In a real database, we would set status = 'ARCHIVED' or delete.
      // For this active board, we can set status to 'DECLINED' or a hidden completed state.
      // Let's set status = 'DECLINED' so it clears from "Approved", or we can simply remove it from localStorage.
      // To keep it simple, we will set status to a custom value 'ARCHIVED' or simply delete it.
      // Let's implement an in-memory/localStorage delete for completion to clear the board!
      if (isSupabaseConfigured) {
        // For Supabase, we update it or delete. Let's just delete the record to keep the board clean.
        const { supabase } = require('@/lib/db');
        await supabase.from('inspections').delete().eq('id', id);
      } else {
        const data = localStorage.getItem('shopsnap_mock_inspections');
        if (data) {
          const list: Inspection[] = JSON.parse(data);
          const filtered = list.filter(item => item.id !== id);
          localStorage.setItem('shopsnap_mock_inspections', JSON.stringify(filtered));
        }
      }
      
      loadData();
      window.dispatchEvent(new Event('storage_updated'));
    } catch (err) {
      console.error('Failed to complete work:', err);
    }
  };

  const awaitingInspection = inspections.filter(i => i.status === 'AWAITING_INSPECTION');
  const sentToCustomer = inspections.filter(i => i.status === 'SENT');
  const approvedReady = inspections.filter(i => i.status === 'APPROVED');
  const declined = inspections.filter(i => i.status === 'DECLINED');

  const formatCost = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className={`flex flex-col flex-1 min-h-screen pb-24 transition-colors duration-200 ${
      isDark ? 'bg-[#070b13] text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Top Header */}
      <header className={`sticky top-0 z-40 px-4 py-3 flex items-center justify-between border-b transition-colors duration-200 ${
        isDark ? 'bg-[#0e1726]/90 border-gray-855/80 backdrop-blur' : 'bg-white border-gray-250/80 shadow-xs'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 text-white p-2 rounded-xl">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-850'}`}>
              ShopSnap
            </h1>
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Mechanic Portal
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2.5">
          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-colors ${
              isDark 
                ? 'bg-gray-800/40 border-gray-700 text-gray-300 hover:text-white' 
                : 'bg-gray-100 border-gray-305 text-gray-605 hover:text-gray-900 hover:bg-gray-200'
            }`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-yellow-450" /> : <Moon className="w-4 h-4" />}
          </button>

          {offlineCount > 0 && (
            <button 
              onClick={triggerSync}
              disabled={syncing || !isOnline}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all ${(!isOnline || syncing) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-amber-500/30'}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{offlineCount} Queued</span>
            </button>
          )}

          <button 
            onClick={toggleNetwork}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              isOnline 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                : 'bg-red-505/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-455" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-455" />
                <span className="hidden sm:inline">Offline Mode</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Sync Message Banner */}
      {syncMessage && (
        <div className="bg-blue-600 text-white text-xs font-medium px-4 py-2 text-center animate-pulse flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-6xl mx-auto w-full space-y-6">
        
        {/* SMS Notification Banner */}
        {lastSmsMessage && (
          <div className={`border-l-4 border-blue-500 p-4 rounded-xl shadow-xl animate-bounce flex flex-col gap-1.5 ${
            isDark ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800 border border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-550 flex items-center gap-1">
                <Send className="w-3 h-3" /> SMS DISPATCH MOCK
              </span>
              <button onClick={() => setLastSmsMessage(null)} className="text-gray-400 hover:text-gray-600 text-xs font-bold px-1.5">✕</button>
            </div>
            <p className="text-xs font-bold">To: {lastSmsMessage.phone}</p>
            <p className={`text-sm italic p-2.5 rounded font-mono border break-all ${
              isDark ? 'bg-gray-955/60 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}>
              {lastSmsMessage.text}
            </p>
            <Link 
              href={`/quote/${lastSmsMessage.id}`}
              className="self-end text-xs font-bold text-blue-500 hover:underline flex items-center gap-1 mt-1 bg-blue-500/10 px-2.5 py-1.5 rounded-lg border border-blue-500/20"
            >
              Open Customer View <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Dashboard Metrics */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pending Upload', value: offlineCount, valueColor: 'text-amber-500' },
            { label: 'Awaiting Action', value: awaitingInspection.length + sentToCustomer.length, valueColor: isDark ? 'text-gray-300' : 'text-gray-700' },
            { label: 'Approved Today', value: approvedReady.length, valueColor: 'text-emerald-550' },
            { label: 'Total Value', value: formatCost(inspections.reduce((acc, curr) => acc + (curr.status === 'APPROVED' ? curr.estimatedCost : 0), 0)), valueColor: 'text-blue-500' }
          ].map((card, idx) => (
            <div key={idx} className={`border p-3 rounded-xl flex flex-col transition-colors duration-200 ${
              isDark ? 'bg-[#0f172a] border-gray-805/80' : 'bg-white border-gray-200 shadow-2xs'
            }`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {card.label}
              </span>
              <span className={`text-2xl font-black mt-1 ${card.valueColor}`}>
                {card.value}
              </span>
            </div>
          ))}
        </section>

        {/* Vehicle Status Sections */}
        <section className="space-y-6">
          
          {/* Awaiting Inspection */}
          <div className="space-y-3">
            <div className={`flex items-center gap-2 border-b pb-1.5 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h2 className={`font-bold text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Awaiting Video / Inspection ({awaitingInspection.length})
              </h2>
            </div>
            {awaitingInspection.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">No vehicles in queue.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {awaitingInspection.map(i => (
                  <InspectionCard 
                    key={i.id} 
                    item={i} 
                    isDark={isDark} 
                    onCopyLink={handleCopyLink}
                    copiedId={copiedId}
                    onVerbalApproval={setVerbalApprovalId}
                    onComplete={handleCompleteWork}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sent to Customer */}
          <div className="space-y-3">
            <div className={`flex items-center gap-2 border-b pb-1.5 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h2 className={`font-bold text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Sent to Customer - Awaiting Approval ({sentToCustomer.length})
              </h2>
            </div>
            {sentToCustomer.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">No inspections currently sent.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {sentToCustomer.map(i => (
                  <InspectionCard 
                    key={i.id} 
                    item={i} 
                    isDark={isDark} 
                    onCopyLink={handleCopyLink}
                    copiedId={copiedId}
                    onVerbalApproval={setVerbalApprovalId}
                    onComplete={handleCompleteWork}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Approved */}
          <div className="space-y-3">
            <div className={`flex items-center gap-2 border-b pb-1.5 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className={`font-bold text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Approved - Ready to Work ({approvedReady.length})
              </h2>
            </div>
            {approvedReady.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">No approved repairs ready to start.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {approvedReady.map(i => (
                  <InspectionCard 
                    key={i.id} 
                    item={i} 
                    isDark={isDark} 
                    onCopyLink={handleCopyLink}
                    copiedId={copiedId}
                    onVerbalApproval={setVerbalApprovalId}
                    onComplete={handleCompleteWork}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Declined */}
          <div className="space-y-3">
            <div className={`flex items-center gap-2 border-b pb-1.5 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <h2 className={`font-bold text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Declined ({declined.length})
              </h2>
            </div>
            {declined.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-2">No declined quotes.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {declined.map(i => (
                  <InspectionCard 
                    key={i.id} 
                    item={i} 
                    isDark={isDark} 
                    onCopyLink={handleCopyLink}
                    copiedId={copiedId}
                    onVerbalApproval={setVerbalApprovalId}
                    onComplete={handleCompleteWork}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Massive Floating + New Inspection Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link 
          href="/dashboard/new"
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-6 py-4 rounded-full shadow-2xl active:scale-95 transition-all text-base border border-blue-500/20"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span>New Inspection</span>
        </Link>
      </div>

      {/* Dialog for Phone/Verbal Approval */}
      {verbalApprovalId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form 
            onSubmit={handleVerbalApprovalSubmit}
            className={`rounded-3xl w-full max-w-sm border p-6 space-y-4 shadow-2xl transition-colors ${
              isDark ? 'bg-[#0f172a] border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <div className="text-center space-y-1">
              <div className="mx-auto w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center border border-blue-500/20 mb-1">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold">Log Verbal Phone Approval</h3>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Note customer's telephone authorization. This action creates a signed record.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-505'}`}>
                  Advisor Name (Who took the call)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Service Writer Rob"
                  value={advisorName}
                  onChange={(e) => setAdvisorName(e.target.value)}
                  className={`w-full h-12 px-3 rounded-xl border focus:outline-none text-sm font-medium transition-colors ${
                    isDark 
                      ? 'bg-gray-955 border-gray-800 text-white focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-800 focus:border-blue-500'
                  }`}
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setVerbalApprovalId(null);
                    setAdvisorName('');
                  }}
                  className={`flex-1 h-11 font-bold text-xs rounded-xl border transition-colors ${
                    isDark 
                      ? 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700' 
                      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loggingApproval}
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl border border-blue-500/20 hover:shadow-md transition-all flex items-center justify-center"
                >
                  {loggingApproval ? 'Saving...' : 'Authorize Quote'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// Inner Component: InspectionCard
interface InspectionCardProps {
  item: Inspection;
  isDark: boolean;
  onCopyLink: (id: string) => void;
  copiedId: string | null;
  onVerbalApproval: (id: string) => void;
  onComplete: (id: string) => void;
}

function InspectionCard({ item, isDark, onCopyLink, copiedId, onVerbalApproval, onComplete }: InspectionCardProps) {
  const urgencyColor = {
    URGENT: isDark ? 'bg-red-505/10 text-red-400 border-red-900/30' : 'bg-red-50 text-red-650 border-red-100',
    RECOMMENDED: isDark ? 'bg-amber-505/10 text-amber-400 border-amber-900/30' : 'bg-amber-50 text-amber-650 border-amber-100',
    MONITOR: isDark ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-600 border-gray-200'
  }[item.urgency];

  const formatCost = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AWAITING_INSPECTION':
        return <Clock className="w-4 h-4 text-amber-550" />;
      case 'SENT':
        return <Send className="w-4 h-4 text-blue-500" />;
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-emerald-505" />;
      case 'DECLINED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`relative rounded-xl border p-4 transition-all overflow-hidden flex flex-col justify-between transition-colors duration-200 ${
      isDark ? 'bg-[#0f172a] border-gray-850 hover:border-gray-700' : 'bg-white border-gray-250/80 shadow-xs hover:border-gray-350'
    }`}>
      {/* Left indicator stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
        item.urgency === 'URGENT' ? 'bg-red-500' : item.urgency === 'RECOMMENDED' ? 'bg-amber-500' : 'bg-gray-400'
      }`} />

      <div className="pl-1">
        <div className="flex items-start justify-between">
          <div>
            <h3 className={`font-bold text-base ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              {item.vehicleYear} {item.vehicleMake} {item.vehicleModel}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-405">
              <Phone className="w-3 h-3 text-gray-450" />
              <span>{item.customerPhone}</span>
            </div>
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${urgencyColor}`}>
            {item.urgency}
          </span>
        </div>

        {/* Details */}
        <div className="mt-3.5 space-y-1">
          <p className={`text-sm font-bold line-clamp-1 ${isDark ? 'text-gray-300' : 'text-gray-750'}`}>{item.repairName}</p>
          <div className="flex items-center justify-between text-xs pt-1.5">
            <span className="text-gray-405">Estimate:</span>
            <span className={`font-extrabold text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{formatCost(item.estimatedCost)}</span>
          </div>
        </div>
      </div>

      {/* Action Footer Button Group */}
      <div className={`border-t mt-4 pt-3 flex flex-col gap-2 pl-1 ${
        isDark ? 'border-gray-800/80' : 'border-gray-150'
      }`}>
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500">
          <span className="flex items-center gap-1.5">
            {getStatusIcon(item.status)}
            <span>{item.status.replace('_', ' ')}</span>
          </span>

          {item.status === 'APPROVED' && (
            <div className="text-right text-[9px] font-mono text-gray-405 normal-case">
              <span>{item.signature}</span>
            </div>
          )}
        </div>

        {/* Dashboard Actions Context */}
        <div className="flex items-center gap-2 mt-1">
          {item.status === 'SENT' && (
            <>
              {/* Resend/Copy Quote Link */}
              <button 
                type="button"
                onClick={() => onCopyLink(item.id)}
                className={`flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  copiedId === item.id 
                    ? 'bg-emerald-600 border-emerald-500 text-white' 
                    : (isDark 
                        ? 'bg-gray-800/40 border-gray-700 text-gray-350 hover:bg-gray-800 hover:text-white' 
                        : 'bg-gray-100 border-gray-250 text-gray-600 hover:bg-gray-200 hover:text-gray-900')
                }`}
              >
                {copiedId === item.id ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              {/* Log Verbal Phone Approval */}
              <button
                type="button"
                onClick={() => onVerbalApproval(item.id)}
                className={`flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  isDark 
                    ? 'bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600/20' 
                    : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Phone Auth</span>
              </button>
            </>
          )}

          {item.status === 'APPROVED' && (
            <button
              type="button"
              onClick={() => onComplete(item.id)}
              className="w-full h-9 rounded-lg text-xs font-bold bg-emerald-650 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-1 border border-emerald-600/20"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Complete & Archive Repair</span>
            </button>
          )}

          {item.status === 'DECLINED' && (
            <button
              type="button"
              onClick={() => onComplete(item.id)} // Clean it up as well
              className={`w-full h-9 rounded-lg text-xs font-bold border transition-colors ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750 hover:text-white' 
                  : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <span>Archive / Clear Card</span>
            </button>
          )}

          {item.status === 'AWAITING_INSPECTION' && (
            <Link
              href="/dashboard/new"
              className="w-full h-9 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-all flex items-center justify-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Record Inspection Video</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
