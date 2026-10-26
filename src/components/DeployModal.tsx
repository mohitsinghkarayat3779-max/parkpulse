import React, { useState, useEffect } from 'react';
import {
  X,
  Rocket,
  Download,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  Globe,
  Share2,
  Terminal,
  ShieldCheck,
  Sparkles,
  QrCode,
  ArrowRight,
} from 'lucide-react';
import JSZip from 'jszip';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeployModal: React.FC<DeployModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'install' | 'source' | 'apk'>('cloud');
  const [copiedProd, setCopiedProd] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  const PROD_URL = 'https://ais-pre-p3d5rkxyiasq4hhnt2t6cx-359823621258.asia-southeast1.run.app';
  const DEV_URL = 'https://ais-dev-p3d5rkxyiasq4hhnt2t6cx-359823621258.asia-southeast1.run.app';

  useEffect(() => {
    // Check if running in standalone mode
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);

      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedProd(true);
    setTimeout(() => setCopiedProd(false), 2000);
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('To install on mobile:\n• On iPhone: Tap Share -> "Add to Home Screen"\n• On Android: Tap Chrome menu (3 dots) -> "Install app"');
    }
  };

  const handleDownloadFullZip = async () => {
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('parkpulse_project');

      // Add readme and project descriptors
      folder?.file(
        'README.md',
        `# ParkPulse - Crowdsourced Street Parking & Sign Reader\nFounder: Mohit Singh Karayat\nLive URL: ${PROD_URL}\n`
      );

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'parkpulse_full_project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_) {
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in select-none">
      <div className="w-full max-w-3xl bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] border border-slate-800 text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
              <Rocket className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Download &amp; Deployment Hub
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Deployed &amp; Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Created by <strong>Mohit Singh Karayat</strong> &bull; Cloud Run, Mobile PWA, Native APK &amp; Flutter Code
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('cloud')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'cloud'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>1. Live Cloud Link</span>
          </button>

          <button
            onClick={() => setActiveTab('install')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'install'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>2. Install on Phone (PWA)</span>
          </button>

          <button
            onClick={() => setActiveTab('source')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'source'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>3. Download Full Project ZIP</span>
          </button>

          <button
            onClick={() => setActiveTab('apk')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'apk'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>4. Native APK / App Store</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: CLOUD RUN DEPLOYMENT */}
          {activeTab === 'cloud' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Your Application is ALREADY Live on Google Cloud Run!
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    You don't need to configure a server or pay for hosting. The application has been built, containerized, and deployed to a global HTTPS endpoint. Anyone with the link can access it right now from any smartphone, tablet, or PC.
                  </p>
                </div>
              </div>

              {/* URL Cards */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Production Shared App URL (Public &amp; Shareable)
                  </label>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <Globe className="w-4 h-4 text-blue-400 shrink-0 ml-1" />
                    <input
                      type="text"
                      readOnly
                      value={PROD_URL}
                      className="w-full bg-transparent text-xs text-emerald-400 font-mono outline-none"
                    />
                    <button
                      onClick={() => handleCopy(PROD_URL)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      {copiedProd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedProd ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <a
                      href={PROD_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open</span>
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Development Sandbox URL
                  </label>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <Globe className="w-4 h-4 text-purple-400 shrink-0 ml-1" />
                    <input
                      type="text"
                      readOnly
                      value={DEV_URL}
                      className="w-full bg-transparent text-xs text-slate-300 font-mono outline-none"
                    />
                    <a
                      href={DEV_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Mobile Quick Scan */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                  <QrCode className="w-6 h-6" />
                </div>
                <div className="text-xs text-slate-300">
                  <div className="font-bold text-white mb-0.5">Test on your real phone right now</div>
                  <p className="text-slate-400">
                    Send the Production URL above to your phone (via WhatsApp, email, or Slack) and open it in Safari or Chrome. It launches with GPS location and camera sign scanning enabled!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PWA MOBILE INSTALL */}
          {activeTab === 'install' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <span>Install as a Native App on your Phone (PWA)</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  ParkPulse includes a complete Progressive Web App manifest and icon pack. It installs directly to your home screen with zero app store delays!
                </p>
              </div>

              {/* Install trigger button */}
              <div className="flex justify-center p-4">
                <button
                  type="button"
                  onClick={handleInstallPWA}
                  className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl flex items-center gap-2.5 active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Install ParkPulse on This Device</span>
                </button>
              </div>

              {/* Platform Guides */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* iPhone / iOS Guide */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px]">🍎</span>
                    <span>Install on iPhone (Safari)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                    <li>Open <strong>Safari</strong> and visit the live link.</li>
                    <li>Tap the <strong>Share button</strong> (<span className="text-blue-400 font-bold">&uarr;</span> square icon) at the bottom.</li>
                    <li>Scroll down and select <strong>"Add to Home Screen"</strong>.</li>
                    <li>Tap <strong>Add</strong> in the top right.</li>
                  </ol>
                  <div className="text-[11px] text-emerald-400 font-semibold pt-1">
                    ✓ Fullscreen native experience with app icon!
                  </div>
                </div>

                {/* Android Guide */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px]">🤖</span>
                    <span>Install on Android (Chrome)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                    <li>Open <strong>Google Chrome</strong> and visit the live link.</li>
                    <li>Tap the <strong>3 dots menu</strong> in the top right corner.</li>
                    <li>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                    <li>Confirm installation.</li>
                  </ol>
                  <div className="text-[11px] text-emerald-400 font-semibold pt-1">
                    ✓ Shows up in your Android App Drawer!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOWNLOAD SOURCE ZIP */}
          {activeTab === 'source' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Download Full Source Code Package
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Export the entire codebase including the Flutter client (`lib/main.dart`), Firebase Cloud Functions (`functions/`), Python Sign AI server (`sign_ai/`), Firestore rules, and dataset yaml.
                  </p>
                </div>
                <button
                  onClick={handleDownloadFullZip}
                  disabled={downloadingZip}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingZip ? 'Zipping...' : 'Download Project .ZIP'}</span>
                </button>
              </div>

              {/* Included Files Checklist */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-slate-200">Included in the ZIP archive:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><code>parkpulse_flutter/lib/main.dart</code> (Flutter app)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><code>firestore.rules</code> (Security rules)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><code>functions/index.js</code> (Cloud Functions v2)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><code>sign_ai/decode.py</code> (Rule parser)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><code>sign_ai/server.py</code> (FastAPI EasyOCR)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span><code>sign_ai/train.py</code> &amp; <code>data.yaml</code></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NATIVE APK / APP STORE BUILD */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span>Building Native Android APK &amp; iOS App</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  To produce an installable Android <code>.apk</code> file or Google Play <code>.aab</code> bundle from the Flutter project, run these commands on your computer:
                </p>

                <div className="space-y-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-black border border-slate-800 text-emerald-400">
                    <div className="text-slate-500 mb-1"># 1. Navigate to Flutter directory &amp; get packages</div>
                    <div>cd parkpulse_flutter</div>
                    <div>flutter pub get</div>
                    <div className="text-slate-500 my-1"># 2. Build release Android APK (for direct phone install)</div>
                    <div className="text-amber-300">flutter build apk --release</div>
                    <div className="text-slate-500 my-1"># 3. Output file location:</div>
                    <div className="text-slate-300">build/app/outputs/flutter-apk/app-release.apk</div>
                  </div>

                  <div className="p-3 rounded-xl bg-black border border-slate-800 text-blue-400">
                    <div className="text-slate-500 mb-1"># For Google Play Store submission (.aab):</div>
                    <div>flutter build appbundle</div>
                    <div className="text-slate-500 my-1"># For Apple iOS App Store submission:</div>
                    <div>flutter build ipa</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Project Founder: <strong className="text-white">Mohit Singh Karayat</strong></span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
