import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { decode, DecodedRule } from '../utils/decoder';
import { RuleType } from '../types';

interface ScanSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyRule: (type: RuleType, text: string) => void;
}

interface PresetSign {
  id: string;
  title: string;
  rawText: string;
  badge: string;
  color: string;
}

const PRESET_SIGNS: PresetSign[] = [
  {
    id: 'test-1',
    title: '2 Hr Parking (Mon-Fri Ex Sun)',
    rawText: '2 HR PARKING 8AM-6PM MON-FRI EXCEPT SUN',
    badge: 'Standard Spec Test 1',
    color: 'border-blue-500 bg-blue-50/50',
  },
  {
    id: 'test-2',
    title: 'No Parking Rush Hours',
    rawText: 'NO PARKING 7-9AM 4-6PM MON-FRI',
    badge: 'Standard Spec Test 2 & 3',
    color: 'border-red-500 bg-red-50/50',
  },
  {
    id: 'test-3',
    title: 'Paid Meter Parking',
    rawText: 'PAY AT METER 1 HR LIMIT 9AM-6PM MON-SAT',
    badge: 'Meter Zone',
    color: 'border-amber-500 bg-amber-50/50',
  },
  {
    id: 'test-4',
    title: 'Resident Permit Parking',
    rawText: 'PERMIT HOLDERS ONLY 8AM-6PM MON-FRI',
    badge: 'Permit Only',
    color: 'border-purple-500 bg-purple-50/50',
  },
];

