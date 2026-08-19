"use client";

import { useState, useRef, useCallback } from "react";

export interface CameraState {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  facingMode: "user" | "environment";
}

export interface UseCameraReturn extends CameraState {
  videoRef: React.RefObject<HTMLVideoElement>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => string | null;
  switchCamera: () => Promise<void>;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>({
    stream: null,
    isActive: false,
    error: null,
    facingMode: "environment", // Default to rear camera on mobile
  });

  const stopCamera = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState((prev) => ({ ...prev, stream: null, isActive: false }));
  }, [state.stream]);

  const startCamera = useCallback(
    async (facingMode: "user" | "environment" = state.facingMode) => {
      try {
        // Stop any existing stream first
        if (state.stream) {
          state.stream.getTracks().forEach((t) => t.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setState({ stream, isActive: true, error: null, facingMode });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Camera access denied";
        setState((prev) => ({
          ...prev,
          isActive: false,
          error:
            message.includes("Permission")
              ? "Permissão de câmera negada. Por favor, permita o acesso nas configurações do navegador."
              : "Não foi possível acessar a câmera. Tente usar o upload de imagem.",
        }));
      }
    },
    [state.facingMode, state.stream]
  );

  const switchCamera = useCallback(async () => {
    const newMode =
      state.facingMode === "environment" ? "user" : "environment";
    await startCamera(newMode);
  }, [state.facingMode, startCamera]);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !state.isActive) return null;

    const video = videoRef.current;
    // Downscale to longest side 1600px on capture — keeps payload small
    // while preserving enough detail for Vision API label/object detection.
    const maxSide = 1600;
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    if (!srcW || !srcH) return null;

    const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
    const w = Math.round(srcW * scale);
    const h = Math.round(srcH * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, [state.isActive]);

  return {
    ...state,
    videoRef,
    startCamera: () => startCamera(state.facingMode),
    stopCamera,
    capturePhoto,
    switchCamera,
  };
}
