'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  UserCheck,
  Camera,
  LogOut,
  Loader2,
  Settings,
  ChevronDown
} from 'lucide-react';
import { db, Inspection, isSupabaseConfigured } from '@/lib/db';
import { offlineQueue } from '@/lib/offline-queue';
import { auth, UserSession } from '@/lib/auth';

const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta (5% GST)' },
  { code: 'BC', name: 'British Columbia (12% GST+PST)' },
  { code: 'MB', name: 'Manitoba (12% GST+PST)' },
  { code: 'NB', name: 'New Brunswick (15% HST)' },
  { code: 'NL', name: 'Newfoundland & Labrador (15% HST)' },
  { code: 'NS', name: 'Nova Scotia (15% HST)' },
  { code: 'NT', name: 'Northwest Territories (5% GST)' },
  { code: 'NU', name: 'Nunavut (5% GST)' },
  { code: 'ON', name: 'Ontario (13% HST)' },
  { code: 'PE', name: 'Prince Edward Island (15% HST)' },
  { code: 'QC', name: 'Quebec (14.975% GST+QST)' },
  { code: 'SK', name: 'Saskatchewan (11% GST+PST)' },
  { code: 'YT', name: 'Yukon (5% GST)' },
  { code: 'NONE', name: 'No Sales Tax (0%)' }
];

