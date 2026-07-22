'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Camera, 
  Trash2, 
  Check, 
  Loader2, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  Sun,
  Moon,
  QrCode,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Send
} from 'lucide-react';
import { db, isSupabaseConfigured, generateUUID } from '@/lib/db';
import { offlineQueue } from '@/lib/offline-queue';
import { auth } from '@/lib/auth';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

const CAR_MAKES_AND_MODELS: Record<string, string[]> = {
  Ford: ['F-150', 'Escape', 'Explorer', 'Focus', 'Mustang', 'Fusion', 'Edge', 'Super Duty'],
  Toyota: ['RAV4', 'Camry', 'Corolla', 'Tacoma', 'Tundra', 'Highlander', 'Sienna', 'Prius'],
  Chevrolet: ['Silverado', 'Equinox', 'Malibu', 'Cruze', 'Tahoe', 'Trax', 'Suburban', 'Camaro'],
  Honda: ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'Fit', 'HR-V', 'Ridgeline'],
  Jeep: ['Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass', 'Renegade', 'Gladiator'],
  Nissan: ['Rogue', 'Altima', 'Sentra', 'Pathfinder', 'Frontier', 'Murano', 'Versa'],
  Ram: ['1500', '2500', '3500'],
  Subaru: ['Outback', 'Forester', 'Impreza', 'Crosstrek', 'Legacy', 'Ascent'],
  Hyundai: ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Kona', 'Palisade'],
  Kia: ['Forte', 'Optima', 'Sorento', 'Sportage', 'Soul', 'Telluride'],
  GMC: ['Sierra', 'Terrain', 'Acadia', 'Yukon'],
  Dodge: ['Charger', 'Challenger', 'Durango', 'Grand Caravan'],
  Lexus: ['RX', 'ES', 'NX', 'IS', 'GX'],
  BMW: ['3 Series', '5 Series', 'X3', 'X5', 'X7'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE'],
  Volkswagen: ['Jetta', 'Passat', 'Tiguan', 'Golf', 'Atlas']
};

const formatPhoneNumber = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

export default function NewInspection() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#070b13] text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <span className="text-sm">Loading Form...</span>
      </div>
    }>
      <NewInspectionForm />
    </Suspense>
  );
}

function NewInspectionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  
  // Form states
  const [vehicleYear, setVehicleYear] = useState<string>(new Date().getFullYear().toString());
  const [vehicleMake, setVehicleMake] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [vehicleVin, setVehicleVin] = useState<string>('');
  const [isOtherMake, setIsOtherMake] = useState<boolean>(false);
  const [isOtherModel, setIsOtherModel] = useState<boolean>(false);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [repairName, setRepairName] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [urgency, setUrgency] = useState<'URGENT' | 'RECOMMENDED' | 'MONITOR'>('RECOMMENDED');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(null);

  // Advisor Select States
  const [advisorsList, setAdvisorsList] = useState<string[]>([]);
  const [selectedAdvisor, setSelectedAdvisor] = useState<string>('');
  const [isAddingAdvisor, setIsAddingAdvisor] = useState<boolean>(false);
  const [shopName, setShopName] = useState<string>('');
  const [province, setProvince] = useState<string>('');
  const [successSmsUrl, setSuccessSmsUrl] = useState<string | null>(null);

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
          setAuthLoading(false);
        }
      }
    }
    checkAuth();
    return () => {
      active = false;
    };
  }, [router]);

  // Load list of advisors from localStorage and past database records
  useEffect(() => {
    const saved = localStorage.getItem('shopsnap_shop_advisors');
    let list: string[] = saved ? JSON.parse(saved) : [];

    db.list().then((inspections) => {
      const dbAdvisors = inspections.map((i) => i.advisorName).filter(Boolean) as string[];
      const combined = Array.from(new Set([...list, ...dbAdvisors]));
      if (currentUser?.name && !combined.includes(currentUser.name)) {
        combined.push(currentUser.name);
      }
      setAdvisorsList(combined);
      localStorage.setItem('shopsnap_shop_advisors', JSON.stringify(combined));
    });

    if (currentUser?.name && !editId) {
      setSelectedAdvisor(currentUser.name);
    }

    if (!editId && typeof window !== 'undefined') {
      setShopName(localStorage.getItem('shopsnap_shop_name') || 'ShopSnap');
      setProvince(localStorage.getItem('shopsnap_shop_province') || 'ON');
    }
  }, [currentUser, editId]);

  // Pre-fill if loading from queue
  useEffect(() => {
    if (editId) {
      db.get(editId).then((data) => {
        if (data) {
          setVehicleYear(data.vehicleYear.toString());
          setVehicleMake(data.vehicleMake);
          setVehicleModel(data.vehicleModel);
          setVehicleVin(data.vin || '');
          setCustomerPhone(data.customerPhone);
          setRepairName(data.repairName);
          setEstimatedCost(data.estimatedCost.toString());
          setUrgency(data.urgency);
           if (data.advisorName) {
            setSelectedAdvisor(data.advisorName);
          }
          if (data.shopName) {
            setShopName(data.shopName);
          } else if (typeof window !== 'undefined') {
            setShopName(localStorage.getItem('shopsnap_shop_name') || 'ShopSnap');
          }
          if (data.province) {
            setProvince(data.province);
          } else if (typeof window !== 'undefined') {
            setProvince(localStorage.getItem('shopsnap_shop_province') || 'ON');
          }
          
          if (CAR_MAKES_AND_MODELS[data.vehicleMake]) {
            setIsOtherMake(false);
          } else {
            setIsOtherMake(true);
          }
          
          if (CAR_MAKES_AND_MODELS[data.vehicleMake]?.includes(data.vehicleModel)) {
            setIsOtherModel(false);
          } else {
            setIsOtherModel(true);
          }
        }
      });
    }
  }, [editId]);
  
  // Media states
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Theme state: defaults to light (false)
  const [isDark, setIsDark] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Monitor network and load theme settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const goOnline = () => setIsOnline(true);
      const goOffline = () => setIsOnline(false);
      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);

      // Load saved mechanic theme
      const savedTheme = localStorage.getItem('shopsnap_mechanic_theme');
      if (savedTheme === 'dark') {
        setIsDark(true);
      } else {
        setIsDark(false);
      }

      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);
    localStorage.setItem('shopsnap_mechanic_theme', nextTheme ? 'dark' : 'light');
  };

  // Handle native camera video capture
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setVideoBlob(file);
        const url = URL.createObjectURL(file);
        setVideoPreviewUrl(url);
      } else {
        alert('Please select or record a video file.');
      }
    }
  };

  const triggerCamera = () => {
    fileInputRef.current?.click();
  };

  const removeVideo = () => {
    setVideoBlob(null);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleMake || !vehicleModel || !customerPhone || !repairName || !estimatedCost) {
      alert('Please fill out all required fields.');
      return;
    }
    setIsSubmitting(true);
    const costNum = parseFloat(estimatedCost);
    const inspectionId = editId || generateUUID();
    const isEditing = !!editId;

    const finalShopName = shopName || 'ShopSnap';

    const metadata = {
      vehicleYear: parseInt(vehicleYear) || new Date().getFullYear(),
      vehicleMake,
      vehicleModel,
      vin: vehicleVin,
      customerPhone,
      repairName,
      estimatedCost: costNum,
      urgency,
      advisorName: selectedAdvisor || currentUser?.name || 'Advisor',
      advisorEmail: currentUser?.email || '',
      shopName: finalShopName,
      province: province || 'ON',
    };

    try {
      if (!videoBlob) {
        // Queue without a video -> AWAITING_INSPECTION
        if (isEditing) {
          await db.update(inspectionId, {
            ...metadata,
            status: 'AWAITING_INSPECTION',
          });
          await fetch('/api/inspections', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: inspectionId,
              status: 'AWAITING_INSPECTION',
              ...metadata,
            }),
          });
        } else {
          await db.create({
            id: inspectionId,
            ...metadata,
            status: 'AWAITING_INSPECTION',
            videoUrl: '',
          });
          await fetch('/api/inspections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: inspectionId,
              ...metadata,
              status: 'AWAITING_INSPECTION',
              videoUrl: '',
            }),
          });
        }
        window.dispatchEvent(new Event('storage_updated'));
        router.push('/dashboard');
        return;
      }

      // If video IS present, upload and send
      if (!isOnline) {
        await offlineQueue.add({
          id: inspectionId,
          inspectionId,
          fileBlob: videoBlob,
          fileName: `video-${inspectionId}.mp4`,
          metadata,
        });

        if (isEditing) {
          await db.update(inspectionId, {
            ...metadata,
            status: 'AWAITING_INSPECTION',
          });
        } else {
          await db.create({
            id: inspectionId,
            ...metadata,
            status: 'AWAITING_INSPECTION',
            videoUrl: '',
          });
        }

        window.dispatchEvent(new Event('storage_updated'));
        alert('You are offline! Inspection queued locally. It will upload automatically once connection is restored.');
        router.push('/dashboard');
      } else {
        const formData = new FormData();
        formData.append('file', videoBlob, `video-${inspectionId}.mp4`);
        formData.append('inspectionId', inspectionId);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) throw new Error('Video upload failed');
        const uploadData = await uploadRes.json();
        const videoUrl = uploadData.url;

        if (isEditing) {
          await db.update(inspectionId, {
            ...metadata,
            status: 'SENT',
            videoUrl,
          });
          await fetch('/api/inspections', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: inspectionId,
              status: 'SENT',
              videoUrl,
              ...metadata,
            }),
          });
        } else {
          await db.create({
            id: inspectionId,
            ...metadata,
            status: 'SENT',
            videoUrl,
          });
          await fetch('/api/inspections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: inspectionId,
              ...metadata,
              status: 'SENT',
              videoUrl,
            }),
          });
        }

        const quoteUrl = `${window.location.origin}/quote/${inspectionId}`;
        const smsText = `${metadata.shopName || 'ShopSnap'}: ${metadata.vehicleMake} ${metadata.vehicleModel} checkup. Required service: ${metadata.repairName}. Estimate: $${costNum.toFixed(2)}. Review details & approve here: ${quoteUrl}`;
        
        // Save locally for dashboard simulated toast overlay fallback
        localStorage.setItem('shopsnap_sms_log', JSON.stringify({
          id: inspectionId,
          phone: customerPhone,
          text: smsText
        }));

        await fetch('/api/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: inspectionId,
            ...metadata,
            status: 'SENT',
            videoUrl,
          }),
        });

        // Format native SMS URI scheme (handles iOS Safari vs Android formatting differences)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const separator = isIOS ? '&' : '?';
        const smsUrl = `sms:${customerPhone}${separator}body=${encodeURIComponent(smsText)}`;

        setIsSubmitting(false);
        setSuccessSmsUrl(smsUrl);
      }
    } catch (error: any) {
      console.error('Error submitting inspection:', error);
      alert('Error creating inspection: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
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
    <div className={`flex flex-col flex-1 min-h-screen pb-16 transition-colors duration-200 ${
      isDark ? 'bg-[#070b13] text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 px-4 pb-3 pt-safe flex items-center justify-between border-b transition-colors duration-200 ${
        isDark ? 'bg-[#0e1726]/90 border-gray-805/80 backdrop-blur' : 'bg-white border-gray-250/80 shadow-xs'
      }`}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className={`p-2 -ml-2 rounded-lg transition-colors ${
            isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`text-sm font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>New Inspection</h1>
            <p className={`text-[9px] font-semibold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Record Damage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Light/Dark Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-colors ${
              isDark 
                ? 'bg-gray-800/40 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-750' 
                : 'bg-gray-100 border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-205'
            }`}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-yellow-450" /> : <Moon className="w-4 h-4" />}
          </button>

          {isOnline ? (
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Wifi className="w-3 h-3" /> ONLINE
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 animate-pulse">
              <WifiOff className="w-3 h-3" /> OFFLINE
            </div>
          )}
        </div>
      </header>

      {/* Main Form */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* CAMERA / VIDEO CAPTURE BLOCK */}
          <div className="space-y-2">
            <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              10-Second Inspection Video <span className="text-red-500">*</span>
            </label>
            
            <input 
              type="file" 
              accept="video/*" 
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            {!videoPreviewUrl ? (
              <button
                type="button"
                onClick={triggerCamera}
                className={`w-full aspect-[4/3] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors active:scale-[0.98] outline-none group min-h-[160px] ${
                  isDark 
                    ? 'border-gray-800 hover:border-gray-600 bg-gray-900/40' 
                    : 'border-gray-300 hover:border-gray-400 bg-white shadow-xs'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-blue-600/10 group-hover:bg-blue-600/20 flex items-center justify-center text-blue-500 transition-all border border-blue-500/10 shadow-lg">
                  <Camera className="w-8 h-8 stroke-[2.5]" />
                </div>
                <div className="text-center">
                  <span className={`text-sm font-bold block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Tap to Add Video</span>
                  <span className="text-[11px] text-gray-500 mt-0.5 block">Record or choose from camera roll</span>
                </div>
              </button>
            ) : (
              <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden bg-black border shadow-2xl flex flex-col justify-end ${
                isDark ? 'border-gray-800' : 'border-gray-300'
              }`}>
                <video 
                  src={videoPreviewUrl} 
                  controls 
                  playsInline 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeVideo}
                  className="absolute top-3 right-3 z-10 bg-red-600/90 hover:bg-red-700 text-white p-2.5 rounded-xl shadow-lg border border-red-500/20 active:scale-90 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Form Fields Section */}
          <div className={`space-y-4 rounded-2xl p-4 border transition-colors ${
            isDark ? 'bg-gray-900/20 border-gray-850' : 'bg-white border-gray-250 shadow-xs'
          }`}>
            
            {/* Scan VIN Action Bar */}
            <div className={`flex items-center justify-between pb-3 border-b border-dashed ${
              isDark ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-500">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                <span>Vehicle Information</span>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm border ${
                  isDark
                    ? 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border-blue-500/25'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                Scan VIN Code
              </button>
            </div>

            {/* VIN Code Field */}
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                VIN (Vehicle Identification Number)
              </label>
              <input
                type="text"
                maxLength={17}
                placeholder="17-Digit VIN Code"
                value={vehicleVin}
                onChange={(e) => setVehicleVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className={`w-full h-12 px-3 rounded-xl border focus:border-blue-500 focus:outline-none text-sm font-mono uppercase tracking-wider ${
                  isDark 
                    ? 'bg-gray-950 border-gray-800 text-white border-gray-800' 
                    : 'bg-gray-50 border-gray-300 text-gray-850'
                }`}
              />
            </div>

            {/* Vehicle Year, Make, Model Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Year</label>
                <input 
                  type="number"
                  placeholder="2020"
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value)}
                  className={`w-full h-12 px-3 rounded-xl border focus:border-blue-500 focus:outline-none text-sm ${
                    isDark 
                      ? 'bg-gray-950 border-gray-800 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-850'
                  }`}
                  required
                />
              </div>
              <div className="col-span-2">
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Make <span className="text-red-500">*</span></label>
                {!isOtherMake ? (
                  <select
                    value={vehicleMake}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Other') {
                        setIsOtherMake(true);
                        setVehicleMake('');
                      } else {
                        setVehicleMake(val);
                      }
                      setVehicleModel(''); // Reset model select when make changes
                      setIsOtherModel(false);
                    }}
                    className={`w-full h-12 px-3 rounded-xl border focus:border-blue-500 focus:outline-none text-sm ${
                      isDark 
                        ? 'bg-gray-950 border-gray-800 text-white' 
                        : 'bg-gray-50 border-gray-300 text-gray-850'
                    }`}
                    required
                  >
                    <option value="">Select Make...</option>
                    {Object.keys(CAR_MAKES_AND_MODELS).map((make) => (
                      <option key={make} value={make}>{make}</option>
                    ))}
                    <option value="Other">Other (Type manually)</option>
                  </select>
                ) : (
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="e.g. Tesla, Rivian"
                      value={vehicleMake}
                      onChange={(e) => setVehicleMake(e.target.value)}
                      className={`w-full h-12 pl-3 pr-16 rounded-xl border focus:border-blue-500 focus:outline-none text-sm ${
                        isDark 
                          ? 'bg-gray-955 border-gray-800 text-white' 
                          : 'bg-gray-50 border-gray-300 text-gray-850'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsOtherMake(false);
                        setVehicleMake('');
                        setVehicleModel('');
                        setIsOtherModel(false);
                      }}
                      className="absolute right-2 top-2 h-8 px-2 text-[10px] font-bold bg-blue-600 hover:bg-blue-750 text-white rounded-lg transition-colors"
                    >
                      Use List
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Model <span className="text-red-500">*</span></label>
              {vehicleMake && CAR_MAKES_AND_MODELS[vehicleMake] && !isOtherModel ? (
                <select
                  value={vehicleModel}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      setIsOtherModel(true);
                      setVehicleModel('');
                    } else {
                      setVehicleModel(val);
                    }
                  }}
                  className={`w-full h-12 px-3 rounded-xl border focus:border-blue-500 focus:outline-none text-sm ${
                    isDark 
                      ? 'bg-gray-950 border-gray-800 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-850'
                  }`}
                  required
                >
                  <option value="">Select Model...</option>
                  {CAR_MAKES_AND_MODELS[vehicleMake].map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                  <option value="Other">Other (Type manually)</option>
                </select>
              ) : (
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="e.g. F-150, RAV4"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className={`w-full h-12 pl-3 pr-16 rounded-xl border focus:border-blue-500 focus:outline-none text-sm ${
                      isDark 
                        ? 'bg-gray-955 border-gray-800 text-white' 
                        : 'bg-gray-50 border-gray-300 text-gray-850'
                    }`}
                    required
                  />
                  {vehicleMake && CAR_MAKES_AND_MODELS[vehicleMake] && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOtherModel(false);
                        setVehicleModel('');
                      }}
                      className="absolute right-2 top-2 h-8 px-2 text-[10px] font-bold bg-blue-600 hover:bg-blue-750 text-white rounded-lg transition-colors"
                    >
                      Use List
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Customer Phone */}
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Customer Mobile Number <span className="text-red-500">*</span></label>
              <input 
                type="tel"
                placeholder="e.g. (555) 000-0000"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(formatPhoneNumber(e.target.value))}
                className={`w-full h-12 px-3 rounded-xl border focus:border-blue-500 focus:outline-none text-sm ${
                  isDark 
                    ? 'bg-gray-955 border-gray-800 text-white' 
                    : 'bg-gray-50 border-gray-300 text-gray-850'
                }`}
                required
              />
            </div>

            {/* Repair Details */}
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Repair Name <span className="text-red-500">*</span></label>
              <input 
                type="text"
                placeholder="e.g. Front Brake Pads & Rotors"
                value={repairName}
                onChange={(e) => setRepairName(e.target.value)}
                className={`w-full h-12 px-3 rounded-xl border focus:border-blue-500 focus:outline-none text-sm ${
                  isDark 
                    ? 'bg-gray-955 border-gray-800 text-white' 
                    : 'bg-gray-50 border-gray-300 text-gray-850'
                }`}
                required
              />
            </div>

            {/* Price */}
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Estimated Cost ($) <span className="text-red-500">*</span></label>
              <input 
                type="number"
                step="0.01"
                placeholder="e.g. 450.00"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className={`w-full h-12 px-3 rounded-xl border focus:border-blue-500 focus:outline-none text-sm ${
                  isDark 
                    ? 'bg-gray-955 border-gray-800 text-white' 
                    : 'bg-gray-50 border-gray-300 text-gray-850'
                }`}
                required
              />
            </div>

            {/* Urgency selection */}
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Urgency Level</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'URGENT', label: 'Urgent', color: isDark ? 'border-red-550/20 text-red-400 bg-red-500/5' : 'border-red-200 text-red-600 bg-red-50/50', activeColor: 'bg-red-600 text-white border-red-500' },
                  { value: 'RECOMMENDED', label: 'Recommend', color: isDark ? 'border-amber-550/20 text-amber-400 bg-amber-500/5' : 'border-amber-200 text-amber-600 bg-amber-50/50', activeColor: 'bg-amber-600 text-white border-amber-500' },
                  { value: 'MONITOR', label: 'Monitor', color: isDark ? 'border-gray-800 text-gray-400 bg-gray-800/10' : 'border-gray-300 text-gray-500 bg-gray-50', activeColor: 'bg-gray-655 text-white border-gray-500' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setUrgency(option.value as any)}
                    className={`h-11 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                      urgency === option.value ? option.activeColor : option.color
                    }`}
                  >
                    {urgency === option.value && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Advisor selection */}
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Assigned Service Advisor <span className="text-red-500">*</span></label>
              {!isAddingAdvisor ? (
                <select
                  value={selectedAdvisor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'ADD_NEW') {
                      setIsAddingAdvisor(true);
                      setSelectedAdvisor('');
                    } else {
                      setSelectedAdvisor(val);
                    }
                  }}
                  className={`w-full h-12 px-3 rounded-xl border focus:border-blue-500 focus:outline-none text-sm ${
                    isDark 
                      ? 'bg-gray-955 border-gray-800 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-850'
                  }`}
                  required
                >
                  <option value="">Select Advisor...</option>
                  {advisorsList.map((adv) => (
                    <option key={adv} value={adv}>{adv}</option>
                  ))}
                  <option value="ADD_NEW">+ Add New Advisor...</option>
                </select>
              ) : (
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Type advisor's name (e.g. Bob Smith)"
                    value={selectedAdvisor}
                    onChange={(e) => setSelectedAdvisor(e.target.value)}
                    className={`w-full h-12 pl-3 pr-24 rounded-xl border focus:border-blue-500 focus:outline-none text-sm ${
                      isDark 
                        ? 'bg-gray-955 border-gray-800 text-white' 
                        : 'bg-gray-50 border-gray-300 text-gray-850'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedAdvisor.trim()) {
                        const newName = selectedAdvisor.trim();
                        const updated = Array.from(new Set([...advisorsList, newName]));
                        setAdvisorsList(updated);
                        localStorage.setItem('shopsnap_shop_advisors', JSON.stringify(updated));
                        setIsAddingAdvisor(false);
                        setSelectedAdvisor(newName);
                      } else {
                        setIsAddingAdvisor(false);
                        setSelectedAdvisor(currentUser?.name || '');
                      }
                    }}
                    className="absolute right-2 top-2 h-8 px-2 text-[10px] font-bold bg-blue-600 hover:bg-blue-750 text-white rounded-lg transition-colors"
                  >
                    Add & Use
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Action Submission Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-750 text-white font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-2 border border-blue-500/20 shadow-lg shadow-blue-500/10 text-base"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{videoBlob ? 'Generating & Sending...' : 'Saving to Queue...'}</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>{videoBlob ? 'Generate & Send Text' : 'Add to Queue (Awaiting Inspection)'}</span>
              </>
            )}
          </button>
        </form>
      </main>

      {/* VIN Scanner Modal Component */}
      {isScannerOpen && (
        <VinScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onDecode={(year, make, model, vin) => {
            setVehicleYear(year);
            if (vin) setVehicleVin(vin);
            // Handle make dropdown vs manual input
            if (CAR_MAKES_AND_MODELS[make]) {
              setIsOtherMake(false);
              setVehicleMake(make);
            } else {
              setIsOtherMake(true);
              setVehicleMake(make);
            }
            // Handle model dropdown vs manual input
            if (CAR_MAKES_AND_MODELS[make]?.includes(model)) {
              setIsOtherModel(false);
              setVehicleModel(model);
            } else {
              setIsOtherModel(true);
              setVehicleModel(model);
            }
            setIsScannerOpen(false);
          }}
          isDark={isDark}
        />
      )}

      {/* Success Modal */}
      {successSmsUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border p-6 text-center shadow-2xl transition-colors duration-200 ${
            isDark ? 'bg-[#0f172a] border-gray-800 text-white' : 'bg-white border-gray-250 text-gray-900'
          }`}>
            <div className="mx-auto w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-500/20 mb-3 animate-[pulse_2s_infinite]">
              <CheckCircle className="w-8 h-8" />
            </div>
            
            <h3 className="text-lg font-black tracking-tight mb-1">Inspection Created!</h3>
            <p className={`text-xs mb-6 px-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              The vehicle details and video have been successfully saved to the queue.
            </p>

            <div className="space-y-2.5">
              <a
                href={successSmsUrl}
                onClick={() => {
                  setTimeout(() => {
                    setSuccessSmsUrl(null);
                    router.push('/dashboard');
                  }, 1000);
                }}
                className="w-full h-12 bg-blue-600 hover:bg-blue-750 text-white font-bold rounded-xl shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm"
              >
                <Send className="w-4 h-4" />
                <span>Send SMS to Customer</span>
              </a>
              
              <button
                type="button"
                onClick={() => {
                  setSuccessSmsUrl(null);
                  router.push('/dashboard');
                }}
                className={`w-full h-11 rounded-xl text-xs font-bold border transition-colors ${
                  isDark 
                    ? 'bg-gray-800/40 border-gray-700 text-gray-305 hover:text-white' 
                    : 'bg-gray-50 border-gray-350 text-gray-705 hover:bg-gray-100 hover:text-gray-900 shadow-sm'
                }`}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// VIN SCANNER MODAL COMPONENT & UTILS
// ==========================================

interface VinScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDecode: (year: string, make: string, model: string, vin?: string) => void;
  isDark: boolean;
}

const OFFLINE_DEMO_VEHICLES: Record<string, { year: string; make: string; model: string }> = {
  '1FTFW1ED4MFD00001': { year: '2021', make: 'Ford', model: 'F-150' },
  '4T1B11HK5LU010001': { year: '2020', make: 'Toyota', model: 'Camry' },
  '1HGCV1F13KA010001': { year: '2019', make: 'Honda', model: 'Accord' },
  '1GCUYDED2N1100001': { year: '2022', make: 'Chevrolet', model: 'Silverado' },
  '1C4HJXDG9JW100001': { year: '2018', make: 'Jeep', model: 'Wrangler' }
};

function VinScannerModal({ isOpen, onClose, onDecode, isDark }: VinScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualVin, setManualVin] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Camera States
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  // Simulated Scan States
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [simulatedTarget, setSimulatedTarget] = useState<string | null>(null);
  const [ocrTextFound, setOcrTextFound] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Play dynamic synth chime
  const playSuccessBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.08, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };
      const now = audioCtx.currentTime;
      playTone(523.25, now, 0.12); // C5
      playTone(659.25, now + 0.1, 0.2); // E5
    } catch (err) {
      console.error('Failed to play audio chime:', err);
    }
  };

  // Start webcam and barcode scanning
  useEffect(() => {
    if (activeTab !== 'camera' || !isOpen || !videoRef.current) {
      return;
    }

    // Set up optimized decoding hints for fast, high-accuracy VIN barcode retrieval
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_128,
      BarcodeFormat.QR_CODE
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const codeReader = new BrowserMultiFormatReader(hints);
    let isMounted = true;

    async function startScanning() {
      try {
        setHasCameraPermission('granted');
        await codeReader.decodeFromConstraints(
          {
            video: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          videoRef.current!,
          (result, error) => {
            if (!isMounted) return;
            if (result) {
              const text = result.getText();
              if (text) {
                const cleanText = text.replace(/[^A-Z0-9]/g, '');
                if (cleanText.length === 17) {
                  handleDecode(cleanText);
                } else {
                  const match = text.match(/[A-HJ-NPR-Z0-9]{17}/i);
                  if (match) {
                    handleDecode(match[0]);
                  }
                }
              }
            }
          }
        );
      } catch (err) {
        console.error('Camera access or scanning failed:', err);
        setHasCameraPermission('denied');
      }
    }

    startScanning();

    return () => {
      isMounted = false;
      codeReader.reset();
    };
  }, [activeTab, isOpen]);

  // Decode handler
  const handleDecode = async (vin: string) => {
    if (isDecoding) return;

    const cleanVin = vin.replace(/[^A-Z0-9]/g, '').trim().toUpperCase();
    if (cleanVin.length !== 17) {
      if (activeTab === 'manual') {
        setErrorMsg('VIN must be exactly 17 characters long.');
      }
      return;
    }
    
    setIsDecoding(true);
    setErrorMsg(null);

    try {
      // 1. Try public government API
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvaluesextended/${cleanVin}?format=json`);
      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();
      const result = data.Results?.[0];
      
      if (result && result.Make && result.ModelYear) {
        const year = result.ModelYear.toString();
        // Capitalize make
        const make = result.Make.charAt(0).toUpperCase() + result.Make.slice(1).toLowerCase();
        const model = result.Model ? (result.Model.charAt(0).toUpperCase() + result.Model.slice(1).toLowerCase()) : 'Unknown';
        
        playSuccessBeep();
        onDecode(year, make, model, cleanVin);
        return;
      }
      
      // 2. If API fails to return valid result, try offline dictionary
      if (OFFLINE_DEMO_VEHICLES[cleanVin]) {
        const vehicle = OFFLINE_DEMO_VEHICLES[cleanVin];
        playSuccessBeep();
        onDecode(vehicle.year, vehicle.make, vehicle.model, cleanVin);
        return;
      }

      // 3. Fallback generic year code extraction from 10th digit
      const tenthChar = cleanVin.charAt(9);
      const vinYears: Record<string, string> = {
        'A': '2010', 'B': '2011', 'C': '2012', 'D': '2013', 'E': '2014',
        'F': '2015', 'G': '2016', 'H': '2017', 'J': '2018', 'K': '2019',
        'L': '2020', 'M': '2021', 'N': '2022', 'P': '2023', 'R': '2024',
        'S': '2025', 'T': '2026', 'V': '2027', 'W': '2028', 'X': '2029', 'Y': '2030'
      };
      const year = vinYears[tenthChar];
      if (year) {
        playSuccessBeep();
        onDecode(year, 'Decoded Vehicle', 'Model (Verify manual)', cleanVin);
        return;
      }

      throw new Error('This VIN could not be decoded. Please enter details manually.');
    } catch (err: any) {
      console.error('Error decoding VIN:', err);
      // Last-second fallback if completely offline but matching demo
      if (OFFLINE_DEMO_VEHICLES[cleanVin]) {
        const vehicle = OFFLINE_DEMO_VEHICLES[cleanVin];
        playSuccessBeep();
        onDecode(vehicle.year, vehicle.make, vehicle.model, cleanVin);
        return;
      }
      setErrorMsg(err.message || 'Network error: could not decode VIN.');
    } finally {
      setIsDecoding(false);
    }
  };

  // Simulate scanning of demo vehicle
  const handleSimulateScan = (vin: string) => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulatedTarget(vin);
    setSimulatedProgress(0);
    setErrorMsg(null);
    setOcrTextFound(null);

    // Make sure we have permission/webcam showing
    if (hasCameraPermission !== 'granted') {
      setHasCameraPermission('granted');
    }

    const interval = setInterval(() => {
      setSimulatedProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setOcrTextFound(vin);
          setTimeout(() => {
            handleDecode(vin);
            setIsSimulating(false);
            setSimulatedTarget(null);
          }, 600);
          return 100;
        }
        return prev + 10;
      });
    }, 120);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <style>{`
        @keyframes scan-laser {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
        .animate-laser {
          animation: scan-laser 2.5s infinite linear;
        }
        .animate-glow {
          animation: pulse-glow 2s infinite ease-in-out;
        }
      `}</style>

      <div className={`w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl flex flex-col ${
        isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
      }`}>
        {/* Modal Header */}
        <div className={`px-4 py-3 border-b flex items-center justify-between ${
          isDark ? 'border-gray-800 bg-gray-950/60' : 'border-gray-150 bg-gray-50'
        }`}>
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-sm">Vehicle VIN Scanner</h3>
          </div>
          <button 
            type="button" 
            onClick={() => {
              onClose();
            }} 
            className={`p-1.5 rounded-lg text-xs font-semibold hover:bg-gray-700/20 transition-colors ${
              isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'
            }`}
          >
            Cancel
          </button>
        </div>

        {/* Tabs switcher */}
        <div className={`grid grid-cols-2 text-xs border-b ${
          isDark ? 'border-gray-800 bg-gray-950/30' : 'border-gray-150 bg-gray-50/50'
        }`}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              setErrorMsg(null);
            }}
            className={`py-3 font-bold border-b-2 transition-all ${
              activeTab === 'camera' 
                ? 'border-blue-500 text-blue-500 bg-blue-500/[0.02]' 
                : 'border-transparent text-gray-500 hover:text-gray-750'
            }`}
          >
            Camera Scanner
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              setErrorMsg(null);
            }}
            className={`py-3 font-bold border-b-2 transition-all ${
              activeTab === 'manual' 
                ? 'border-blue-500 text-blue-500 bg-blue-500/[0.02]' 
                : 'border-transparent text-gray-500 hover:text-gray-750'
            }`}
          >
            Manual VIN Decode
          </button>
        </div>

        {/* Scanner Content */}
        <div className="p-4 flex-1 flex flex-col min-h-[300px]">
          
          {activeTab === 'camera' && (
            <div className="space-y-4 flex-1 flex flex-col">
              
              {/* Viewfinder area */}
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black border border-gray-800 shadow-inner flex flex-col items-center justify-center">
                {/* Video element is ALWAYS rendered so the ref is always bound on mount */}
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                    hasCameraPermission === 'granted' ? 'opacity-70' : 'opacity-0'
                  }`}
                />

                {/* Overlays on top of the video */}
                {hasCameraPermission === 'granted' && (
                  <>
                    {/* Visual Scan Box & Laser Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-4/5 h-1/3 border-2 border-dashed border-emerald-400/80 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.15)] animate-glow">
                        {/* Laser line animation */}
                        <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-laser" />
                        
                        {/* Status label inside */}
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 bg-black/70 px-2 py-0.5 rounded border border-emerald-500/20">
                          {isSimulating ? `Scanning... ${simulatedProgress}%` : 'Align VIN Text / Barcode'}
                        </span>

                        {/* Corner markers */}
                        <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
                        <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-400 rounded-br" />
                      </div>
                    </div>

                    {/* Simulated bounding box of text capture */}
                    {ocrTextFound && (
                      <div className="absolute w-4/5 h-1/10 bg-blue-500/20 border border-blue-500 rounded flex items-center justify-center animate-pulse">
                        <span className="font-mono text-xs font-bold text-white tracking-widest">{ocrTextFound}</span>
                      </div>
                    )}
                  </>
                )}

                {hasCameraPermission === 'denied' && (
                  <div className="absolute inset-0 bg-black/90 p-4 flex flex-col items-center justify-center text-center space-y-2 z-10">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-xs font-semibold text-gray-400">Camera permission was denied.</p>
                    <p className="text-[10px] text-gray-500">Please enable camera access in your settings, or use the Manual VIN tab.</p>
                  </div>
                )}

                {hasCameraPermission === 'prompt' && (
                  <div className="absolute inset-0 bg-black/95 p-4 flex flex-col items-center justify-center text-center space-y-3 z-10">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                    <p className="text-xs font-medium text-gray-400">Initializing camera stream...</p>
                  </div>
                )}
              </div>

              {/* Quick demo scanner trigger buttons */}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Quick Test Simulation
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={isSimulating}
                    onClick={() => handleSimulateScan('1FTFW1ED4MFD00001')}
                    className={`h-9 px-2 rounded-xl text-[10px] font-bold border text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                      isDark 
                        ? 'bg-gray-800/40 hover:bg-gray-800 border-gray-700 text-gray-300' 
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-755'
                    }`}
                  >
                    <span>🚙 Ford F-150</span>
                    <span className="text-[9px] font-mono text-gray-500">2021 VIN</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSimulating}
                    onClick={() => handleSimulateScan('4T1B11HK5LU010001')}
                    className={`h-9 px-2 rounded-xl text-[10px] font-bold border text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                      isDark 
                        ? 'bg-gray-800/40 hover:bg-gray-800 border-gray-700 text-gray-300' 
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-755'
                    }`}
                  >
                    <span>🚗 Toyota Camry</span>
                    <span className="text-[9px] font-mono text-gray-500">2020 VIN</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSimulating}
                    onClick={() => handleSimulateScan('1HGCV1F13KA010001')}
                    className={`h-9 px-2 rounded-xl text-[10px] font-bold border text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                      isDark 
                        ? 'bg-gray-800/40 hover:bg-gray-800 border-gray-700 text-gray-300' 
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-755'
                    }`}
                  >
                    <span>🚗 Honda Accord</span>
                    <span className="text-[9px] font-mono text-gray-500">2019 VIN</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSimulating}
                    onClick={() => handleSimulateScan('1C4HJXDG9JW100001')}
                    className={`h-9 px-2 rounded-xl text-[10px] font-bold border text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                      isDark 
                        ? 'bg-gray-800/40 hover:bg-gray-800 border-gray-700 text-gray-300' 
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-755'
                    }`}
                  >
                    <span>🚙 Jeep Wrangler</span>
                    <span className="text-[9px] font-mono text-gray-500">2018 VIN</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              <div className="space-y-2">
                <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Enter 17-Digit VIN Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={17}
                    placeholder="e.g. 1FTFW1ED4MFD00001"
                    value={manualVin}
                    onChange={(e) => setManualVin(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    className={`flex-1 h-12 px-3 rounded-xl border focus:border-blue-500 focus:outline-none font-mono text-sm uppercase tracking-widest ${
                      isDark 
                        ? 'bg-gray-955 border-gray-800 text-white' 
                        : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={isDecoding || manualVin.length !== 17}
                    onClick={() => handleDecode(manualVin)}
                    className="h-12 px-4 rounded-xl bg-blue-600 hover:bg-blue-750 text-white font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5 shadow-sm border border-blue-500/20"
                  >
                    {isDecoding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Decode
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 leading-normal">
                  Decodes using NHTSA database to fill Year, Make, and Model details automatically.
                </p>
              </div>

              {/* Demo examples helper for copy-paste test */}
              <div className={`p-3 rounded-xl border text-xs space-y-2 ${
                isDark ? 'bg-gray-950/40 border-gray-800/60' : 'bg-gray-50 border-gray-200'
              }`}>
                <span className="font-semibold block text-[10px] text-gray-500 uppercase">Test VIN Examples to Copy:</span>
                <div className="space-y-1.5 font-mono text-[10.5px]">
                  <div className="flex justify-between items-center bg-gray-500/5 px-2 py-1 rounded">
                    <span>Ford F-150: <strong className="text-blue-500 select-all">1FTFW1ED4MFD00001</strong></span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-500/5 px-2 py-1 rounded">
                    <span>Toyota Camry: <strong className="text-blue-500 select-all">4T1B11HK5LU010001</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Decoding Status / Error Display */}
          {isDecoding && activeTab === 'manual' && (
            <div className="mt-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-blue-400 text-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Querying NHTSA Government Database...</span>
            </div>
          )}

          {errorMsg && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
