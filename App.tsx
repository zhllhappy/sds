import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AppMode, GestureType } from './types';
import { MagicParticles } from './components/MagicParticles';
import { HandCursor } from './components/HandCursor';
import { useHandTracking } from './hooks/useHandTracking';

// UI Icons
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
);

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.TREE);
  const [photos, setPhotos] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handData = useHandTracking(videoRef);
  
  // Shared reference for the active photo's 3D position
  // MagicParticles writes to this, HandCursor reads from this
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // Gesture State Transition Logic
  useEffect(() => {
    if (!handData.isPresent) return;

    if (handData.gesture === GestureType.FIST && mode !== AppMode.TREE) {
      setMode(AppMode.TREE);
    } else if (handData.gesture === GestureType.OPEN_HAND && mode === AppMode.TREE) {
      setMode(AppMode.SCATTER);
    } else if (handData.gesture === GestureType.OPEN_HAND && mode === AppMode.PHOTO_VIEW) {
      // Release photo
      setMode(AppMode.SCATTER);
    }
    // Pinch logic is handled inside 3D component to access particle data
  }, [handData.gesture, handData.isPresent, mode]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files).map(file => URL.createObjectURL(file as File));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  return (
    <div className="relative w-full h-screen bg-christmas-dark overflow-hidden font-sans">
      {/* Hidden Video for MediaPipe */}
      <video 
        ref={videoRef} 
        className="hidden" 
        playsInline 
        muted 
        autoPlay 
      />

      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas gl={{ antialias: false, toneMappingExposure: 1.5 }}>
          <PerspectiveCamera makeDefault position={[0, 0, 25]} fov={50} />
          
          <color attach="background" args={['#020202']} />
          
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#FFD700" />
          <spotLight position={[-10, 15, 10]} angle={0.3} penumbra={1} intensity={2} color="#8B0000" />

          {/* Magic Hand Cursor - Provides visual feedback and connection beam */}
          <HandCursor handData={handData} targetRef={targetRef} mode={mode} />

          <MagicParticles 
            mode={mode} 
            photos={photos} 
            handData={handData} 
            setMode={setMode}
            targetRef={targetRef}
          />
          
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          {/* Enhanced Falling Snow Effect */}
          <Sparkles 
            count={1500} 
            scale={[40, 40, 30]} // Much wider area to ensure visibility
            size={8} // Larger flakes
            speed={0.8} // Slightly faster fall
            opacity={0.8} 
            color="#E0F7FA" // Icy white blue
            position={[0, 0, 0]} 
          />
          
          <Environment preset="city" />

          <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.7} mipmapBlur intensity={1.2} radius={0.4} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
          
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            enableRotate={mode === AppMode.TREE} // Disable manual rotate in scatter mode (hand does it)
            autoRotate={mode === AppMode.TREE}
            autoRotateSpeed={0.5}
          />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8">
        
        {/* Header */}
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-serif font-bold text-christmas-gold drop-shadow-lg tracking-wider">
              Noel Magic
            </h1>
            <p className="text-gray-300 text-sm mt-2 max-w-xs drop-shadow-md">
              A WebGL Interactive Christmas Experience
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex gap-4 pointer-events-auto">
             <label className="flex items-center gap-2 bg-christmas-green/80 hover:bg-christmas-green text-white px-4 py-2 rounded-full backdrop-blur-sm transition-all cursor-pointer border border-christmas-gold/30 hover:scale-105 active:scale-95 shadow-lg shadow-christmas-gold/20">
               <UploadIcon />
               <span className="text-sm font-semibold">Add Photos</span>
               <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
             </label>
          </div>
        </header>

        {/* Status & Feedback */}
        <div className="absolute top-1/2 right-8 transform -translate-y-1/2 flex flex-col items-end gap-6">
           <div className={`transition-all duration-500 flex flex-col items-end ${mode === AppMode.TREE ? 'opacity-100 translate-x-0' : 'opacity-40 translate-x-4'}`}>
              <div className="w-3 h-3 rounded-full bg-christmas-gold shadow-[0_0_10px_#FFD700] mb-2"></div>
              <span className="text-christmas-gold font-serif text-lg">Tree Mode</span>
           </div>
           <div className={`transition-all duration-500 flex flex-col items-end ${mode === AppMode.SCATTER ? 'opacity-100 translate-x-0' : 'opacity-40 translate-x-4'}`}>
              <div className="w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_10px_#60A5FA] mb-2"></div>
              <span className="text-blue-100 font-serif text-lg">Scatter Mode</span>
           </div>
           <div className={`transition-all duration-500 flex flex-col items-end ${mode === AppMode.PHOTO_VIEW ? 'opacity-100 translate-x-0' : 'opacity-40 translate-x-4'}`}>
              <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_#ffffff] mb-2"></div>
              <span className="text-white font-serif text-lg">Focus Mode</span>
           </div>
        </div>

        {/* Hand Tracking Feedback */}
        <div className="absolute top-24 left-8 pointer-events-auto bg-black/40 p-4 rounded-xl backdrop-blur-md border border-white/10 w-64 shadow-2xl">
           <div className="flex items-center gap-3 mb-3 border-b border-white/10 pb-2">
             <div className={`w-2 h-2 rounded-full ${handData.isPresent ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></div>
             <span className="text-xs font-mono text-gray-300 uppercase">
               {handData.isPresent ? 'Camera Active' : 'Detecting Hands...'}
             </span>
           </div>
           
           <div className="space-y-3">
             <div className={`flex items-center gap-3 transition-opacity ${handData.gesture === GestureType.FIST ? 'opacity-100 text-christmas-gold' : 'opacity-40 text-gray-400'}`}>
               <span className="text-xl">✊</span>
               <span className="text-sm font-medium">Fist: Form Tree</span>
             </div>
             <div className={`flex items-center gap-3 transition-opacity ${handData.gesture === GestureType.OPEN_HAND ? 'opacity-100 text-blue-300' : 'opacity-40 text-gray-400'}`}>
               <span className="text-xl">🖐</span>
               <span className="text-sm font-medium">Open: Scatter</span>
             </div>
             <div className={`flex items-center gap-3 transition-opacity ${handData.gesture === GestureType.PINCH ? 'opacity-100 text-white' : 'opacity-40 text-gray-400'}`}>
               <span className="text-xl">👌</span>
               <span className="text-sm font-medium">Pinch: Grab Photo</span>
             </div>
           </div>
        </div>

        {/* Footer */}
        <footer className="w-full text-center pb-4 pointer-events-none">
          <p className="text-white/30 text-xs font-serif italic">
            "Magic is in the air"
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;