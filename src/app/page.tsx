'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Wrench, 
  Check, 
  Play, 
  Smartphone, 
  Wifi, 
  UserCheck, 
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Settings
} from 'lucide-react';

export default function Home() {
  // Calculator States
  const [ticketCost, setTicketCost] = useState<number>(450);
  const [monthlyTickets, setMonthlyTickets] = useState<number>(120);
  const [currentApproval, setCurrentApproval] = useState<number>(45);

  // Pricing Toggle State
  const [isAnnual, setIsAnnual] = useState<boolean>(true);

  // ROI Calculations
  const newApproval = Math.min(90, currentApproval + 25);
  const currentRevenue = monthlyTickets * (currentApproval / 100) * ticketCost;
  const newRevenue = monthlyTickets * (newApproval / 100) * ticketCost;
  const monthlyUplift = newRevenue - currentRevenue;
  const annualUplift = monthlyUplift * 12;

  const currentPrice = isAnnual ? 99 : 129;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      
      {/* Navigation (sticky, safe-area top padding PWA notched screens) */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-100 px-6 pb-5 pt-safe bg-white/90 backdrop-blur-md flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="relative w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Settings className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-white">
              <Check className="w-2.5 h-2.5 stroke-[3.5]" />
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">ShopSnap</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How it works</a>
          <a href="#calculator" className="hover:text-slate-900 transition-colors">ROI Calculator</a>
          <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link 
            href="/login" 
            className="px-4 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-24 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side Header Text */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Send inspection videos to customers. <br />
            <span className="text-blue-600">Double your repair approvals.</span>
          </h1>

          <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
            A simple, lightweight add-on that works alongside your current shop software. Record videos of recommended repairs, and send them to your customers via native SMS. 
          </p>

          <p className="text-sm font-medium text-slate-500 max-w-xl">
            Works with Mitchell 1, Tekmetric, Shop-Ware, NAPA TRACS, and legacy systems. No complex integrations or double entry required.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href="/dashboard/new"
              className="w-full sm:w-auto h-12 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-sm"
            >
              <span>Start 14-day free trial</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#calculator"
              className="w-full sm:w-auto h-12 px-6 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 text-sm"
            >
              <span>Calculate your ROI</span>
            </a>
          </div>
        </div>

        {/* Right Side Visual Mockup (Light Theme Receipt / Quote Portal) */}
        <div className="lg:col-span-5 relative w-full max-w-md mx-auto">
          {/* Floating Customer Portal Receipt Mock */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-5 space-y-4">
            
            {/* Top Bar Indicator */}
            <div className="bg-slate-900 text-white py-1.5 px-3 rounded-md text-center text-[9px] font-bold tracking-widest flex items-center justify-center gap-1 uppercase select-none">
              <ShieldCheck className="w-3 h-3 text-blue-400" /> SECURE VEHICLE TRANSACTION PORTAL
            </div>

            {/* Header info */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wide">Inspection Report</span>
                <h3 className="text-sm font-bold text-slate-800">2018 Ford F-150</h3>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-mono font-bold px-2 py-0.5 rounded">ID: 21C64B</span>
            </div>

            {/* Video Player Mock */}
            <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-sm flex items-center justify-center text-white">
              {/* Simulated Poster image */}
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center">
                <Play className="w-10 h-10 text-white fill-white/10 p-2.5 rounded-full bg-blue-600 shadow-lg mb-1" />
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Inspection Clip (0:10)</span>
              </div>
            </div>

            {/* Line items checklist */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/40 space-y-2">
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
              <div className="h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 flex items-center justify-between text-xs italic font-serif text-slate-700">
                <span>A. Customer (Digital Sign)</span>
                <span className="text-[9px] font-sans font-bold not-italic bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                  SIGNED DIGITAL AUTH
                </span>
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* ROI Revenue Calculator Section */}
      <section id="calculator" className="py-20 px-6 max-w-7xl mx-auto space-y-12 bg-slate-50 border-y border-slate-100">
        <div className="text-center max-w-xl mx-auto space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Calculate your shop's monthly uplift
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Drag the sliders to match your current shop metrics and see how much hidden revenue ShopSnap can unlock.
          </p>
        </div>

        {/* Calculator Widget Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
          
          {/* Sliders Box */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 flex flex-col justify-center">
            
            {/* Input Slider 1: Average Cost */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Average Repair Order (RO) Cost</label>
                <span className="text-lg font-bold text-slate-900">${ticketCost}</span>
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
                <span className="text-lg font-bold text-slate-900">{monthlyTickets}</span>
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
                <span className="text-lg font-bold text-slate-900">{currentApproval}%</span>
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
          <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-lg">
            <div className="space-y-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                PROJECTED ESTIMATE
              </span>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 block uppercase font-bold tracking-wider">New Monthly Revenue</span>
                <div className="text-4xl font-extrabold tracking-tight leading-none text-white">
                  ${newRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Assumes approval rate grows to <strong className="text-white">{newApproval}%</strong> (+25% increase)
                </span>
              </div>

              <div className="h-px bg-slate-800 w-full" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-450 block uppercase font-bold tracking-wider">Monthly Increase</span>
                  <span className="text-xl font-bold">${monthlyUplift.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-450 block uppercase font-bold tracking-wider">Annual Increase</span>
                  <span className="text-xl font-bold text-emerald-400">${annualUplift.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-6 mt-6 flex items-center justify-between text-xs">
              <div className="space-y-0.5 text-slate-400">
                <span>Software Cost:</span>
                <span className="font-bold text-sm text-white block">${currentPrice}/mo</span>
              </div>
              <div className="text-right font-bold text-emerald-450">
                {Math.round(monthlyUplift / currentPrice)}x Monthly ROI
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="max-w-xl space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            How it works
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            No complex CRM integration or software imports required. Keep using your existing invoice systems.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { 
              step: '01', 
              title: 'Queue the Vehicle', 
              desc: 'Service advisors enter the vehicle details from their desk to create a pending card in the bay queue.'
            },
            { 
              step: '02', 
              title: 'Record the issue', 
              desc: 'The mechanic opens the queue item, records a quick video of the issue, and types the estimate.'
            },
            { 
              step: '03', 
              title: 'Send via native SMS', 
              desc: 'Tapping send opens the device native messages app with the customer phone and quote link prefilled. Cost = $0.00.'
            },
            { 
              step: '04', 
              title: 'Get instant approval', 
              desc: 'The customer clicks the link, streams the video, signs the authorization block, and your dashboard updates.'
            }
          ].map((card) => (
            <div key={card.step} className="space-y-3 text-left">
              <span className="text-4xl font-extrabold text-blue-600 block">{card.step}</span>
              <h3 className="text-base font-bold text-slate-900">{card.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto space-y-12 border-t border-slate-100">
        <div className="max-w-xl space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Built for the shop floor
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Heavy software and bad internet shouldn't slow down shop operations.
          </p>
        </div>

        {/* Features Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: 'No messaging costs',
              desc: 'ShopSnap utilizes native device messaging templates to route texts. This bypasses costly Twilio billings and strict A2P 10DLC carrier registrations.',
              icon: <Smartphone className="w-5 h-5 text-slate-700" />
            },
            {
              title: 'Offline queue support',
              desc: 'Mechanics working in bays with dead Wi-Fi zones can still save inspections. The PWA caches files locally and uploads them once connection is restored.',
              icon: <Wifi className="w-5 h-5 text-slate-700" />
            },
            {
              title: 'Audited phone authorizations',
              desc: 'If a client authorizes repairs verbally over the phone, advisors can log it manually with a mandatory name stamp to build a secure paper trail.',
              icon: <UserCheck className="w-5 h-5 text-slate-700" />
            },
            {
              title: 'Camera roll support',
              desc: 'Mechanics can take a video immediately inside the application, or select pre-recorded videos and photos directly from their device’s camera roll.',
              icon: <Play className="w-5 h-5 text-slate-700" />
            },
            {
              title: 'Installable app speeds',
              desc: 'Save ShopSnap directly to an iPad, iPhone, or Android home screen. Runs as a standalone app with fast navigation and offline storage accessibility.',
              icon: <Wrench className="w-5 h-5 text-slate-700" />
            },
            {
              title: 'High-contrast theme toggles',
              desc: 'The advisor and mechanic views default to smudge-resistant dark mode, but switch easily to high-contrast light mode for outdoor service bays.',
              icon: <Wrench className="w-5 h-5 text-slate-700" />
            }
          ].map((feat, idx) => (
            <div key={idx} className="space-y-2">
              <div className="mb-2">
                {feat.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900">{feat.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-slate-50 border-t border-slate-200/60 py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              One flat plan. Unlimited usage.
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              No hidden fees, no seat caps, and no per-text surcharges. Try risk-free for 14 days.
            </p>

            {/* Toggle Button Group */}
            <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-lg mt-4 shadow-xs">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${
                  !isAnnual ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-all flex items-center gap-1 ${
                  isAnnual ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                <span>Annually</span>
                <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded">
                  SAVE 23%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm mx-auto shadow-lg overflow-hidden flex flex-col justify-between">
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">Pro Shop Plan</h3>
                <p className="text-xs text-slate-500">Perfect for single locations with up to 10 service bays.</p>
              </div>

              <div className="flex items-baseline gap-1 text-slate-900">
                <span className="text-5xl font-black tracking-tight">${isAnnual ? 99 : 129}</span>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">/ month</span>
              </div>

              {isAnnual && (
                <span className="text-[10px] text-slate-500 font-semibold block leading-none">
                  Billed annually at $1,188/year
                </span>
              )}

              <hr className="border-slate-100" />

              <ul className="space-y-3.5 text-xs text-slate-600">
                {[
                  'Unlimited video inspections',
                  'Unlimited seats (mechanics & advisors)',
                  '$0 SMS dispatch overhead',
                  'Offline local sync queue',
                  'Phone verbal approval logging',
                  'Advisor portal access',
                  '14-day free trial (no card required)'
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
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-blue-500/10 text-sm"
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
      <footer className="bg-slate-900 text-white py-12 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <span className="text-base font-bold tracking-tight text-white">ShopSnap</span>
          <div className="text-center sm:text-right space-y-1">
            <p>&copy; {new Date().getFullYear()} ShopSnap Inc. All rights reserved.</p>
            <p className="text-[10px] text-slate-500">Supercharger Add-On for Legacy Shop Management Software.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
