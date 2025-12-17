import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AppMode, ParticleData, HandData, GestureType } from '../types';
import { Image as DreiImage } from '@react-three/drei';

interface MagicParticlesProps {
  mode: AppMode;
  photos: string[];
  handData: HandData;
  setMode: (mode: AppMode) => void;
  targetRef: React.MutableRefObject<THREE.Vector3>;
}

const COUNT = 400;
const TREE_HEIGHT = 15;
const TREE_RADIUS_BASE = 6;

const COLORS = ['#2F4F4F', '#FFD700', '#8B0000', '#ffffff'];

export const MagicParticles: React.FC<MagicParticlesProps> = ({ mode, photos, handData, setMode, targetRef }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  // Generate Particles
  const particles = useMemo(() => {
    const temp: ParticleData[] = [];
    
    // 1. Decoration Particles
    for (let i = 0; i < COUNT; i++) {
      // Tree Position (Cone Spiral)
      const t = i / COUNT;
      const angle = t * Math.PI * 20; // Multiple spirals
      const y = -TREE_HEIGHT / 2 + t * TREE_HEIGHT;
      const radius = TREE_RADIUS_BASE * (1 - t); // Taper to top
      
      const treeX = Math.cos(angle) * radius;
      const treeZ = Math.sin(angle) * radius;

      // Scatter Position (Random Sphere)
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 10 + Math.random() * 15;
      const scatterX = r * Math.sin(phi) * Math.cos(theta);
      const scatterY = r * Math.sin(phi) * Math.sin(theta);
      const scatterZ = r * Math.cos(phi);

      const typeRandom = Math.random();
      let type: ParticleData['type'] = 'sphere';
      if (typeRandom > 0.6) type = 'cube';
      if (typeRandom > 0.9) type = 'candy';

      temp.push({
        id: `p-${i}`,
        type,
        startPos: [scatterX, scatterY, scatterZ],
        treePos: [treeX, y, treeZ],
        scatterPos: [scatterX, scatterY, scatterZ],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        scale: Math.random() * 0.3 + 0.1,
      });
    }
    return temp;
  }, []);

  // Compute Photo Particles based on props
  const photoParticles = useMemo(() => {
    if (photos.length === 0) return [];
    
    return photos.map((url, i) => {
      // Tree Pos
      const t = (i + 0.5) / photos.length;
      const angle = t * Math.PI * 10;
      const y = -TREE_HEIGHT / 3 + t * (TREE_HEIGHT * 0.6); // Middle section
      const radius = TREE_RADIUS_BASE * (1 - ((y + TREE_HEIGHT/2)/TREE_HEIGHT)) + 0.5; // Slightly outside
      
      const treeX = Math.cos(angle) * radius;
      const treeZ = Math.sin(angle) * radius;

       // Scatter Position
       const scatterX = (Math.random() - 0.5) * 20;
       const scatterY = (Math.random() - 0.5) * 10;
       const scatterZ = (Math.random() - 0.5) * 5 + 5; 

       return {
         id: `photo-${i}`,
         type: 'photo' as const,
         startPos: [scatterX, scatterY, scatterZ] as [number, number, number],
         treePos: [treeX, y, treeZ] as [number, number, number],
         scatterPos: [scatterX, scatterY, scatterZ] as [number, number, number],
         color: '#ffffff',
         scale: 1.5,
         photoUrl: url
       };
    });
  }, [photos]);

  const allParticles = [...particles, ...photoParticles];

  // Logic Loop
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // 1. Hand Interaction: Rotation
    if (mode === AppMode.SCATTER && handData.isPresent) {
        const targetRotY = (handData.x - 0.5) * Math.PI; 
        const targetRotX = (handData.y - 0.5) * Math.PI * 0.5;
        
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.1);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 0.1);
    } else if (mode === AppMode.TREE) {
        groupRef.current.rotation.y += delta * 0.2;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
    }

    // 2. Gesture State Switching Logic
    if (handData.gesture === GestureType.PINCH && mode === AppMode.SCATTER && activePhotoIndex === null && photoParticles.length > 0) {
        const randomIndex = Math.floor(Math.random() * photoParticles.length);
        setActivePhotoIndex(randomIndex);
        setMode(AppMode.PHOTO_VIEW);
    }
  });

  useEffect(() => {
      if (mode !== AppMode.PHOTO_VIEW) {
          setActivePhotoIndex(null);
      }
  }, [mode]);

  return (
    <group ref={groupRef}>
      {allParticles.map((p, i) => (
        <SingleParticle 
            key={p.id} 
            data={p} 
            mode={mode} 
            isTargetPhoto={p.type === 'photo' && activePhotoIndex !== null && photoParticles[activePhotoIndex].id === p.id}
            targetRef={targetRef}
        />
      ))}
      
      {/* Top Star */}
      <mesh position={[0, TREE_HEIGHT / 2 + 1, 0]}>
         <octahedronGeometry args={[1]} />
         <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  );
};

