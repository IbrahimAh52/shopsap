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
  Moon
} from 'lucide-react';
import { db, isSupabaseConfigured, generateUUID } from '@/lib/db';
import { offlineQueue } from '@/lib/offline-queue';

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
  const [isOtherMake, setIsOtherMake] = useState<boolean>(false);
  const [isOtherModel, setIsOtherModel] = useState<boolean>(false);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [repairName, setRepairName] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [urgency, setUrgency] = useState<'URGENT' | 'RECOMMENDED' | 'MONITOR'>('RECOMMENDED');

  // Pre-fill if loading from queue
  useEffect(() => {
    if (editId) {
      db.get(editId).then((data) => {
        if (data) {
          setVehicleYear(data.vehicleYear.toString());
          setVehicleMake(data.vehicleMake);
          setVehicleModel(data.vehicleModel);
          setCustomerPhone(data.customerPhone);
          setRepairName(data.repairName);
          setEstimatedCost(data.estimatedCost.toString());
          setUrgency(data.urgency);
          
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

  // Theme state: defaults to dark (true) for greasy hands / bays
  const [isDark, setIsDark] = useState<boolean>(true);

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
      if (savedTheme === 'light') {
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
    if (!videoBlob) {
      alert('Please capture or select a 10-second inspection video.');
      return;
    }

    setIsSubmitting(true);
    const costNum = parseFloat(estimatedCost);
    const inspectionId = editId || generateUUID();
    const isEditing = !!editId;

    const metadata = {
      vehicleYear: parseInt(vehicleYear) || new Date().getFullYear(),
      vehicleMake,
      vehicleModel,
      customerPhone,
      repairName,
      estimatedCost: costNum,
      urgency,
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
        const smsText = `ShopSnap: ${metadata.vehicleMake} ${metadata.vehicleModel} checkup. Required service: ${metadata.repairName}. Estimate: $${costNum.toFixed(2)}. Review details & approve here: ${quoteUrl}`;
        
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

        // Route to dashboard first, then open native SMS protocol
        router.push('/dashboard');
        
        setTimeout(() => {
          window.location.href = smsUrl;
        }, 100);
      }
    } catch (error: any) {
      console.error('Error submitting inspection:', error);
      alert('Error creating inspection: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    </div>
  );
}
