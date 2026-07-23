'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  ShieldCheck, 
  Car, 
  Wrench, 
  CheckCircle, 
  AlertTriangle, 
  MessageSquare,
  Lock
} from 'lucide-react';
import { db, Inspection } from '@/lib/db';

const PROVINCE_TAXES: Record<string, { name: string; rate: number; label: string }> = {
  AB: { name: 'Alberta', rate: 0.05, label: 'GST (5%)' },
  BC: { name: 'British Columbia', rate: 0.12, label: 'GST+PST (12%)' },
  MB: { name: 'Manitoba', rate: 0.12, label: 'GST+PST (12%)' },
  NB: { name: 'New Brunswick', rate: 0.15, label: 'HST (15%)' },
  NL: { name: 'Newfoundland & Labrador', rate: 0.15, label: 'HST (15%)' },
  NS: { name: 'Nova Scotia', rate: 0.15, label: 'HST (15%)' },
  NT: { name: 'Northwest Territories', rate: 0.05, label: 'GST (5%)' },
  NU: { name: 'Nunavut', rate: 0.05, label: 'GST (5%)' },
  ON: { name: 'Ontario', rate: 0.13, label: 'HST (13%)' },
  PE: { name: 'Prince Edward Island', rate: 0.15, label: 'HST (15%)' },
  QC: { name: 'Quebec', rate: 0.14975, label: 'GST+QST (14.975%)' },
  SK: { name: 'Saskatchewan', rate: 0.11, label: 'GST+PST (11%)' },
  YT: { name: 'Yukon', rate: 0.05, label: 'GST (5%)' },
  NONE: { name: 'No Tax', rate: 0, label: 'Sales Tax (0%)' }
};

