import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Trail } from '@react-three/drei';
import * as THREE from 'three';
import { HandData, GestureType } from '../types';

interface HandCursorProps {
  handData: HandData;
}

export const HandCursor: React.FC<HandCursorProps> = ({ handData }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

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
    </>
  );
};