const SingleParticle: React.FC<{ data: ParticleData, mode: AppMode, isTargetPhoto: boolean, targetRef: React.MutableRefObject<THREE.Vector3> }> = ({ data, mode, isTargetPhoto, targetRef }) => {
    const meshRef = useRef<THREE.Group>(null);
    const vec = new THREE.Vector3();
    const targetPos = new THREE.Vector3();
    const dummyVec = useRef(new THREE.Vector3());

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        // Determine Target Position based on Mode
        if (mode === AppMode.TREE) {
            targetPos.set(...data.treePos);
        } else if (mode === AppMode.SCATTER) {
             const time = state.clock.getElapsedTime();
             const noiseX = Math.sin(time + data.startPos[0]) * 0.5;
             const noiseY = Math.cos(time + data.startPos[1]) * 0.5;
             targetPos.set(data.scatterPos[0] + noiseX, data.scatterPos[1] + noiseY, data.scatterPos[2]);
        } else if (mode === AppMode.PHOTO_VIEW) {
            if (isTargetPhoto) {
                // Position in front of camera
                const camera = state.camera;
                const distanceInFront = 5; 
                const worldTarget = dummyVec.current.copy(camera.position)
                    .add(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).multiplyScalar(distanceInFront));
                
                if (meshRef.current.parent) {
                    targetPos.copy(meshRef.current.parent.worldToLocal(worldTarget.clone()));
                } else {
                    targetPos.copy(worldTarget);
                }
                
                // Update shared reference so we know where the active photo is
                meshRef.current.getWorldPosition(targetRef.current);
            } else {
                targetPos.set(data.scatterPos[0], data.scatterPos[1], data.scatterPos[2] - 5);
            }
        }

        const speed = isTargetPhoto ? 0.2 : 0.05;
        meshRef.current.position.lerp(targetPos, speed);

        // Rotation Logic
        if (isTargetPhoto && mode === AppMode.PHOTO_VIEW) {
            if (meshRef.current.parent) {
                const parentQuat = new THREE.Quaternion();
                meshRef.current.parent.getWorldQuaternion(parentQuat);
                const cameraQuat = state.camera.quaternion.clone();
                meshRef.current.quaternion.copy(parentQuat.invert().multiply(cameraQuat));
            } else {
                meshRef.current.quaternion.copy(state.camera.quaternion);
            }
        } else {
            meshRef.current.rotation.x += delta * 0.5;
            meshRef.current.rotation.y += delta * 0.3;
            if (data.type === 'photo') {
                 meshRef.current.lookAt(state.camera.position);
            }
        }
        
        // Scale Logic
        let targetScale = data.scale;
        if (isTargetPhoto) targetScale = 3.0; 
        
        meshRef.current.scale.lerp(vec.set(targetScale, targetScale, targetScale), 0.1);
    });

    const isGold = data.color === '#FFD700';
    const roughness = isGold ? 0.1 : 0.8;
    const metalness = isGold ? 1.0 : 0.0;
    const emissiveInt = isGold ? 0.2 : 0;

    if (data.type === 'photo' && data.photoUrl) {
        return (
            <group ref={meshRef} position={data.startPos}>
                 {/* The Christmas Gold Frame - Only visible when focused */}
                 <group visible={isTargetPhoto}>
                     {/* Back Plate - moved behind to Z=-0.1 for safety */}
                     <mesh position={[0, 0, -0.1]}>
                         <boxGeometry args={[1.1, 1.1, 0.05]} />
                         <meshStandardMaterial 
                            color="#FFD700" 
                            roughness={0.2} 
                            metalness={1.0}
                            toneMapped={false}
                        />
                     </mesh>
                     {/* Outer Rim */}
                     <mesh position={[0, 0, -0.05]}>
                        <boxGeometry args={[1.15, 1.15, 0.01]} />
                        <meshStandardMaterial 
                            color="#B8860B" 
                            roughness={0.2} 
                            metalness={1.0}
                            toneMapped={false}
                        />
                     </mesh>
                 </group>
                 
                 {/* The Photo - moved forward to Z=0.1 to sit WELL in front of backplate */}
                 <DreiImage 
                    url={data.photoUrl}
                    transparent
                    scale={[1, 1]}
                    position={[0, 0, 0.1]} 
                 />
            </group>
        );
    }

    // Standard Particle
    return (
        <mesh ref={meshRef as any} position={data.startPos}>
            {data.type === 'sphere' && <sphereGeometry args={[1, 16, 16] as [number, number, number]} />}
            {data.type === 'cube' && <boxGeometry args={[1, 1, 1] as [number, number, number]} />}
            {data.type === 'candy' && <cylinderGeometry args={[0.3, 0.3, 1.5, 8] as [number, number, number, number]} />}
            <meshStandardMaterial 
                color={data.color} 
                roughness={roughness} 
                metalness={metalness}
                emissive={data.color}
                emissiveIntensity={emissiveInt}
                toneMapped={isGold ? false : true}
            />
        </mesh>
    );
};