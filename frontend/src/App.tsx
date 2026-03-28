/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Accessibility, 
  Eye, 
  Baby, 
  Search as SearchIcon, 
  MapPin, 
  Mic, 
  Navigation, 
  Info, 
  ChevronRight,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Zap,
  Volume2,
  Camera,
  Settings as SettingsIcon
} from 'lucide-react';
import { PROFILES } from './constants';
import { AccessibilityProfile, RouteOption, Profile, RouteSegment } from './types';

// --- Components ---

const GeminiGlow = ({ theme }: { theme: string }) => (
  <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <motion.div 
      animate={{ 
        scale: [1, 1.4, 1],
        rotate: [0, 180, 0],
        x: [0, 100, 0],
        y: [0, 50, 0]
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      className={`absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full opacity-30 blur-[150px] ${
        theme === 'default' ? 'bg-gemini-blue' : theme === 'warm' ? 'bg-gemini-orange' : 'bg-gemini-purple'
      }`} 
    />
    <motion.div 
      animate={{ 
        scale: [1.4, 1, 1.4],
        rotate: [0, -180, 0],
        x: [0, -100, 0],
        y: [0, -50, 0]
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      className={`absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full opacity-30 blur-[150px] ${
        theme === 'default' ? 'bg-gemini-purple' : theme === 'warm' ? 'bg-gemini-pink' : 'bg-gemini-blue'
      }`} 
    />
    <motion.div 
      animate={{ 
        opacity: [0.1, 0.3, 0.1],
        scale: [0.8, 1.2, 0.8]
      }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] rounded-full bg-white/5 blur-[200px]"
    />
  </div>
);

const VoiceOverlay = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md text-white p-6"
      >
        <button 
          onClick={onClose}
          className="absolute top-12 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md text-center">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-32 h-32 rounded-full gemini-gradient flex items-center justify-center shadow-[0_0_50px_rgba(66,133,244,0.5)] mb-12"
          >
            <Mic className="w-12 h-12 text-white" />
          </motion.div>
          
          <h2 className="text-3xl font-semibold mb-4">Listening...</h2>
          <p className="text-slate-300 text-lg">"Why is the crossing near the library flagged?"</p>
          
          <div className="mt-12 flex gap-4">
            <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <Camera className="w-6 h-6" />
            </button>
            <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <Volume2 className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="w-full max-w-md h-24 flex items-center justify-center gap-1">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ height: [10, Math.random() * 60 + 10, 10] }}
              transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
              className="w-1 bg-gemini-blue rounded-full"
            />
          ))}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// --- Screens ---

