"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CameraOff,
  RefreshCw,
  Upload,
  X,
  SwitchCamera,
  Zap,
} from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { Button } from "@/components/ui/Button";

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  onDemoScan: () => void;
  isDemoMode: boolean;
  isScanning: boolean;
}

export function CameraCapture({
  onCapture,
  onDemoScan,
  isDemoMode,
  isScanning,
}: CameraCaptureProps) {
  const { videoRef, isActive, error, startCamera, stopCamera, capturePhoto, switchCamera } =
    useCamera();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    const photo = capturePhoto();
    if (photo) {
      stopCamera();
      onCapture(photo);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // Downscale large uploads (Vision API → ~1600px is plenty)
      const img = new Image();
      img.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          onCapture(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        onCapture(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => onCapture(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be picked again
    e.target.value = "";
  };

  // ── Idle State — before camera is opened ──────────────────────────────────
  if (!isActive && !error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6 px-4 py-6"
      >
        {/* Hero illustration */}
        <div className="relative">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-eco-green/15 to-eco-green/5 border border-eco-green/20 flex items-center justify-center"
          >
            <Camera className="w-12 h-12 text-eco-green" />
          </motion.div>
          {/* Decorative orbiting dot */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          >
            <div className="absolute -top-1 left-1/2 w-2 h-2 rounded-full bg-eco-green/60" />
          </motion.div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5 w-full max-w-xs">
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Camera className="w-5 h-5" />}
            onClick={() => startCamera()}
            className="w-full"
          >
            Abrir Câmera
          </Button>

          <Button
            variant="secondary"
            size="lg"
            leftIcon={<Upload className="w-5 h-5" />}
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            Enviar Imagem
          </Button>

          {isDemoMode && (
            <Button
              variant="ghost"
              size="lg"
              leftIcon={<Zap className="w-5 h-5 text-yellow-400" />}
              onClick={onDemoScan}
              loading={isScanning}
              className="w-full border border-yellow-500/20 text-yellow-400 hover:bg-yellow-900/20"
            >
              Demo Rápido
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileUpload}
        />
      </motion.div>
    );
  }

  // ── Error State ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4 px-4 py-10 text-center"
      >
        <CameraOff className="w-12 h-12 text-red-400" />
        <div>
          <h3 className="text-white font-semibold mb-1">Câmera indisponível</h3>
          <p className="text-slate-400 text-sm max-w-xs">{error}</p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button
            variant="primary"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => startCamera()}
          >
            Tentar Novamente
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Enviar Imagem
          </Button>
        </div>
        {isDemoMode && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Zap className="w-4 h-4 text-yellow-400" />}
            onClick={onDemoScan}
            className="text-yellow-400"
          >
            Usar modo Demo
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </motion.div>
    );
  }

  // ── Active Camera State ────────────────────────────────────────────────────
  return (
    <div className="relative w-full aspect-[3/4] max-h-[60vh] overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Scanning viewfinder overlay */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Corner brackets */}
            {["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"].map(
              (pos, i) => (
                <div
                  key={i}
                  className={`absolute ${pos} w-8 h-8 border-2 border-eco-green rounded-sm`}
                  style={{
                    borderTopWidth: i < 2 ? 2 : 0,
                    borderBottomWidth: i >= 2 ? 2 : 0,
                    borderLeftWidth: i % 2 === 0 ? 2 : 0,
                    borderRightWidth: i % 2 === 1 ? 2 : 0,
                  }}
                />
              )
            )}
            {/* Scan line */}
            <motion.div
              animate={{ top: ["20%", "75%", "20%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              className="absolute left-4 right-4 h-0.5 bg-eco-green/70 shadow-[0_0_8px_#22C55E]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top controls */}
      <div className="absolute top-3 right-3 flex gap-2">
        <button
          onClick={switchCamera}
          className="w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
        >
          <SwitchCamera className="w-4 h-4" />
        </button>
        <button
          onClick={stopCamera}
          className="w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Capture button */}
      <div className="absolute bottom-5 inset-x-0 flex justify-center gap-4 items-center">
        {isDemoMode && (
          <button
            onClick={onDemoScan}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 text-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            Demo
          </button>
        )}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleCapture}
          disabled={isScanning}
          className="w-16 h-16 rounded-full border-4 border-white bg-white/20 backdrop-blur flex items-center justify-center disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-full bg-white" />
        </motion.button>
      </div>
    </div>
  );
}
