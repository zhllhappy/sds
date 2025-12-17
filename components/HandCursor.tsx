import React, { useRef, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Trail } from '@react-three/drei';
import * as THREE from 'three';
import { HandData, GestureType, AppMode } from '../types';

interface HandCursorProps {
  handData: HandData;
  targetRef: React.MutableRefObject<THREE.Vector3>;
  mode: AppMode;
}

export const HandCursor: React.FC<HandCursorProps> = ({ handData, targetRef, mode }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  // Temporary vectors for math to avoid garbage collection
  const vecA = useRef(new THREE.Vector3());
  const vecB = useRef(new THREE.Vector3());
  const vecMid = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // 1. Map normalized Hand Coordinates
    const targetX = (handData.x - 0.5) * viewport.width;
    const targetY = -(handData.y - 0.5) * viewport.height;

    // Smoothly interpolate position
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.2);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.2);
    meshRef.current.position.z = 10;

    // 2. Visual Feedback based on Gesture
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    
    if (handData.gesture === GestureType.PINCH) {
        material.emissive.setHex(0xffffff);
        material.color.setHex(0xffffff);
        meshRef.current.scale.lerp(new THREE.Vector3(0.5, 0.5, 0.5), 0.2);
    } else if (handData.gesture === GestureType.FIST) {
        material.emissive.setHex(0xff0000);
        material.color.setHex(0xff0000);
        meshRef.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.2);
    } else {
        material.emissive.setHex(0xFFD700);
        material.color.setHex(0xFFD700);
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
    }

    // 3. MAGIC BEAM LOGIC (Connecting Hand to Photo)
    if (beamRef.current) {
        if (mode === AppMode.PHOTO_VIEW && handData.isPresent) {
            beamRef.current.visible = true;
            
            // Start point (Hand)
            vecA.current.copy(meshRef.current.position);
            // End point (Photo Target - read from shared ref)
            vecB.current.copy(targetRef.current);

            // Calculate distance
            const distance = vecA.current.distanceTo(vecB.current);
            
            // Midpoint
            vecMid.current.addVectors(vecA.current, vecB.current).multiplyScalar(0.5);
            
            // Position beam at midpoint
            beamRef.current.position.copy(vecMid.current);
            
            // Orient beam to face target
            beamRef.current.lookAt(vecB.current);
            // Rotate 90deg on X because CylinderGeometry is vertical (Y-axis) by default
            beamRef.current.rotateX(Math.PI / 2);

            // Scale length
            beamRef.current.scale.set(1, 1, distance);

            // Animate texture or opacity if we had a texture, for now pulsate thickness
            const pulse = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.2;
            beamRef.current.scale.set(0.1 * pulse, 0.1 * pulse, distance);

        } else {
            beamRef.current.visible = false;
        }
    }
  });

  if (!handData.isPresent) return null;

  return (
    <>
      <Trail
        width={2}
        length={6}
        color={new THREE.Color("#FFD700")}
        attenuation={(t) => t * t}
      >
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial 
            emissive="#FFD700" 
            emissiveIntensity={2} 
            toneMapped={false} 
          />
        </mesh>
      </Trail>

      {/* Magic Beam (Cylinder) */}
      <mesh ref={beamRef} visible={false}>
          {/* Default cylinder is radius=1, height=1 */}
          <cylinderGeometry args={[1, 1, 1, 8, 1, true]} /> 
          <meshBasicMaterial 
            color="#FFD700" 
            transparent 
            opacity={0.3} 
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
      </mesh>
      
      {/* Light following hand */}
      <pointLight 
        position={[meshRef.current?.position.x || 0, meshRef.current?.position.y || 0, 12]} 
        intensity={2} 
        distance={10} 
        color="#FFD700" 
      />
    </>
  );
};