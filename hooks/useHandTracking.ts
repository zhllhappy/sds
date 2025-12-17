import React, { useEffect, useRef, useState } from 'react';
import { GestureType, HandData } from '../types';

// Define minimal MediaPipe types locally since we are using the global script
interface Results {
  multiHandLandmarks: Array<Array<{ x: number; y: number; z: number }>>;
  image: any;
  multiHandedness: any;
}

declare global {
  interface Window {
    Hands: any;
  }
}

export const useHandTracking = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [handData, setHandData] = useState<HandData>({
    gesture: GestureType.NONE,
    x: 0.5,
    y: 0.5,
    isPresent: false,
  });

  const handsRef = useRef<any>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if (!window.Hands) {
      console.error("MediaPipe Hands script not loaded");
      return;
    }

    const onResults = (results: Results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // Calculate Centroid
        const palmBase = landmarks[0];
        const middleFingerKnuckle = landmarks[9];
        const centerX = (palmBase.x + middleFingerKnuckle.x) / 2;
        const centerY = (palmBase.y + middleFingerKnuckle.y) / 2;

        // Detect Gestures
        const isIndexOpen = landmarks[8].y < landmarks[6].y;
        const isMiddleOpen = landmarks[12].y < landmarks[10].y;
        const isRingOpen = landmarks[16].y < landmarks[14].y;
        const isPinkyOpen = landmarks[20].y < landmarks[18].y;

        const openFingersCount = [isIndexOpen, isMiddleOpen, isRingOpen, isPinkyOpen].filter(Boolean).length;

        // Dynamic Scale: Distance from wrist to middle finger knuckle
        const handScale = Math.hypot(landmarks[0].x - landmarks[9].x, landmarks[0].y - landmarks[9].y);
        
        // Pinch Distance: Thumb tip to Index tip
        const pinchDist = Math.hypot(landmarks[8].x - landmarks[4].x, landmarks[8].y - landmarks[4].y);

        let gesture = GestureType.NONE;

        // PRIORITY ADJUSTMENT:
        // 1. Check FIST first. If hand is closed, it's a reset. This prevents "Pinch" from overriding "Fist".
        // 2. Then check Pinch.
        // 3. Then Open Hand.
        
        if (openFingersCount === 0) {
          gesture = GestureType.FIST;
        } else if (pinchDist < 0.05 || pinchDist < handScale * 0.5) { 
          // Tuned sensitivity: 0.5 is easier than default but stricter than previous 0.8
          gesture = GestureType.PINCH;
        } else if (openFingersCount >= 3) {
          gesture = GestureType.OPEN_HAND;
        }

        setHandData({
          gesture,
          x: 1 - centerX, // Mirror horizontally
          y: centerY,
          isPresent: true
        });
      } else {
        setHandData(prev => ({ ...prev, isPresent: false, gesture: GestureType.NONE }));
      }
    };

    const hands = new window.Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);
    handsRef.current = hands;

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await new Promise<void>((resolve) => {
                    if (videoRef.current) {
                        videoRef.current.onloadedmetadata = () => resolve();
                    } else {
                         resolve();
                    }
                });
                await videoRef.current.play();
                processFrame();
            }
        } catch (e) {
            console.error("Error accessing camera:", e);
        }
    };

    const processFrame = async () => {
        if (!videoRef.current || !handsRef.current) return;
        
        if (videoRef.current.readyState >= 2 && !videoRef.current.paused && !videoRef.current.ended) {
            try {
                await handsRef.current.send({ image: videoRef.current });
            } catch (e) { }
        }
        requestRef.current = requestAnimationFrame(processFrame);
    };

    startCamera();

    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (handsRef.current) handsRef.current.close();
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, [videoRef]);

  return handData;
};