export const ScanSignModal: React.FC<ScanSignModalProps> = ({
  isOpen,
  onClose,
  onApplyRule,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'camera' | 'upload'>('presets');
  const [rawText, setRawText] = useState('2 HR PARKING 8AM-6PM MON-FRI EXCEPT SUN');
  const [isScanning, setIsScanning] = useState(false);
  const [decodedRule, setDecodedRule] = useState<DecodedRule | null>(null);
  const [simulatedTime, setSimulatedTime] = useState('10:00');
  const [simulatedDay, setSimulatedDay] = useState<'Monday' | 'Sunday' | 'Today'>('Monday');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compute test date based on simulated day & time
  const getSimulatedDate = (): Date => {
    const [hours, mins] = simulatedTime.split(':').map((n) => parseInt(n, 10));
    let d: Date;
    if (simulatedDay === 'Monday') {
      d = new Date('2026-10-26T12:00:00'); // Known Monday
    } else if (simulatedDay === 'Sunday') {
      d = new Date('2026-10-25T12:00:00'); // Known Sunday
    } else {
      d = new Date();
    }
    d.setHours(hours || 10, mins || 0, 0, 0);
    return d;
  };

  const runAnalysis = (textToAnalyze: string) => {
    setIsScanning(true);
    setTimeout(() => {
      const date = getSimulatedDate();
      const res = decode(textToAnalyze, date);
      setDecodedRule(res);
      setIsScanning(false);
    }, 600);
  };

  useEffect(() => {
    if (isOpen) {
      runAnalysis(rawText);
    }
  }, [isOpen, simulatedTime, simulatedDay]);

  const handleSelectPreset = (preset: PresetSign) => {
    setRawText(preset.rawText);
    runAnalysis(preset.rawText);
  };

  const handleApply = () => {
    if (!decodedRule) return;
    const ruleType: RuleType = decodedRule.kind === 'no' ? 'no' : 'paid';
    const textToFill = decodedRule.summary || rawText;
    onApplyRule(ruleType, textToFill);
    onClose();
  };

  // Camera handling
  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (_) {
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleCaptureFrame = () => {
    stopCamera();
    // Simulate captured OCR
    setRawText('NO PARKING 7-9AM 4-6PM MON-FRI');
    runAnalysis('NO PARKING 7-9AM 4-6PM MON-FRI');
    setActiveTab('presets');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate file reading and OCR extraction
      setIsScanning(true);
      setTimeout(() => {
        setRawText('2 HR PARKING 8AM-6PM MON-FRI EXCEPT SUN');
        runAnalysis('2 HR PARKING 8AM-6PM MON-FRI EXCEPT SUN');
        setIsScanning(false);
        setActiveTab('presets');
      }, 700);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-t-[24px] sm:rounded-[24px] shadow-2xl p-6 flex flex-col gap-4 animate-in slide-in-from-bottom duration-200 max-h-[92vh] overflow-y-auto border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: '#1F1FA8' }}
              className="w-8 h-8 rounded-lg text-white flex items-center justify-center shadow-sm"
            >
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-slate-900 leading-tight">
                Scan Parking Sign
              </h2>
              <p className="text-[11px] text-slate-500">
                AI Vision + Plain English Rule Decoder
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('presets');
            }}
            className={`py-1.5 rounded-lg transition-all ${
              activeTab === 'presets'
                ? 'bg-white text-[#0A4296] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sample Signs
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              startCamera();
            }}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'camera'
                ? 'bg-white text-[#0A4296] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera</span>
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('upload');
              fileInputRef.current?.click();
            }}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'upload'
                ? 'bg-white text-[#0A4296] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Photo</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Camera Live View */}
        {activeTab === 'camera' && (
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border-2 border-dashed border-slate-700">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-4 border-2 border-cyan-400 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                  <div className="w-full h-0.5 bg-cyan-400 shadow-[0_0_12px_#22d3ee] animate-bounce" />
                </div>
                <button
                  type="button"
                  onClick={handleCaptureFrame}
                  className="absolute bottom-3 px-5 py-2 rounded-full bg-white text-slate-900 font-bold text-xs shadow-lg flex items-center gap-2 hover:bg-slate-100"
                >
                  <ScanLine className="w-4 h-4 text-cyan-600" />
                  Capture &amp; OCR
                </button>
              </>
            ) : (
              <div className="text-center p-6 text-slate-400">
                <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Camera preview unavailable.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('presets')}
                  className="mt-3 text-xs text-blue-400 underline"
                >
                  Switch to Preset Signs
                </button>
              </div>
            )}
          </div>
        )}

        {/* Preset Signs Picker */}
        {activeTab === 'presets' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Select sign to scan:</span>
              <span className="text-[10px] text-slate-400">Click to run AI</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_SIGNS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-left p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    rawText === preset.rawText
                      ? 'border-[#1F1FA8] ring-2 ring-[#1F1FA8]/20 bg-blue-50/70'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-slate-600 border border-slate-200 mb-1">
                    {preset.badge}
                  </span>
                  <div className="font-bold text-slate-800 line-clamp-1">
                    {preset.title}
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 mt-1 truncate">
                    {preset.rawText}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Editable OCR Text Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Raw OCR Text Detected
          </label>
          <div className="relative">
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                runAnalysis(e.target.value);
              }}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono uppercase bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F1FA8]"
            />
            {isScanning && (
              <div className="absolute right-2 bottom-2 text-[10px] text-blue-600 font-semibold animate-pulse flex items-center gap-1">
                <Sparkles className="w-3 h-3 animate-spin" />
                Reading the sign...
              </div>
            )}
          </div>
        </div>

        {/* Simulation Controls for Day & Time verification */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Simulate Time:</span>
            <select
              value={simulatedTime}
              onChange={(e) => setSimulatedTime(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 font-bold text-slate-800 text-xs"
            >
              <option value="10:00">10:00 AM (Spec Test)</option>
              <option value="17:00">5:00 PM (17:00 Spec Test)</option>
              <option value="08:30">8:30 AM</option>
              <option value="20:00">8:00 PM</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Day:</span>
            <select
              value={simulatedDay}
              onChange={(e) => setSimulatedDay(e.target.value as any)}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 font-bold text-slate-800 text-xs"
            >
              <option value="Monday">Monday (Active Weekday)</option>
              <option value="Sunday">Sunday (Spec Exclusion)</option>
              <option value="Today">Today</option>
            </select>
          </div>
        </div>

        {/* Decoder Output Panel */}
        {decodedRule ? (
          <div className="p-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-slate-50 flex flex-col gap-3">
            {/* Verdict Badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Live Verdict
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-xs ${
                  decodedRule.active && decodedRule.kind === 'no'
                    ? 'bg-red-600 text-white'
                    : decodedRule.active
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {decodedRule.active && decodedRule.kind === 'no' ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                {decodedRule.verdict}
              </span>
            </div>

            {/* Plain English Summary */}
            <div>
              <div className="text-[11px] font-semibold text-slate-500 mb-1">
                Plain English Summary:
              </div>
              <div className="text-sm font-semibold text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200">
                {decodedRule.summary}
              </div>
            </div>

            {/* Parsed Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
              <div className="p-1.5 bg-white/70 rounded border border-slate-200">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Category</span>
                <span className="font-bold uppercase text-slate-800">
                  {decodedRule.kind}
                </span>
              </div>
              <div className="p-1.5 bg-white/70 rounded border border-slate-200">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Hours</span>
                <span className="font-medium text-slate-800 line-clamp-1">{decodedRule.times}</span>
              </div>
              <div className="p-1.5 bg-white/70 rounded border border-slate-200">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Days</span>
                <span className="font-medium text-slate-800 line-clamp-1">{decodedRule.days}</span>
              </div>
            </div>

            {/* CTA to Forward to AddRule Dialog */}
            <button
              type="button"
              onClick={handleApply}
              style={{ backgroundColor: '#1F1FA8' }}
              className="mt-1 w-full py-3 rounded-xl text-white font-bold text-sm shadow-md hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>Add to Map via Rule Dialog</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
            No valid rule recognized. Try selecting a preset sign above.
          </div>
        )}
      </div>
    </div>
  );
};