export default function CustomerQuotePortal() {
  const params = useParams();
  const quoteId = params.quoteId as string;

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for approval
  const [showSignatureModal, setShowSignatureModal] = useState<boolean>(false);
  const [signatureName, setSignatureName] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        setLoading(true);
        // Attempt to fetch from DB
        const data = await db.get(quoteId);
        if (data) {
          setInspection(data);
        } else {
          setError('Inspection report not found. Please contact the advisor.');
        }
      } catch (err: any) {
        console.error('Error fetching inspection:', err);
        setError('Error loading report. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (quoteId) {
      fetchQuote();
    }
  }, [quoteId]);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureName.trim()) {
      alert('Please type your name to sign the approval.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await db.update(quoteId, {
        status: 'APPROVED',
        signature: signatureName,
        approvedAt: new Date().toISOString(),
      });
      setInspection(updated);
      setShowSignatureModal(false);

      // Trigger custom storage sync event to notify any open dashboard tabs
      window.dispatchEvent(new Event('storage_updated'));
      
      // Update inspections API
      await fetch('/api/inspections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: quoteId,
          status: 'APPROVED',
          signature: signatureName,
          approvedAt: new Date().toISOString(),
        }),
      });

    } catch (err: any) {
      alert('Failed to approve repair: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    const confirmDecline = confirm('Are you sure you want to decline this repair? Your service advisor will contact you shortly.');
    if (!confirmDecline) return;

    try {
      const updated = await db.update(quoteId, {
        status: 'DECLINED',
      });
      setInspection(updated);

      // Trigger custom storage sync event
      window.dispatchEvent(new Event('storage_updated'));

      // Update API
      await fetch('/api/inspections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: quoteId,
          status: 'DECLINED',
        }),
      });
    } catch (err: any) {
      alert('Failed to decline repair: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-800 p-8 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="text-sm font-semibold text-gray-500 mt-4">Loading secure portal...</p>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-800 p-8 min-h-screen text-center">
        <div className="bg-red-50 text-red-600 p-3 rounded-full border border-red-100">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <p className="text-base font-bold text-gray-800 mt-4">{error || 'Report not found'}</p>
        <p className="text-xs text-gray-500 max-w-xs mt-2">
          Verify the URL link or contact your service advisor directly.
        </p>
      </div>
    );
  }

  const formatCost = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const defaultProv = typeof window !== 'undefined' ? (localStorage.getItem('shopsnap_shop_province') || 'AB') : 'AB';
  const provCode = (inspection.province || defaultProv).toUpperCase();
  const taxInfo = PROVINCE_TAXES[provCode] || PROVINCE_TAXES['AB'];
  
  const subtotal = inspection.estimatedCost || 0;
  const taxAmount = subtotal * taxInfo.rate;
  const totalAmount = subtotal + taxAmount;

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-gray-50 text-gray-900 font-sans antialiased selection:bg-blue-100">
      
      {/* Carrier-grade Minimalist Top Indicator */}
      <div className="bg-gray-900 text-white pb-2 pt-safe px-4 text-center text-[10px] font-bold tracking-widest flex items-center justify-center gap-1.5 uppercase select-none">
        <Lock className="w-3 h-3 text-blue-400" /> SECURE VEHICLE TRANSACTION PORTAL
      </div>

      {/* Brand Shop Header */}
      <header className="px-4 py-3 bg-white border-b border-gray-200/80 flex items-center justify-between shadow-xs sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-650 flex items-center justify-center text-white shadow-xs">
            <Wrench className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-gray-900">
            {inspection.shopName || 'ShopSnap'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verified Shop</span>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-md mx-auto w-full space-y-5 py-6">
        
        {/* Verification Card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-md p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl border border-blue-100/50">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wide">Inspection Report</span>
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Verified Digital Record</h2>
            </div>
          </div>
          <span className="text-[10px] bg-gray-100 text-gray-500 font-mono font-bold border border-gray-200 px-2 py-0.5 rounded uppercase">
            ID: {inspection.id.split('-')[1] || inspection.id.slice(0, 5)}
          </span>
        </div>

        {/* Video Player Section */}
        {inspection.videoUrl && (
          <div className="bg-black rounded-3xl overflow-hidden aspect-[4/3] shadow-lg border border-gray-200 relative">
            <video 
              src={inspection.videoUrl} 
              controls 
              playsInline 
              preload="metadata"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Structured Transaction Receipt */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-md overflow-hidden relative">
          {/* Top Tear Decoration */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-b from-gray-100 to-transparent" />
          
          <div className="p-5 space-y-5">
            {/* Section: Vehicle Info */}
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 pb-3 border-b border-gray-100 uppercase tracking-wider">
              <Car className="w-4 h-4 text-gray-400" />
              <span>Vehicle Details</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase">Year / Make / Model</p>
              <h3 className="text-xl font-bold text-gray-900 mt-0.5">
                {inspection.vehicleYear} {inspection.vehicleMake} {inspection.vehicleModel}
              </h3>
            </div>

            {/* Section: Repair Itemized */}
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 pb-3 border-b border-gray-100 uppercase tracking-wider pt-2">
              <Wrench className="w-4 h-4 text-gray-400" />
              <span>Required Services</span>
            </div>
            
            <div className="space-y-0">
              {inspection.items && inspection.items.length > 0 ? (
                <>
                  {inspection.items.map((item, idx) => (
                    <div key={idx} className={`flex items-start justify-between gap-3 py-3 ${
                      idx < inspection.items!.length - 1 ? 'border-b border-dashed border-gray-100' : ''
                    }`}>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-gray-800 leading-snug">{item.name}</h4>
                        <span className={`inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${
                          item.urgency === 'URGENT' 
                            ? 'bg-red-50 text-red-600 border-red-100' 
                            : item.urgency === 'RECOMMENDED'
                              ? 'bg-amber-50 text-amber-600 border-amber-100'
                              : 'bg-gray-50 text-gray-500 border-gray-100'
                        }`}>
                          {item.urgency}
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-gray-900 whitespace-nowrap pt-0.5">
                        {formatCost(item.cost)}
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                /* Fallback: single repair (legacy records without items array) */
                <div className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">{inspection.repairName}</h4>
                    <span className={`inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${
                      inspection.urgency === 'URGENT' 
                        ? 'bg-red-50 text-red-600 border-red-100' 
                        : inspection.urgency === 'RECOMMENDED'
                          ? 'bg-amber-50 text-amber-600 border-amber-100'
                          : 'bg-gray-50 text-gray-500 border-gray-100'
                    }`}>
                      {inspection.urgency}
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-gray-900">
                    {formatCost(inspection.estimatedCost)}
                  </span>
                </div>
              )}
            </div>

            {/* Transaction Total Summary */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Subtotal</span>
                <span>{formatCost(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                <span>Sales Tax ({taxInfo.label})</span>
                <span>{formatCost(taxAmount)}</span>
              </div>
              <div className="h-px bg-gray-200 my-1" />
              <div className="flex items-center justify-between text-sm text-gray-800 font-extrabold">
                <span>Total Authorization</span>
                <span className="text-base font-black text-gray-900">
                  {formatCost(totalAmount)}
                </span>
              </div>
            </div>

          </div>

          {/* Dotted Tear line */}
          <div className="w-full flex items-center justify-between px-3">
            {[...Array(24)].map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-100" />
            ))}
          </div>

          {/* Footer state display */}
          <div className="p-5 bg-gray-50/50">
            {inspection.status === 'APPROVED' ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col items-center text-center gap-1.5">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
                <h4 className="text-sm font-extrabold text-emerald-900">REPAIR AUTHORIZED</h4>
                <p className="text-xs text-emerald-700 max-w-[240px]">
                  Digital approval has been processed. The shop has been notified to begin work.
                </p>
                <div className="text-[10px] font-mono text-gray-500 mt-2 space-y-0.5 text-left border-t border-emerald-100/50 pt-2 w-full">
                  <p><strong>Signed by:</strong> {inspection.signature}</p>
                  <p><strong>Date:</strong> {inspection.approvedAt ? new Date(inspection.approvedAt).toLocaleString() : new Date().toLocaleString()}</p>
                </div>
              </div>
            ) : inspection.status === 'DECLINED' ? (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
                <h4 className="text-sm font-bold text-red-700">Estimate Declined</h4>
                <p className="text-xs text-red-600 mt-1">
                  You have declined this repair. A service advisor will call you to discuss options.
                </p>
              </div>
            ) : inspection.status === 'ARCHIVED' ? (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col items-center text-center gap-1.5">
                <CheckCircle className="w-8 h-8 text-blue-600" />
                <h4 className="text-sm font-extrabold text-blue-900">REPAIR COMPLETED</h4>
                <p className="text-xs text-blue-755 max-w-[240px]">
                  This vehicle repair has been successfully completed and archived. Thank you for your business!
                </p>
                {inspection.signature && (
                  <div className="text-[10px] font-mono text-gray-500 mt-2 space-y-0.5 text-left border-t border-blue-100/50 pt-2 w-full">
                    <p><strong>Approved by:</strong> {inspection.signature}</p>
                    <p><strong>Date:</strong> {inspection.approvedAt ? new Date(inspection.approvedAt).toLocaleString() : new Date().toLocaleString()}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowSignatureModal(true)}
                  className="w-full h-14 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-emerald-500/20"
                >
                  <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                  <span>Approve & Authorize Fix</span>
                </button>

                <button
                  type="button"
                  onClick={handleDecline}
                  className="w-full h-11 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-900 text-xs font-bold rounded-xl border border-gray-300 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Decline / Talk to Advisor</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Signature Capture Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-gray-200 p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-gray-900">Sign Authorization</h3>
              <p className="text-xs text-gray-500">Please print your name below to legally authorize the repair estimate.</p>
            </div>
            
            <form onSubmit={handleApprove} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Your Full Name</label>
                <input 
                  type="text"
                  placeholder="e.g. Johnathan Doe"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:outline-none text-sm text-gray-800 font-medium"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSignatureModal(false)}
                  className="flex-1 h-11 bg-gray-100 text-gray-605 font-bold text-xs rounded-xl border border-gray-200 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl border border-blue-500/20 hover:shadow-md transition-all flex items-center justify-center"
                >
                  {submitting ? 'Submitting...' : 'Sign & Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trust Footer */}
      <footer className="text-center py-8 text-[11px] text-gray-400 font-semibold space-y-1 bg-gray-100/30 border-t border-gray-200/50 mt-12 w-full">
        <p>Powered by <span className="font-extrabold text-gray-600 tracking-tight">ShopSnap</span></p>
        <p className="text-[10px] text-gray-400 font-normal">© {new Date().getFullYear()} ShopSnap Transaction Portal. All rights reserved.</p>
      </footer>
    </div>
  );
}