const Onboarding = ({ 
  onComplete, 
  onOpenSettings,
  language 
}: { 
  onComplete: (profile: AccessibilityProfile) => void; 
  onOpenSettings: () => void;
  language: string;
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="flex flex-col h-full p-6 pt-20"
    >
      <div className="flex justify-between items-start mb-12">
        <div className="flex-1">
          <motion.h1 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="text-4xl font-bold tracking-tight mb-4"
          >
            Welcome to <span className="text-gemini-blue">PathCorrect</span>
          </motion.h1>
          <motion.p 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 text-lg"
          >
            Choose your accessibility profile to personalize your routes.
          </motion.p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <LanguageBadge language={language} />
          <button 
            onClick={onOpenSettings}
            className="p-3 rounded-full glass-panel hover:bg-white transition-colors shadow-sm"
          >
            <SettingsIcon className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {PROFILES.map((profile, index) => (
          <motion.button
            key={profile.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.9)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onComplete(profile.id)}
            className="w-full glass-panel p-6 rounded-3xl flex items-center gap-6 text-left hover:border-gemini-blue/50 transition-all group"
          >
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${profile.color} flex items-center justify-center text-white shadow-lg group-hover:shadow-gemini-blue/20`}>
              {profile.id === 'wheelchair' && <Accessibility className="w-8 h-8" />}
              {profile.id === 'low-vision' && <Eye className="w-8 h-8" />}
              {profile.id === 'stroller' && <Baby className="w-8 h-8" />}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-1">{profile.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{profile.description}</p>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-gemini-blue transition-colors" />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

const Search = ({ profile, onSearch }: { profile: AccessibilityProfile; onSearch: (from: string, to: string) => void }) => {
  const [from, setFrom] = useState('Current Location');
  const [to, setTo] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full p-6 pt-16"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${PROFILES.find(p => p.id === profile)?.color} text-white shadow-lg`}>
            {profile === 'wheelchair' && <Accessibility className="w-5 h-5" />}
            {profile === 'low-vision' && <Eye className="w-5 h-5" />}
            {profile === 'stroller' && <Baby className="w-5 h-5" />}
          </div>
          <h2 className="text-xl font-semibold">Where are you going?</h2>
        </div>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-6 rounded-3xl space-y-6 relative overflow-hidden"
      >
        <div className="absolute left-9 top-[3.5rem] bottom-[3.5rem] w-0.5 bg-slate-200 border-dashed border-l" />
        
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 rounded-full bg-gemini-blue/20 flex items-center justify-center z-10">
            <motion.div 
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="w-2 h-2 rounded-full bg-gemini-blue" 
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 block">Start</label>
            <input 
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full bg-transparent text-lg font-medium focus:outline-none"
              placeholder="Enter starting point"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-6 h-6 rounded-full bg-gemini-pink/20 flex items-center justify-center z-10">
            <MapPin className="w-3 h-3 text-gemini-pink" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 block">Destination</label>
            <input 
              value={to}
              onChange={(e) => setTo(e.target.value)}
              autoFocus
              className="w-full bg-transparent text-lg font-medium focus:outline-none"
              placeholder="Enter destination"
            />
          </div>
        </div>
      </motion.div>

      <div className="mt-8 space-y-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest px-2">Recent Trips</h3>
        {['Central Library', 'Grand Station', 'City Park'].map((place, i) => (
          <motion.button 
            key={place}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            onClick={() => setTo(place)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/50 transition-colors text-left"
          >
            <Clock className="w-5 h-5 text-slate-300" />
            <span className="text-slate-600 font-medium">{place}</span>
          </motion.button>
        ))}
      </div>

      <div className="mt-auto pb-8">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSearch(from, to)}
          disabled={!to}
          className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${
            to ? 'gemini-gradient text-white shadow-gemini-blue/30' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Navigation className="w-6 h-6" />
          Find Routes
        </motion.button>
      </div>
    </motion.div>
  );
};

const SegmentDetailPanel = ({ segment, onClose }: { segment: RouteSegment; onClose: () => void }) => (
  <motion.div 
    initial={{ y: "100%" }}
    animate={{ y: 0 }}
    exit={{ y: "100%" }}
    transition={{ type: "spring", damping: 25, stiffness: 200 }}
    className="fixed inset-x-0 bottom-0 z-50 glass-panel rounded-t-[40px] p-6 pb-12 shadow-2xl"
  >
    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
    
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
          segment.type === 'danger' ? 'bg-gemini-pink' : 'bg-gemini-orange'
        }`}>
          <Info className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">{segment.locationName || 'Obstacle Detail'}</h3>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
            {segment.frictionScore}% Friction • {segment.confidence}% Confidence
          </p>
        </div>
      </div>
      <button 
        onClick={onClose}
        className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 rotate-270" />
      </button>
    </div>

    <div className="space-y-6">
      <div className="rounded-3xl overflow-hidden relative aspect-video bg-slate-100 border border-slate-200">
        {segment.streetViewUrl ? (
          <img 
            src={segment.streetViewUrl} 
            alt="Street View" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            <Camera className="w-12 h-12 opacity-20" />
          </div>
        )}
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gemini-blue animate-pulse" />
          Street View Analysis
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
        <p className="text-slate-700 leading-relaxed italic">
          "{segment.explanation}"
        </p>
      </div>

      <div className="flex gap-4">
        <button className="flex-1 py-4 rounded-2xl bg-white border border-slate-200 font-bold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
          <Volume2 className="w-5 h-5" />
          Listen
        </button>
        <button className="flex-1 py-4 rounded-2xl gemini-gradient text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-gemini-blue/20">
          <Navigation className="w-5 h-5" />
          Go Here
        </button>
      </div>
    </div>
  </motion.div>
);

const Results = ({ profile, onBack, theme }: { profile: AccessibilityProfile; onBack: () => void; theme: string }) => {
  const [selectedRoute, setSelectedRoute] = useState<string>('lowest');
  const [selectedSegment, setSelectedSegment] = useState<RouteSegment | null>(null);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const themeColors: Record<string, string> = {
    default: '#4285f4', // gemini-blue
    warm: '#f4af40',    // gemini-orange
    deep: '#9b72cb'     // gemini-purple
  };

  const activeColor = themeColors[theme] || themeColors.default;

  const routes: RouteOption[] = [
    {
      id: 'fastest',
      name: 'Fastest',
      duration: '12 min',
      distance: '1.2 km',
      frictionScore: 45,
      type: 'fastest',
      segments: [
        {
          id: 's1',
          frictionScore: 75,
          confidence: 88,
          explanation: "Steep gradient detected on the curb cut at this junction. May be difficult for manual wheelchairs.",
          type: 'danger',
          coordinates: [[150, 200]],
          locationName: "Grand St & 4th Ave",
          streetViewUrl: "https://picsum.photos/seed/curb/800/450"
        }
      ]
    },
    {
      id: 'lowest',
      name: 'Lowest Friction',
      duration: '18 min',
      distance: '1.5 km',
      frictionScore: 12,
      type: 'lowest-friction',
      segments: [
        {
          id: 's2',
          frictionScore: 30,
          confidence: 95,
          explanation: "Minor pavement unevenness due to tree roots. Proceed with caution.",
          type: 'caution',
          coordinates: [[100, 400]],
          locationName: "Parkside Walkway",
          streetViewUrl: "https://picsum.photos/seed/pavement/800/450"
        }
      ]
    },
    {
      id: 'balanced',
      name: 'Best Balance',
      duration: '15 min',
      distance: '1.3 km',
      frictionScore: 28,
      type: 'balanced',
      segments: []
    }
  ];

  const currentRoute = routes.find(r => r.id === selectedRoute);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full relative"
    >
      {/* Mock Map */}
      <div className="flex-1 bg-slate-200 relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 mix-blend-multiply">
          <svg width="100%" height="100%" viewBox="0 0 400 800">
            <path d="M50 100 L150 200 L100 400 L300 600" fill="none" stroke="#94a3b8" strokeWidth="20" />
            <path d="M50 100 L250 150 L350 400 L300 600" fill="none" stroke="#94a3b8" strokeWidth="20" />
            
            {/* Active Route Glow Layers */}
            {/* Soft Outer Glow */}
            <motion.path 
              initial={{ pathLength: 0 }}
              animate={{ 
                pathLength: 1,
                opacity: [0.1, 0.3, 0.1],
                strokeWidth: [24, 30, 24]
              }}
              transition={{ 
                pathLength: { duration: 2, ease: "easeInOut" },
                opacity: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                strokeWidth: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
              d="M50 100 L150 200 L100 400 L300 600" 
              fill="none" 
              stroke={activeColor}
              strokeWidth="24" 
              className="blur-2xl"
            />
            
            {/* Medium Glow */}
            <motion.path 
              initial={{ pathLength: 0 }}
              animate={{ 
                pathLength: 1,
                opacity: [0.3, 0.6, 0.3],
                strokeWidth: [12, 16, 12]
              }}
              transition={{ 
                pathLength: { duration: 2, ease: "easeInOut" },
                opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                strokeWidth: { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }}
              d="M50 100 L150 200 L100 400 L300 600" 
              fill="none" 
              stroke={activeColor}
              strokeWidth="12" 
              className="blur-md"
            />

            {/* Core Line */}
            <motion.path 
              initial={{ pathLength: 0 }}
              animate={{ 
                pathLength: 1,
                strokeWidth: [6, 8, 6]
              }}
              transition={{ 
                pathLength: { duration: 2, ease: "easeInOut" },
                strokeWidth: { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }}
              d="M50 100 L150 200 L100 400 L300 600" 
              fill="none" 
              stroke={activeColor}
              strokeWidth="6" 
              className="route-line-glow"
            />
          </svg>
        </div>

            {/* Friction Points */}
        <div className="absolute inset-0 pointer-events-none">
          {routes.flatMap(r => r.segments).map(segment => (
            <motion.button
              key={segment.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.2 }}
              onClick={() => setSelectedSegment(segment)}
              className="absolute pointer-events-auto"
              style={{ 
                left: `${segment.coordinates[0][0]}px`, 
                top: `${segment.coordinates[0][1]}px`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {/* Ripple Effect */}
              <motion.div 
                animate={{ 
                  scale: [1, 2.5],
                  opacity: [0.5, 0]
                }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                className={`absolute inset-0 rounded-full ${
                  segment.type === 'danger' ? 'bg-gemini-pink' : 'bg-gemini-orange'
                }`}
              />

              <motion.div 
                animate={{ 
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    `0 0 0px ${segment.type === 'danger' ? 'rgba(217, 101, 112, 0)' : 'rgba(244, 175, 64, 0)'}`,
                    `0 0 25px ${segment.type === 'danger' ? 'rgba(217, 101, 112, 0.8)' : 'rgba(244, 175, 64, 0.8)'}`,
                    `0 0 0px ${segment.type === 'danger' ? 'rgba(217, 101, 112, 0)' : 'rgba(244, 175, 64, 0)'}`
                  ]
                }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg relative z-10 ${
                  segment.type === 'danger' ? 'bg-gemini-pink' : 'bg-gemini-orange'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-white" />
              </motion.div>
            </motion.button>
          ))}
        </div>

        <button 
          onClick={onBack}
          className="absolute top-12 left-6 p-3 rounded-full glass-panel hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="absolute top-12 right-6 flex flex-col gap-3">
          <button className="p-3 rounded-full glass-panel hover:bg-white transition-colors shadow-lg">
            <Volume2 className="w-6 h-6 text-gemini-blue" />
          </button>
        </div>
      </div>

      {/* Route Cards */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="glass-panel rounded-t-[40px] p-6 pb-12 -mt-10 z-10"
      >
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
        
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {routes.map((route) => (
            <motion.button
              key={route.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedRoute(route.id)}
              className={`min-w-[160px] p-5 rounded-3xl border-2 transition-all text-left ${
                selectedRoute === route.id 
                ? 'border-gemini-blue bg-gemini-blue/5 shadow-lg shadow-gemini-blue/10' 
                : 'border-transparent bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                {route.type === 'fastest' && <Zap className="w-5 h-5 text-gemini-orange" />}
                {route.type === 'lowest-friction' && <ShieldCheck className="w-5 h-5 text-emerald-500" />}
                {route.type === 'balanced' && <Zap className="w-5 h-5 text-gemini-purple" />}
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                  {route.frictionScore}% Friction
                </span>
              </div>
              <h4 className="font-bold text-slate-900 mb-1">{route.name}</h4>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>{route.duration}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span>{route.distance}</span>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              animate={{ 
                boxShadow: ["0 0 0px rgba(66,133,244,0)", "0 0 20px rgba(66,133,244,0.5)", "0 0 0px rgba(66,133,244,0)"] 
              }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-10 h-10 rounded-full gemini-gradient flex items-center justify-center text-white shadow-lg"
            >
              <Mic className="w-5 h-5" />
            </motion.div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Insights</p>
              <p className="text-sm font-medium text-slate-700">
                {currentRoute?.id === 'lowest' 
                  ? '"Route B avoids the broken elevator at Grand Station."'
                  : '"This route has 2 high-friction segments for your profile."'
                }
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsVoiceOpen(true)}
            className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-8 py-5 rounded-2xl gemini-gradient text-white font-bold text-lg shadow-xl shadow-gemini-blue/30 flex items-center justify-center gap-3"
        >
          <Navigation className="w-6 h-6" />
          Start Navigation
        </motion.button>
      </motion.div>

      <VoiceOverlay isOpen={isVoiceOpen} onClose={() => setIsVoiceOpen(false)} />
      
      <AnimatePresence>
        {selectedSegment && (
          <SegmentDetailPanel 
            segment={selectedSegment} 
            onClose={() => setSelectedSegment(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const LanguageBadge = ({ language }: { language: string }) => {
  const langNames: Record<string, string> = {
    en: 'English',
    fr: 'Français',
    es: 'Español',
    ar: 'العربية',
    de: 'Deutsch',
    ja: '日本語',
    zh: '中文'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/40 backdrop-blur-xl border border-white/30 shadow-lg"
    >
      <motion.div 
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="w-2 h-2 rounded-full bg-emerald-400" 
      />
      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
        {langNames[language] || language.toUpperCase()}
      </span>
    </motion.div>
  );
};

const Settings = ({ 
  onClose, 
  theme, 
  setTheme, 
  language, 
  setLanguage 
}: { 
  onClose: () => void; 
  theme: string; 
  setTheme: (t: string) => void;
  language: string;
  setLanguage: (l: string) => void;
}) => {
  const themes = [
    { id: 'default', name: 'Gemini Blue', color: 'bg-gemini-blue' },
    { id: 'warm', name: 'Sunset Glow', color: 'bg-gemini-orange' },
    { id: 'deep', name: 'Deep Space', color: 'bg-gemini-purple' },
  ];

  const languages = [
    { id: 'en', name: 'English' },
    { id: 'fr', name: 'Français' },
    { id: 'es', name: 'Español' },
    { id: 'ar', name: 'العربية' },
  ];

  return (
    <motion.div 
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[60] glass-panel p-6 pt-20 flex flex-col"
    >
      <div className="flex items-center justify-between mb-12">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <button 
          onClick={onClose}
          className="p-3 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-10">
        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Visual Theme</h3>
          <div className="grid grid-cols-3 gap-4">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${
                  theme === t.id ? 'border-gemini-blue bg-gemini-blue/5' : 'border-transparent bg-white/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full ${t.color} shadow-lg`} />
                <span className="text-[10px] font-bold text-slate-600 text-center">{t.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Language</h3>
          <div className="space-y-3">
            {languages.map((l) => (
              <button
                key={l.id}
                onClick={() => setLanguage(l.id)}
                className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${
                  language === l.id ? 'border-gemini-blue bg-gemini-blue/5' : 'border-transparent bg-white/50'
                }`}
              >
                <span className="font-semibold text-slate-700">{l.name}</span>
                {language === l.id && <div className="w-2 h-2 rounded-full bg-gemini-blue" />}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">App Info</h3>
          <div className="glass-panel p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Version</span>
              <span className="text-slate-900 font-bold">1.0.4-beta</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">AI Model</span>
              <span className="text-slate-900 font-bold">Gemini 3.0 Pro</span>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-auto pb-8 text-center">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Built for Google GenMedia Hackathon</p>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [step, setStep] = useState<'onboarding' | 'search' | 'results'>('onboarding');
  const [profile, setProfile] = useState<AccessibilityProfile | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [theme, setTheme] = useState('default');
  const [language, setLanguage] = useState('en');

  const handleOnboarding = (p: AccessibilityProfile) => {
    setProfile(p);
    setStep('search');
    setIsSettingsOpen(false);
  };

  const handleSearch = (from: string, to: string) => {
    setStep('results');
  };

  const getBgColor = () => {
    if (step === 'onboarding') return 'bg-slate-50';
    if (theme === 'warm') return 'bg-orange-50';
    if (theme === 'deep') return 'bg-indigo-50';
    return 'bg-blue-50';
  };

  return (
    <div className={`h-screen w-full max-w-md mx-auto ${getBgColor()} shadow-2xl relative overflow-hidden flex flex-col transition-colors duration-700`}>
      <GeminiGlow theme={theme} />
      
      <AnimatePresence mode="wait">
        {step === 'onboarding' && (
          <Onboarding 
            onComplete={handleOnboarding} 
            onOpenSettings={() => setIsSettingsOpen(true)} 
            language={language}
          />
        )}
        {step === 'search' && profile && (
          <Search profile={profile} onSearch={handleSearch} />
        )}
        {step === 'results' && profile && (
          <Results profile={profile} onBack={() => setStep('search')} theme={theme} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSettingsOpen && (
          <Settings 
            onClose={() => setIsSettingsOpen(false)} 
            theme={theme} 
            setTheme={setTheme}
            language={language}
            setLanguage={setLanguage}
          />
        )}
      </AnimatePresence>

      {/* Status Bar Mock */}
      <div className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-6 z-50 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <span className="text-xs font-bold text-slate-400">9:41</span>
        </div>
        <div className="flex gap-1.5 items-center">
          <div className="w-5 h-2.5 border border-slate-300 rounded-[2px] relative">
            <div className="absolute inset-y-0 left-0 bg-slate-400 w-3/4 m-[1px]" />
          </div>
          <div className="w-3 h-3 rounded-full border border-slate-300" />
        </div>
      </div>
    </div>
  );
}