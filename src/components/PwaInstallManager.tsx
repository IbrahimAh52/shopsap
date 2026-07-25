'use client';

import React, { useState, useEffect } from 'react';
import { 
  Download, 
  CheckCircle, 
  Share2, 
  PlusSquare, 
  Smartphone, 
  X,
  Info,
  ChevronRight
} from 'lucide-react';

export default function PwaInstallManager() {
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosModal, setShowIosModal] = useState<boolean>(false);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running as standalone app
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(isStandaloneMode);

      if (isStandaloneMode) {
        // Show auto-dismissing notification if opened as standalone app
        const hasNotified = sessionStorage.getItem('shopsnap_pwa_notified');
        if (!hasNotified) {
          setNotificationMsg('ShopSnap App is Installed & Running in Native Mode!');
          setShowNotification(true);
          sessionStorage.setItem('shopsnap_pwa_notified', 'true');
          setTimeout(() => setShowNotification(false), 5000);
        }
      }
    };

    checkStandalone();

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(iosDevice);

    // Listen for Android/Chrome beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setNotificationMsg('🎉 ShopSnap App successfully installed on your home screen!');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 6000);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback for Android/Desktop browsers if prompt isn't fired
      setShowIosModal(true);
    }
  };

  return (
    <>
      {/* Installed Standalone Notification Toast */}
      {showNotification && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-top-5 duration-300">
          <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-400/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-200 shrink-0" />
              <p className="text-xs font-bold leading-tight">{notificationMsg}</p>
            </div>
            <button 
              onClick={() => setShowNotification(false)}
              className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS & Mobile PWA Instructions Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm border border-gray-200 dark:border-gray-800 p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 text-gray-900 dark:text-gray-100">
            <div className="flex items-center justify-between border-b pb-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-500" />
                <h3 className="font-extrabold text-base">Install ShopSnap App</h3>
              </div>
              <button
                onClick={() => setShowIosModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              Follow these simple steps to install ShopSnap directly onto your home screen for 1-tap offline access:
            </p>

            <div className="space-y-3 text-xs">
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    Tap the Share Button <Share2 className="w-3.5 h-3.5 text-blue-500 inline" />
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {isIos ? 'Located at the bottom of Safari on iPhone.' : 'Tap the 3 dots or share menu in your browser.'}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    Select &ldquo;Add to Home Screen&rdquo; <PlusSquare className="w-3.5 h-3.5 text-blue-500 inline" />
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Scroll down the menu list and tap &ldquo;Add to Home Screen&rdquo;.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    Tap &ldquo;Add&rdquo; in Top Right
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    ShopSnap will instantly appear on your home screen like a native app!
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Exportable settings widget component for the Settings Modal
export function PwaStatusWidget({ isDark }: { isDark: boolean }) {
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;
    
    setIsStandalone(isStandaloneMode);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleTriggerInstall = async () => {
    if (isIos || !deferredPrompt) {
      setShowIosGuide(!showIosGuide);
    } else if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <div className="space-y-2">
      <label className={`block text-[10px] font-bold uppercase tracking-wider ${
        isDark ? 'text-gray-400' : 'text-gray-500'
      }`}>
        App Installation & PWA Status
      </label>

      {isStandalone ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>ShopSnap App Installed & Ready (Native Mode)</span>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleTriggerInstall}
            className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isIos ? 'How to Install on iPhone' : 'Install ShopSnap App'}</span>
          </button>

          {showIosGuide && (
            <div className={`p-3 rounded-xl border text-xs space-y-2 animate-in fade-in duration-150 ${
              isDark ? 'bg-gray-950/60 border-gray-800 text-gray-300' : 'bg-blue-50/60 border-blue-200 text-blue-900'
            }`}>
              <p className="font-extrabold flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                iPhone / Android Installation Guide:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-600 dark:text-gray-400">
                <li>Tap <strong>Share</strong> (or 3-dots menu) in Safari/Chrome</li>
                <li>Tap <strong>&ldquo;Add to Home Screen&rdquo;</strong></li>
                <li>Tap <strong>&ldquo;Add&rdquo;</strong> in the top right corner</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
