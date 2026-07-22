'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Loader2, 
  Database, 
  AlertCircle, 
  CheckCircle,
  Eye,
  EyeOff,
  Settings,
  Check
} from 'lucide-react';
import { auth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  
  // Tab/Screen state
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  
  // Form states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  
  // UI states
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSupabase, setIsSupabase] = useState<boolean>(false);

  useEffect(() => {
    setIsSupabase(auth.isSupabase);
    
    // Check if already logged in, redirect to dashboard
    auth.getCurrentUser().then((user) => {
      if (user) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        await auth.signUp(email, password, name);
        setSuccessMsg('Account created successfully! Redirecting...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        await auth.login(email, password);
        setSuccessMsg('Signed in successfully! Loading portal...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1200);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col justify-between font-sans selection:bg-blue-100 selection:text-blue-900 text-slate-800 relative overflow-hidden">
      
      {/* Decorative Subtle Light Blur Blobs (Matching Hero) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-blue-50/50 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-indigo-50/50 blur-[100px] pointer-events-none" />

      {/* Header (Same height and style as landing page, safe-area top padding, sticky for mobile friendly layout) */}
      <header className="sticky top-0 z-40 w-full px-6 pb-5 pt-safe flex items-center justify-between border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="relative w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Settings className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-white">
              <Check className="w-2.5 h-2.5 stroke-[3.5]" />
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">ShopSnap</span>
        </Link>
      </header>

      {/* Main card section */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          
          {/* Form Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isSignUp ? 'Create Advisor Account' : 'Advisor Portal'}
            </h1>
            <p className="text-xs text-slate-500">
              {isSignUp 
                ? 'Sign up to start sending inspection videos to clients' 
                : 'Enter your credentials to access the shop dashboard'
              }
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {isSignUp && (
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm text-slate-800 placeholder-slate-400"
                    required={isSignUp}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm text-slate-800 placeholder-slate-400"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 rounded-xl border bg-white border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-sm text-slate-800 placeholder-slate-400 font-sans"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Notifications */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Button (Matching style of landing page CTA buttons) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Auth...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          {/* Toggle Screen */}
          <div className="border-t border-slate-100 pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {isSignUp 
                ? 'Already have an advisor account? Sign In' 
                : 'Need a shop account? Create Advisor Account'
              }
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[10px] text-slate-400 bg-white/60 border-t border-slate-100 z-10">
        &copy; {new Date().getFullYear()} ShopSnap Inc. All rights reserved. Secure Portal.
      </footer>

    </div>
  );
}