export default function MechanicDashboard() {
  const router = useRouter();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [lastSmsMessage, setLastSmsMessage] = useState<{ id: string; phone: string; text: string } | null>(null);

  // Auth States
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Theme state: reads saved preference immediately
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('shopsnap_mechanic_theme') === 'dark';
    }
    return false;
  });

  // Search & Tab States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [advisorFilter, setAdvisorFilter] = useState<string>('all');
  const [activeMobileLane, setActiveMobileLane] = useState<'awaiting' | 'sent' | 'approved' | 'declined'>('awaiting');

  // Settings states: read saved values immediately so they never flash defaults
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [shopNameSetting, setShopNameSetting] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('shopsnap_shop_name') || 'ShopSnap';
    }
    return 'ShopSnap';
  });
  const [shopProvinceSetting, setShopProvinceSetting] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('shopsnap_shop_province') || 'AB';
    }
    return 'AB';
  });
  const [showTaxWarning, setShowTaxWarning] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('shopsnap_shop_province');
    }
    return false;
  });

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

  // Verify user is authenticated
  useEffect(() => {
    let active = true;
    async function checkAuth() {
      const user = await auth.getCurrentUser();
      if (!user) {
        router.push('/login');
      } else {
        if (active) {
          setCurrentUser(user);
          setAdvisorName(user.name);
          setAuthLoading(false);
        }
      }
    }
    checkAuth();
    return () => {
      active = false;
    };
  }, [router]);

  // Check network and theme settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      
      // Load saved mechanic theme
      const savedTheme = localStorage.getItem('shopsnap_mechanic_theme');
      setIsDark(savedTheme === 'dark');

      // Sync settings from localStorage (in case they were set by another tab)
      const savedShop = localStorage.getItem('shopsnap_shop_name');
      if (savedShop) setShopNameSetting(savedShop);

      const savedProvince = localStorage.getItem('shopsnap_shop_province');
      if (savedProvince) {
        setShopProvinceSetting(savedProvince);
        setShowTaxWarning(false);
      } else {
        setShopProvinceSetting('AB');
        setShowTaxWarning(true);
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
    const confirmDone = confirm('Are you sure the repair is complete? This will archive the inspection.');
    if (!confirmDone) return;

    try {
      await db.update(id, { status: 'ARCHIVED' });
      loadData();
      window.dispatchEvent(new Event('storage_updated'));
    } catch (err: any) {
      console.error('Failed to complete work:', err);
      alert('Failed to archive work: ' + (err.message || err) + '\n\nIf you are using Supabase, please verify you have run the SQL schema migration in supabase/schema.sql to support the ARCHIVED status and VIN columns.');
    }
  };

  // Action: Direct Send Quote from Queue Card
  const handleSendQuoteDirect = async (item: Inspection) => {
    try {
      const now = new Date().toISOString();
      const updated = {
        ...item,
        status: 'SENT' as const,
        updatedAt: now,
      };
      
      await db.update(item.id, { status: 'SENT' });
      await fetch('/api/inspections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: 'SENT' }),
      });

      // Generate SMS Text
      const costNum = item.items?.reduce((sum, i) => sum + (i.cost || 0), 0) || item.estimatedCost;
      const jobsSummary = item.items && item.items.length > 1
        ? `${item.items[0].name} & ${item.items.length - 1} other jobs`
        : (item.repairName || 'General Repair');
        
      const quoteUrl = `${window.location.origin}/quote/${item.id}`;
      const smsText = `${item.shopName || 'ShopSnap'}: ${item.vehicleMake} ${item.vehicleModel} checkup. Required service: ${jobsSummary}. Estimate: $${costNum.toFixed(2)}. Review details & approve here: ${quoteUrl}`;

      localStorage.setItem('shopsnap_sms_log', JSON.stringify({
        id: item.id,
        phone: item.customerPhone,
        text: smsText
      }));

      // Set SMS mock banner state so they can preview it
      setLastSmsMessage({
        id: item.id,
        phone: item.customerPhone,
        text: smsText
      });

      // Launch native SMS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const separator = isIOS ? '&' : '?';
      const smsUrl = `sms:${item.customerPhone}${separator}body=${encodeURIComponent(smsText)}`;
      window.location.href = smsUrl;

      // Reload list
      loadData();
    } catch (err: any) {
      console.error('Error sending quote direct:', err);
      alert('Error sending quote: ' + err.message);
    }
  };

  // Harvest list of advisors dynamically from current inspections
  const availableAdvisors = Array.from(new Set(inspections.map(i => i.advisorName).filter(Boolean))) as string[];

  // Filter inspections based on search query and advisor selection
  const searchedInspections = inspections.filter(item => {
    // 1. Filter by specific advisor if selected
    if (advisorFilter !== 'all') {
      if (item.advisorName !== advisorFilter) return false;
    }

    // 2. Filter by search query
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      item.vehicleMake.toLowerCase().includes(query) ||
      item.vehicleModel.toLowerCase().includes(query) ||
      item.vehicleYear.toString().includes(query) ||
      item.customerPhone.toLowerCase().includes(query) ||
      (item.vin && item.vin.toLowerCase().includes(query)) ||
      item.repairName.toLowerCase().includes(query)
    );
  });

  const awaitingInspection = searchedInspections.filter(i => i.status === 'AWAITING_INSPECTION');
  const sentToCustomer = searchedInspections.filter(i => i.status === 'SENT');
  const approvedReady = searchedInspections.filter(i => i.status === 'APPROVED');
  const declined = searchedInspections.filter(i => i.status === 'DECLINED');
  const archived = searchedInspections.filter(i => i.status === 'ARCHIVED');

  const formatCost = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#070b13] text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <span className="text-sm">Verifying Advisor Session...</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-1 min-h-screen pb-24 transition-colors duration-200 ${
      isDark ? 'bg-[#070b13] text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Top Header */}
      <header className={`sticky top-0 z-40 px-4 pb-3 pt-safe flex items-center justify-between border-b transition-colors duration-200 ${
        isDark ? 'bg-[#0e1726]/90 border-gray-855/80 backdrop-blur' : 'bg-white border-gray-250/80 shadow-xs'
      }`}>
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-650 flex items-center justify-center text-white shadow-md shadow-blue-500/10">
            <Settings className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-white">
              <Check className="w-2.5 h-2.5 stroke-[3.5]" />
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className={`text-xl font-extrabold tracking-tight leading-none ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              ShopSnap
            </h1>
            <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${
              isDark ? 'text-gray-455 font-medium' : 'text-gray-500'
            }`}>
              Advisor: <span className={isDark ? 'text-blue-400 font-bold' : 'text-blue-600 font-extrabold'}>{currentUser?.name}</span>
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`px-3 py-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
              isDark 
                ? 'bg-gray-800/40 border-gray-700 text-gray-305 hover:text-white' 
                : 'bg-gray-100 border-gray-305 text-gray-605 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Shop Settings"
            aria-label="Shop Settings"
          >
            <Settings className="w-3.5 h-3.5 animate-[spin_40s_linear_infinite]" />
            <span>Settings</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={async () => {
              await auth.logout();
              router.push('/login');
            }}
            className={`px-3 py-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
              isDark 
                ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/20' 
                : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
            }`}
            title="Log Out"
            aria-label="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
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

        {/* Tax Warning Banner */}
        {showTaxWarning && (
          <div className="p-4 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs transition-all duration-200">
            <div className="flex items-center gap-2.5 text-xs font-bold leading-normal text-center sm:text-left">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 animate-[bounce_2s_infinite]" />
              <span>
                Tax location is not configured yet. Quotes currently default to **Alberta (5% GST)**. Please select your province in Settings.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setIsSettingsOpen(true);
                }}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-750 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-xs"
              >
                Configure
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('shopsnap_shop_province', 'AB');
                  setShopProvinceSetting('AB');
                  setShowTaxWarning(false);
                }}
                className="px-2.5 py-1.5 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 rounded-lg text-[10px] font-bold transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className={`flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center`}>
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search VIN, vehicle, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full h-11 pl-10 pr-9 text-sm rounded-xl border focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all ${
                isDark 
                  ? 'bg-gray-900/60 border-gray-800 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 shadow-sm'
              }`}
            />
            <span className={`absolute left-3.5 top-3.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </span>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className={`absolute right-3 top-2.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                &times;
              </button>
            )}
          </div>

          {/* Advisor Filter */}
          <select
            value={advisorFilter}
            onChange={(e) => setAdvisorFilter(e.target.value)}
            className={`h-11 px-3 text-xs font-bold rounded-xl border focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all sm:w-44 ${
              isDark 
                ? 'bg-gray-900/60 border-gray-800 text-gray-200' 
                : 'bg-white border-gray-200 text-gray-700 shadow-sm'
            }`}
          >
            <option value="all">All Advisors</option>
            {availableAdvisors.map((adv) => (
              <option key={adv} value={adv}>{adv}</option>
            ))}
          </select>
        </div>

        {/* Tab Navigation */}
        <div className={`flex items-center gap-1 p-1 rounded-xl mt-4 mb-1 select-none ${
          isDark ? 'bg-gray-900/40 border border-gray-800/80' : 'bg-gray-100 border border-gray-200/60'
        }`}>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'active'
                ? isDark
                  ? 'bg-gray-800 text-white shadow-md shadow-black/20 border border-gray-700/50'
                  : 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                : isDark
                  ? 'text-gray-500 hover:text-gray-300'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>Active</span>
            <span className={`text-[10px] min-w-[20px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white'
                : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-500'
            }`}>
              {awaitingInspection.length + sentToCustomer.length + approvedReady.length + declined.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              activeTab === 'archived'
                ? isDark
                  ? 'bg-gray-800 text-white shadow-md shadow-black/20 border border-gray-700/50'
                  : 'bg-white text-gray-900 shadow-sm border border-gray-200/80'
                : isDark
                  ? 'text-gray-500 hover:text-gray-300'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>Archived</span>
            <span className={`text-[10px] min-w-[20px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
              activeTab === 'archived'
                ? 'bg-blue-600 text-white'
                : isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-500'
            }`}>
              {archived.length}
            </span>
          </button>
        </div>

        {activeTab === 'active' ? (
          /* Vehicle Status Sections */
          <section className="space-y-6">
            
            {/* Mobile Lane Sub-Tabs Selector */}
            <div className="flex md:hidden items-center gap-1.5 p-1 bg-gray-50/5 dark:bg-gray-950/20 rounded-xl border border-gray-200/50 dark:border-gray-800/80 mb-4 overflow-x-auto select-none no-scrollbar">
              {[
                { id: 'awaiting', label: 'Awaiting', count: awaitingInspection.length, dotColor: 'bg-amber-500' },
                { id: 'sent', label: 'Sent', count: sentToCustomer.length, dotColor: 'bg-blue-500' },
                { id: 'approved', label: 'Approved', count: approvedReady.length, dotColor: 'bg-emerald-500' },
                { id: 'declined', label: 'Declined', count: declined.length, dotColor: 'bg-red-500' }
              ].map((lane) => (
                <button
                  key={lane.id}
                  type="button"
                  onClick={() => setActiveMobileLane(lane.id as any)}
                  className={`flex-1 min-w-[80px] py-2 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
                    activeMobileLane === lane.id
                      ? 'bg-blue-600/10 text-blue-500 border-blue-500/20 shadow-xs'
                      : 'text-gray-500 hover:text-gray-850 dark:text-gray-400 dark:hover:text-white border-transparent'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${lane.dotColor}`} />
                  <span>{lane.label} ({lane.count})</span>
                </button>
              ))}
            </div>

            {/* Awaiting Inspection */}
            <div className={`space-y-3 ${activeMobileLane === 'awaiting' ? 'block' : 'hidden md:block'}`}>
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
                      onSendQuoteDirect={handleSendQuoteDirect}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Sent to Customer */}
            <div className={`space-y-3 ${activeMobileLane === 'sent' ? 'block' : 'hidden md:block'}`}>
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
                      onSendQuoteDirect={handleSendQuoteDirect}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Approved */}
            <div className={`space-y-3 ${activeMobileLane === 'approved' ? 'block' : 'hidden md:block'}`}>
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
                      onSendQuoteDirect={handleSendQuoteDirect}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Declined */}
            <div className={`space-y-3 ${activeMobileLane === 'declined' ? 'block' : 'hidden md:block'}`}>
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
                      onSendQuoteDirect={handleSendQuoteDirect}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : (
          /* Archived History */
          <section className="space-y-4">
            <div className={`flex items-center gap-2 border-b pb-1.5 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-500 animate-pulse" />
              <h2 className={`font-bold text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Archived Repair Orders ({archived.length})
              </h2>
            </div>

            {archived.length === 0 ? (
              <div className={`text-center py-12 rounded-2xl border border-dashed transition-colors duration-200 ${
                isDark ? 'border-gray-800 bg-gray-950/20' : 'border-gray-200 bg-gray-50/50'
              }`}>
                <p className="text-xs text-gray-450 italic">No archived inspections found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {archived.map(i => (
                  <ArchivedCard 
                    key={i.id} 
                    item={i} 
                    isDark={isDark} 
                    formatCost={formatCost}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Massive Floating + New Inspection Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Link 
          href="/dashboard/new"
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-750 text-white font-bold px-5 py-3.5 rounded-full shadow-xl hover:shadow-blue-500/20 active:scale-95 transition-all text-sm border border-blue-500/20"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
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

      {/* Settings Modal Dialog */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl transition-colors duration-200 ${
            isDark ? 'bg-[#0f172a] border-gray-800 text-white' : 'bg-white border-gray-250 text-gray-900'
          }`}>
            <h3 className="text-base font-bold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500 animate-[spin_8s_linear_infinite]" />
              <span>Shop Settings</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Shop Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Auto Body"
                  value={shopNameSetting}
                  onChange={(e) => setShopNameSetting(e.target.value)}
                  className={`w-full h-11 px-3 rounded-xl border focus:border-blue-500 focus:outline-none text-sm font-semibold ${
                    isDark 
                      ? 'bg-gray-955 border-gray-800 text-white placeholder-gray-600' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  This name will display in SMS text dispatches and on the customer quote approval page.
                </p>
              </div>

              {/* Theme Selector */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Theme Mode
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDark(false);
                      localStorage.setItem('shopsnap_mechanic_theme', 'light');
                    }}
                    className={`flex-1 h-9 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      !isDark 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs' 
                        : (isDark 
                            ? 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white' 
                            : 'bg-gray-50 border-gray-250 text-gray-600')
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDark(true);
                      localStorage.setItem('shopsnap_mechanic_theme', 'dark');
                    }}
                    className={`flex-1 h-9 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                      isDark 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs' 
                        : 'bg-white border-gray-300 text-gray-750 hover:border-gray-400'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark Mode</span>
                  </button>
                </div>
              </div>

              {/* Connection Status Switcher */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Network Status
                </label>
                <button
                  type="button"
                  onClick={toggleNetwork}
                  className={`w-full h-9 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                    isOnline 
                      ? 'bg-emerald-555/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20' 
                      : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'
                  }`}
                >
                  {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                  <span>{isOnline ? 'Online (Connected)' : 'Offline Mode (Simulated)'}</span>
                </button>
              </div>

              {/* Province Selector */}
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Shop Location (Province for Taxes)
                </label>
                <select
                  value={shopProvinceSetting}
                  onChange={(e) => setShopProvinceSetting(e.target.value)}
                  className={`w-full h-11 px-3 rounded-xl border focus:border-blue-500 focus:outline-none text-sm font-semibold ${
                    isDark 
                      ? 'bg-gray-955 border-gray-805 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 shadow-xs'
                  }`}
                >
                  {CANADIAN_PROVINCES.map((prov) => (
                    <option key={prov.code} value={prov.code}>
                      {prov.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className={`flex-1 h-11 rounded-xl text-xs font-bold border transition-colors ${
                    isDark 
                      ? 'bg-gray-800/40 border-gray-700 text-gray-300 hover:text-white' 
                      : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-950 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cleanName = shopNameSetting.trim();
                    const finalName = cleanName || 'ShopSnap';
                    localStorage.setItem('shopsnap_shop_name', finalName);
                    localStorage.setItem('shopsnap_shop_province', shopProvinceSetting);
                    setShopNameSetting(finalName);
                    setShowTaxWarning(false);
                    setIsSettingsOpen(false);
                    // Emit storage update event to alert any listening pages
                    window.dispatchEvent(new Event('storage_updated'));
                  }}
                  className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-750 text-white font-bold text-xs shadow-md transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
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
  onSendQuoteDirect?: (item: Inspection) => void;
}

function InspectionCard({ item, isDark, onCopyLink, copiedId, onVerbalApproval, onComplete, onSendQuoteDirect }: InspectionCardProps) {
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

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className={`relative rounded-xl border p-4 transition-all overflow-hidden flex flex-col justify-between transition-colors duration-200 ${
      isDark ? 'bg-[#0f172a] border-gray-850 hover:border-gray-700' : 'bg-white border-gray-250/80 shadow-xs hover:border-gray-350'
    }`}>
      {/* Left indicator stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
        item.urgency === 'URGENT' ? 'bg-red-500' : item.urgency === 'RECOMMENDED' ? 'bg-amber-500' : 'bg-gray-400'
      }`} />

      <div className="pl-1">
        {/* Clickable Header area on mobile */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-start justify-between cursor-pointer md:cursor-default"
        >
          <div>
            <h3 className={`font-bold text-base ${isDark ? 'text-gray-200' : 'text-gray-850'}`}>
              {item.vehicleYear} {item.vehicleMake} {item.vehicleModel}
            </h3>
            
            {/* Phone, VIN, Advisor: hidden on mobile unless expanded */}
            <div className={`md:block ${isExpanded ? 'block' : 'hidden'}`}>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-450">
                <Phone className="w-3 h-3 text-gray-455 shrink-0" />
                <span>{item.customerPhone}</span>
              </div>
              {item.vin && (
                <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-mono uppercase tracking-wider text-blue-500 font-semibold">
                  <span className="text-[9px] font-bold bg-blue-500/10 px-1 py-0.5 rounded border border-blue-500/20">VIN</span>
                  <span>{item.vin}</span>
                </div>
              )}
              {item.advisorName && (
                <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    Advisor: {item.advisorName}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${urgencyColor}`}>
              {item.urgency}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 md:hidden ${
              isExpanded ? 'rotate-180' : 'rotate-0'
            }`} />
          </div>
        </div>

        {/* Details - Always visible */}
        <div className="mt-3.5 space-y-2">
          {item.items && item.items.length > 0 ? (
            <div className="space-y-1">
              {item.items.map((line, idx) => (
                <div key={idx} className="flex items-start justify-between text-xs gap-2">
                  <span className={`font-bold leading-tight ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    • {line.name}
                  </span>
                  <span className={`font-mono text-[10px] shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatCost(line.cost)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm font-bold line-clamp-1 ${isDark ? 'text-gray-300' : 'text-gray-750'}`}>{item.repairName}</p>
          )}
          <div className={`flex items-center justify-between text-xs pt-2 border-t border-dashed ${
            isDark ? 'border-gray-800' : 'border-gray-150'
          }`}>
            <span className="text-gray-405 font-bold uppercase tracking-wider text-[9px]">Total Estimate:</span>
            <span className={`font-black text-sm ${isDark ? 'text-gray-100' : 'text-blue-600'}`}>{formatCost(item.estimatedCost)}</span>
          </div>
        </div>
      </div>

      {/* Action Footer Button Group - hidden on mobile unless expanded */}
      <div className={`border-t mt-4 pt-3 flex flex-col gap-2 pl-1 md:flex ${
        isExpanded ? 'flex' : 'hidden'
      } ${
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
          {item.status === 'AWAITING_INSPECTION' && (
            <div className="flex items-center gap-2 w-full">
              <Link
                href={`/dashboard/new?id=${item.id}`}
                className={`flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-gray-350 hover:bg-gray-750 hover:text-white' 
                    : 'bg-gray-50 border-gray-250 text-gray-700 hover:bg-gray-105 hover:text-gray-900 shadow-xs'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-blue-500" />
                <span>{item.videoUrl ? 'Edit Jobs' : 'Diagnose & Record'}</span>
              </Link>
              {item.videoUrl && onSendQuoteDirect && (
                <button
                  type="button"
                  onClick={() => onSendQuoteDirect(item)}
                  className="flex-1 h-9 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-705 text-white transition-all flex items-center justify-center gap-1.5 border border-blue-500/20 shadow-xs animate-pulse"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Quote</span>
                </button>
              )}
            </div>
          )}

          {item.status === 'SENT' && (
            <>
              {/* Edit / Add Jobs Button */}
              <Link
                href={`/dashboard/new?id=${item.id}`}
                className={`flex-1 h-9 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 border transition-all ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-gray-350 hover:bg-gray-750 hover:text-white' 
                    : 'bg-gray-50 border-gray-305 text-gray-750 hover:bg-gray-100 hover:text-gray-900 shadow-xs'
                }`}
              >
                <Wrench className="w-3 h-3 text-blue-500" />
                <span>Edit Jobs</span>
              </Link>

              {/* Resend/Copy Quote Link */}
              <button 
                type="button"
                onClick={() => onCopyLink(item.id)}
                className={`flex-1 h-9 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 border transition-all ${
                  copiedId === item.id 
                    ? 'bg-emerald-600 border-emerald-500 text-white' 
                    : (isDark 
                        ? 'bg-gray-800/40 border-gray-700 text-gray-350 hover:bg-gray-800 hover:text-white' 
                        : 'bg-gray-100 border-gray-250 text-gray-605 hover:bg-gray-200 hover:text-gray-900')
                }`}
              >
                {copiedId === item.id ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              {/* Log Verbal Phone Approval */}
              <button
                type="button"
                onClick={() => onVerbalApproval(item.id)}
                className={`flex-1 h-9 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 border transition-all ${
                  isDark 
                    ? 'bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600/20' 
                    : 'bg-blue-50 border-blue-200 text-blue-650 hover:bg-blue-100'
                }`}
              >
                <UserCheck className="w-3 h-3" />
                <span>Phone Auth</span>
              </button>
            </>
          )}

          {item.status === 'APPROVED' && (
            <div className="flex items-center gap-2 w-full">
              <Link
                href={`/dashboard/new?id=${item.id}`}
                className={`flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-gray-350 hover:bg-gray-750 hover:text-white' 
                    : 'bg-gray-50 border-gray-305 text-gray-700 hover:bg-gray-105 hover:text-gray-900 shadow-xs'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-blue-500" />
                <span>Edit Jobs</span>
              </Link>
              <button
                type="button"
                onClick={() => onComplete(item.id)}
                className="flex-1 h-9 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-1 border border-emerald-600/20 shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Complete Repair</span>
              </button>
            </div>
          )}

          {item.status === 'DECLINED' && (
            <div className="flex items-center gap-2 w-full">
              <Link
                href={`/dashboard/new?id=${item.id}`}
                className={`flex-1 h-9 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-gray-350 hover:bg-gray-750 hover:text-white' 
                    : 'bg-gray-50 border-gray-305 text-gray-700 hover:bg-gray-105 hover:text-gray-900 shadow-xs'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-blue-500" />
                <span>Edit Jobs</span>
              </Link>
              <button
                type="button"
                onClick={() => onComplete(item.id)} // Clean it up as well
                className={`flex-1 h-9 rounded-lg text-xs font-bold border transition-colors ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750 hover:text-white' 
                    : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <span>Clear Card</span>
              </button>
            </div>
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

// ==========================================
// ARCHIVED CARD COMPONENT
// ==========================================

interface ArchivedCardProps {
  item: Inspection;
  isDark: boolean;
  formatCost: (val: number) => string;
}

function ArchivedCard({ item, isDark, formatCost }: ArchivedCardProps) {
  const formattedDate = new Date(item.updatedAt || item.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={`relative rounded-xl border p-4 transition-colors duration-200 overflow-hidden flex flex-col justify-between ${
      isDark ? 'bg-[#0f172a]/65 border-gray-850' : 'bg-white border-gray-250/80 shadow-xs'
    }`}>
      {/* Indicator Stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-500" />
      
      <div className="pl-1">
        <div className="flex items-start justify-between">
          <div>
            <h3 className={`font-bold text-base ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              {item.vehicleYear} {item.vehicleMake} {item.vehicleModel}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-450">
              <Phone className="w-3 h-3 text-gray-450 shrink-0" />
              <span>{item.customerPhone}</span>
            </div>
            {item.vin && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-mono uppercase tracking-wider text-blue-500 font-semibold">
                <span className="text-[9px] font-bold bg-blue-500/10 px-1 py-0.5 rounded border border-blue-500/20">VIN</span>
                <span>{item.vin}</span>
              </div>
            )}
            {item.advisorName && (
              <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                }`}>
                  Advisor: {item.advisorName}
                </span>
              </div>
            )}
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
            isDark ? 'bg-slate-500/10 text-slate-400 border-slate-900/30' : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            Archived
          </span>
        </div>

        {/* Details */}
        <div className="mt-3.5 space-y-2">
          {item.items && item.items.length > 0 ? (
            <div className="space-y-1">
              {item.items.map((line, idx) => (
                <div key={idx} className="flex items-start justify-between text-xs gap-2">
                  <span className={`font-bold leading-tight ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    • {line.name}
                  </span>
                  <span className={`font-mono text-[10px] shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatCost(line.cost)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm font-bold line-clamp-1 ${isDark ? 'text-gray-300' : 'text-gray-750'}`}>{item.repairName}</p>
          )}
          <div className={`flex items-center justify-between text-xs pt-2 border-t border-dashed ${
            isDark ? 'border-gray-800' : 'border-gray-150'
          }`}>
            <span className="text-gray-405 font-bold uppercase tracking-wider text-[9px]">Total Estimate:</span>
            <span className={`font-black text-sm ${isDark ? 'text-gray-100' : 'text-blue-600'}`}>{formatCost(item.estimatedCost)}</span>
          </div>
        </div>
      </div>

      <div className={`border-t mt-4 pt-3 flex flex-col gap-1.5 pl-1 ${
        isDark ? 'border-gray-800/80' : 'border-gray-150'
      }`}>
        <div className="flex items-center justify-between text-[9px] text-gray-500">
          <span className="font-semibold uppercase tracking-wider">Date & Time</span>
          <span className="font-mono">{formattedDate}</span>
        </div>

        {item.signature ? (
          <div className="flex items-center gap-1 text-[9px] text-emerald-500 font-bold uppercase tracking-wider">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Approved by {item.signature}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[9px] text-red-500 font-bold uppercase tracking-wider">
            <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>Declined / Cleared</span>
          </div>
        )}

        {/* View Customer Receipt Link */}
        <Link
          href={`/quote/${item.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full h-8 mt-2 rounded-lg text-[10px] font-bold border transition-colors flex items-center justify-center gap-1 ${
            isDark 
              ? 'bg-gray-800/40 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white' 
              : 'bg-gray-50 border-gray-250 text-gray-750 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <ExternalLink className="w-3 h-3" />
          <span>View Customer Receipt</span>
        </Link>
      </div>
    </div>
  );
}
