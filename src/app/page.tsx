'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Wrench, 
  Check, 
  Play, 
  TrendingUp, 
  Smartphone, 
  Wifi, 
  UserCheck, 
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Loader2
} from 'lucide-react';

const CAR_MAKES_AND_MODELS = {
  Ford: ['F-150', 'Escape', 'Explorer'],
  Toyota: ['RAV4', 'Camry', 'Corolla'],
  Chevrolet: ['Silverado', 'Equinox', 'Malibu'],
  Honda: ['Civic', 'Accord', 'CR-V']
};

export default function Home() {
  // Calculator States
  const [ticketCost, setTicketCost] = useState<number>(450);
  const [monthlyTickets, setMonthlyTickets] = useState<number>(120);
  const [currentApproval, setCurrentApproval] = useState<number>(45);

  // Pricing Toggle State
  const [isAnnual, setIsAnnual] = useState<boolean>(true);

  // ROI Calculations
  // Assume ShopSnap increases approval rate by 25% points on average
  const newApproval = Math.min(90, currentApproval + 25);
  const currentRevenue = monthlyTickets * (currentApproval / 100) * ticketCost;
  const newRevenue = monthlyTickets * (newApproval / 100) * ticketCost;
  const monthlyUplift = newRevenue - currentRevenue;
  const annualUplift = monthlyUplift * 12;

  const currentPrice = isAnnual ? 99 : 129;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Top Banner Alert */}
      <div className="bg-blue-50 border-b border-blue-100 text-blue-800 py-2.5 px-4 text-center text-xs font-semibold flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-blue-500" />
        <span>Positioned as an add-on, not a replacement. Supercharge your existing shop software today.</span>
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 py-4 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg">
            <Wrench className="w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">ShopSnap</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
          <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
          <a href="#calculator" className="hover:text-blue-600 transition-colors">ROI Calculator</a>
          <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="px-4 py-2 text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
          >
            Advisor Portal
          </Link>
          <Link 
            href="/dashboard/new" 
            className="hidden sm:inline-flex px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm shadow-blue-500/10 active:scale-95 transition-all"
          >
            New Inspection
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-20 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side Header Text */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200/50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <span>B2B TRUST-BUILDER</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.05]">
            Double Your Shop’s <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Repair Approvals.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Stop losing thousands on recommended service declines. Send 10-second inspection videos directly to clients via native SMS. Transparent visuals build instant trust.
          </p>

          {/* Value Prop Positioning Alert */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-start gap-3 shadow-xs max-w-xl mx-auto lg:mx-0 text-left">
            <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">A Supercharger, Not a Replacement</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ShopSnap runs directly alongside Mitchell 1, Tekmetric, Shop-Ware, or NAPA TRACS. No database imports, no double entry, and absolutely no legacy system tear-downs.
              </p>
            </div>
          </div>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
            <Link
              href="/dashboard/new"
              className="w-full sm:w-auto h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all active:scale-[0.99] flex items-center justify-center gap-2 border border-blue-500/20 shadow-md shadow-blue-500/10 text-sm"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#calculator"
              className="w-full sm:w-auto h-12 px-6 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 shadow-xs transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 text-sm"
            >
              <span>Calculate Your ROI</span>
            </a>
          </div>
        </div>

        {/* Right Side Visual Mockup (Light Theme Receipt / Quote Portal) */}
        <div className="lg:col-span-5 relative w-full max-w-md mx-auto">
          {/* Background Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-200 to-indigo-100 rounded-3xl filter blur-3xl opacity-60 -z-10" />

          {/* Floating Customer Portal Receipt Mock */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-5 space-y-4">
            
            {/* Top Bar Indicator */}
            <div className="bg-slate-900 text-white py-1.5 px-3 rounded-lg text-center text-[9px] font-bold tracking-widest flex items-center justify-center gap-1 uppercase select-none">
              <ShieldCheck className="w-3 h-3 text-blue-400" /> SECURE DEPOSIT PORTAL
            </div>

            {/* Header info */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wide">Approved Quote Record</span>
                <h3 className="text-sm font-extrabold text-slate-800">2018 Ford F-150</h3>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-mono font-bold px-2 py-0.5 rounded">ID: 21C64B</span>
            </div>

            {/* Video Player Mock */}
            <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden group shadow-lg flex items-center justify-center text-white border border-slate-800">
              {/* Simulated Poster image */}
              <div className="absolute inset-0 bg-slate-900 opacity-80 flex flex-col items-center justify-center">
                <Play className="w-10 h-10 text-white fill-white/10 p-2.5 rounded-full bg-blue-600 shadow-lg border border-blue-500/20 mb-1" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Inspection Clip (0:10)</span>
              </div>
            </div>

            {/* Line items checklist */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/40 space-y-2">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200/60 font-semibold text-slate-500">
                <span>Proposed Repair</span>
                <span>Estimate</span>
              </div>
              <div className="flex items-start justify-between gap-4 text-xs font-bold text-slate-800">
                <div className="flex gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Front Brake Pads & Rotors</span>
                </div>
                <span>$450.00</span>
              </div>
            </div>

            {/* Signature Block */}
            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Approved by Client:</div>
              <div className="h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 flex items-center justify-between text-xs italic font-serif text-slate-700">
                <span>Jane Doe</span>
                <span className="text-[9px] font-sans font-bold not-italic bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                  SIGNED DIGITAL AUTH
                </span>
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* Trust Quote System (The B2B Problem) */}
      <section className="bg-slate-100 border-y border-slate-200/80 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">The Core Friction</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            "Clients Decline Repairs Because They Don't Trust What They Can't See."
          </h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
            Explaining complex structural wears or greasy brake calipers over a phone call is difficult. Giving them a 10-second inspection video builds transparent trust, turning declines into instant approvals.
          </p>
        </div>
      </section>

      {/* ROI Revenue Calculator Section */}
      <section id="calculator" className="py-20 px-4 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <span>REVENUE CALCULATOR</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Calculate Your Shop's Monthly Uplift
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Drag the sliders below to match your shop's current monthly metrics and watch how much hidden revenue ShopSnap unlocks.
          </p>
        </div>

        {/* Calculator Widget Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
          
          {/* Sliders Box */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 flex flex-col justify-center">
            
            {/* Input Slider 1: Average Cost */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Average Repair Order (RO) Cost</label>
                <span className="text-lg font-black text-blue-600">${ticketCost}</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="1500" 
                step="25"
                value={ticketCost}
                onChange={(e) => setTicketCost(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>$100</span>
                <span>$1,500</span>
              </div>
            </div>

            {/* Input Slider 2: Monthly Tickets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Recommended Jobs per Month</label>
                <span className="text-lg font-black text-blue-600">{monthlyTickets}</span>
              </div>
              <input 
                type="range" 
                min="20" 
                max="500" 
                step="10"
                value={monthlyTickets}
                onChange={(e) => setMonthlyTickets(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>20</span>
                <span>500</span>
              </div>
            </div>

            {/* Input Slider 3: Current Approval Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Customer Approval Rate</label>
                <span className="text-lg font-black text-blue-600">{currentApproval}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="80" 
                step="5"
                value={currentApproval}
                onChange={(e) => setCurrentApproval(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>10%</span>
                <span>80%</span>
              </div>
            </div>

          </div>

          {/* Output Results Box */}
          <div className="lg:col-span-5 bg-gradient-to-tr from-blue-600 to-indigo-700 text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl shadow-blue-600/10">
            <div className="space-y-6">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-full inline-block">
                PROJECTED RETURN ON INVESTMENT
              </span>

              <div className="space-y-1">
                <span className="text-xs text-blue-200 block uppercase font-bold tracking-wider">New Monthly Revenue</span>
                <div className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
                  ${newRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
                <span className="text-[11px] text-blue-100/70 block">
                  Increased approval rate to <strong className="text-white">{newApproval}%</strong> (+25% uplift)
                </span>
              </div>

              <div className="h-px bg-white/10 w-full" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-blue-200 block uppercase font-bold tracking-wider">Monthly Profit Gain</span>
                  <span className="text-xl sm:text-2xl font-black">${monthlyUplift.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <div>
                  <span className="text-[10px] text-blue-200 block uppercase font-bold tracking-wider">Annual Profit Gain</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400">${annualUplift.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-4 mt-6 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-blue-200 block">SaaS Pricing:</span>
                <span className="font-extrabold text-sm text-white">${currentPrice}/mo</span>
              </div>
              <div className="text-right font-black text-emerald-400">
                {Math.round(monthlyUplift / currentPrice)}x Monthly ROI
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-white py-20 px-4 border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">WORKFLOW INTEGRATION</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              The 10-Second Inspection Loop
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              No new processes or CRM setups. Mechanics and service advisors can execute this in four dead-simple steps.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                step: '01', 
                title: 'Queue Vehicle', 
                desc: 'The service advisor queues the car in the dashboard directly from their desk (no video required).',
                icon: <Wrench className="w-5 h-5" /> 
              },
              { 
                step: '02', 
                title: 'Record Issue', 
                desc: 'The mechanic opens the queue item, captures a 10-second video of the fault, and types the estimate.',
                icon: <Play className="w-5 h-5" /> 
              },
              { 
                step: '03', 
                title: 'Native SMS Dispatch', 
                desc: 'Tapping send routes back to the dashboard and automatically triggers the native iMessage/SMS window.',
                icon: <Smartphone className="w-5 h-5" /> 
              },
              { 
                step: '04', 
                title: 'Customer Approval', 
                desc: 'The client watches the clip, signs the approval block on their phone, and your active board syncs in real-time.',
                icon: <UserCheck className="w-5 h-5" /> 
              }
            ].map((card) => (
              <div key={card.step} className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl space-y-4 hover:border-slate-350 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="bg-blue-600 text-white p-2.5 rounded-xl">
                    {card.icon}
                  </div>
                  <span className="text-2xl font-black text-slate-300">{card.step}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">{card.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">PRODUCT FEATURES</span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Engineered For The Shop Floor
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Greasy hands, bad internet connection, and heavy invoicing software shouldn't stop approvals.
          </p>
        </div>

        {/* Features Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: '$0.00 SMS Delivery Costs',
              desc: 'By launching the native mobile messaging application directly from the PWA, shops bypass all Twilio billing overhead and strict A2P 10DLC vetting regulations.',
              icon: <Smartphone className="w-5 h-5" />
            },
            {
              title: 'Offline Queue Mode',
              desc: 'If a mechanic loses Wi-Fi connection in the service bays, IndexedDB stores the recorded video file locally and uploads it automatically once signal is restored.',
              icon: <Wifi className="w-5 h-5" />
            },
            {
              title: 'Audited Phone Approvals',
              desc: 'When clients call in verbal approval, advisors record the authorization with a mandatory advisor-name audit trail, preventing accidental/unauthorized clicks.',
              icon: <UserCheck className="w-5 h-5" />
            },
            {
              title: 'Camera Roll Upload',
              desc: 'Support taking immediate video recordings in-app, or choose pre-recorded video clips and photos directly from your device’s photo library.',
              icon: <Play className="w-5 h-5" />
            },
            {
              title: 'Fully Installable PWA',
              desc: 'Built as a Progressive Web App. Mechanics can add ShopSnap directly to their iOS/Android home screens for standalone app speeds and responsiveness.',
              icon: <Wrench className="w-5 h-5" />
            },
            {
              title: 'Premium Theme Toggle',
              desc: 'Mechanic dashboards default to smudge-resistant dark mode for dirty hands, but switch instantly to a high-contrast sunlight mode for outdoor service bays.',
              icon: <Sparkles className="w-5 h-5" />
            }
          ].map((feat, idx) => (
            <div key={idx} className="bg-white border border-slate-200/80 p-5 rounded-2xl space-y-3 hover:shadow-xs transition-shadow">
              <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl inline-block">
                {feat.icon}
              </div>
              <h3 className="text-base font-bold text-slate-800">{feat.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-slate-100 border-t border-slate-200 py-20 px-4">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">TRANSPARENT PRICING</span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              One Flat Plan. Unlimited Growth.
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              No hidden fees, no limits on mechanics, and no per-text surcharges. Try risk-free for 14 days.
            </p>

            {/* Toggle Button Group */}
            <div className="inline-flex items-center gap-1.5 bg-white border border-slate-250 p-1.5 rounded-2xl shadow-xs mt-4">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  !isAnnual ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Bill Monthly
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  isAnnual ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <span>Bill Annually</span>
                <span className="bg-emerald-100 text-emerald-750 text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-200">
                  SAVE 23%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm mx-auto shadow-xl overflow-hidden flex flex-col justify-between">
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">THE FULL SYSTEM</span>
                <h3 className="text-2xl font-black text-slate-800">Pro Shop Plan</h3>
                <p className="text-xs text-slate-500">Perfect for single locations with up to 10 service bays.</p>
              </div>

              <div className="flex items-baseline gap-1 text-slate-900">
                <span className="text-5xl font-black tracking-tight">${isAnnual ? 99 : 129}</span>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">/ month</span>
              </div>

              {isAnnual && (
                <span className="text-[10px] text-slate-500 font-semibold block leading-none">
                  Billed annually at <strong className="text-slate-850">$1,188/year</strong>
                </span>
              )}

              <hr className="border-slate-100" />

              <ul className="space-y-3.5 text-xs text-slate-650">
                {[
                  'Unlimited video inspection cards',
                  'Unlimited service advisor & mechanic seats',
                  '$0 SMS dispatch overhead',
                  'Full offline cache & auto-sync',
                  'Phone verbal approval logging',
                  'Premium theme toggles',
                  'First 14 days free (No card required)'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 font-semibold">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100">
              <Link
                href="/dashboard"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-blue-500/10 text-sm"
              >
                <span>Start Free Trial</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <span className="text-[10px] text-slate-450 block text-center mt-3 font-semibold">
                Instant setup. No credit card required.
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1 rounded-lg">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="text-base font-black tracking-tight text-white">ShopSnap</span>
          </div>

          <div className="text-center sm:text-right space-y-1">
            <p>&copy; {new Date().getFullYear()} ShopSnap Inc. All rights reserved.</p>
            <p className="text-[10px] text-slate-500">Supercharger Add-On for Legacy Shop Management Software.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
