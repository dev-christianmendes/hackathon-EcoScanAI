"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertCircle, FlaskConical, Heart } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { CameraCapture } from "@/components/camera/CameraCapture";
import { ScanResult } from "@/components/results/ScanResult";
import { scanWaste } from "@/services/api";
import { getNextDemoResponse } from "@/data/mockData";
import { AppState, ScanResponse } from "@/types";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCapture = useCallback(async (imageBase64: string) => {
    setCapturedImage(imageBase64);
    setAppState("scanning");
    setErrorMessage(null);

    try {
      const result = await scanWaste({
        image_base64: imageBase64,
        demo_mode: false,
      });
      setScanResult(result);
      setAppState("result");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro desconhecido ao analisar imagem.";
      console.error("Scan request failed:", err);
      setErrorMessage(
        message.includes("Failed to fetch") || message.includes("NetworkError")
          ? "Não foi possível conectar ao servidor. Verifique se o backend está rodando em " +
              (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") +
              "."
          : message,
      );
      setAppState("error");
    }
  }, []);

  const handleDemoScan = useCallback(async () => {
    setAppState("scanning");
    setErrorMessage(null);
    setCapturedImage(null);

    // Simulate a short processing delay for the demo effect
    await new Promise((r) => setTimeout(r, 1200));

    const result = getNextDemoResponse();
    setScanResult(result);
    setAppState("result");
  }, []);

  const handleReset = useCallback(() => {
    setAppState("idle");
    setCapturedImage(null);
    setScanResult(null);
    setErrorMessage(null);
  }, []);

  return (
    <div className="min-h-screen bg-eco-gradient flex flex-col">
      <Header />

      {/* Demo Mode Banner */}
      <AnimatePresence>
        {DEMO_MODE && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-yellow-500/[0.06] border-b border-yellow-500/10 overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2 py-2 px-4 text-yellow-400/80 text-xs">
              <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                <strong>Modo Demo</strong> — clique em &quot;Demo Rápido&quot; para
                testar sem API Key
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* ── Scanning State ──────────────────────────────────────────── */}
          {appState === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center min-h-[55vh] gap-8"
            >
              {/* Animated rings */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-2 border-eco-green/20 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-eco-green/40 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-eco-green animate-spin" />
                  </div>
                </div>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border border-eco-green/20"
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 1.8 + i * 0.4, opacity: 0 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.6,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </div>

              <div className="text-center">
                <h2 className="text-lg font-bold text-white mb-1">
                  Analisando resíduo...
                </h2>
                <p className="text-slate-500 text-sm">
                  A IA está identificando o material
                </p>
              </div>

              {/* Progress steps with completion animation */}
              <div className="flex flex-col gap-3 w-full max-w-xs">
                {[
                  { label: "Processando imagem", delay: 0 },
                  { label: "Consultando Google Vision AI", delay: 0.4 },
                  { label: "Classificando resíduo", delay: 0.8 },
                ].map((step, i) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: step.delay }}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-eco-card/60 border border-white/[0.04]"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.8, delay: step.delay, repeat: Infinity, repeatDelay: 2 }}
                      className="w-2 h-2 rounded-full bg-eco-green flex-shrink-0"
                    />
                    <span className="text-sm text-slate-400">{step.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Error State ─────────────────────────────────────────────── */}
          {appState === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-16 text-center"
            >
              <AlertCircle className="w-12 h-12 text-red-400" />
              <div>
                <h3 className="text-white font-semibold mb-1">Algo deu errado</h3>
                <p className="text-slate-400 text-sm max-w-xs">{errorMessage}</p>
              </div>
              <button
                onClick={handleReset}
                className="text-eco-green text-sm underline underline-offset-2"
              >
                Tentar novamente
              </button>
            </motion.div>
          )}

          {/* ── Result State ─────────────────────────────────────────────── */}
          {appState === "result" && scanResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <ScanResult
                result={scanResult}
                capturedImage={capturedImage}
                onReset={handleReset}
              />
            </motion.div>
          )}

          {/* ── Idle / Camera State ──────────────────────────────────────── */}
          {(appState === "idle" || appState === "camera") && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Hero text */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-center mb-5"
              >
                <h1 className="text-2xl font-bold text-white mb-2">
                  Descarte com{" "}
                  <span className="text-eco-green">Inteligência</span>
                </h1>
                <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
                  Fotografe o resíduo e descubra como descartá-lo corretamente
                </p>
              </motion.div>

              <CameraCapture
                onCapture={handleCapture}
                onDemoScan={handleDemoScan}
                isDemoMode={DEMO_MODE}
                isScanning={false}
              />

              {/* Feature pills */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap justify-center gap-2 mt-5"
              >
                {[
                  { icon: "♻️", text: "6 categorias" },
                  { icon: "🤖", text: "Google Vision AI" },
                  { icon: "📍", text: "Guia de descarte" },
                  { icon: "💚", text: "100% gratuito" },
                ].map((pill) => (
                  <span
                    key={pill.text}
                    className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-400 text-xs flex items-center gap-1.5"
                  >
                    <span>{pill.icon}</span>
                    {pill.text}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-600/60 border-t border-white/[0.04]">
        <span className="flex items-center justify-center gap-1.5">
          EcoScan AI · Hackathon Unifran 2024 · Feito com
          <Heart className="w-3 h-3 text-eco-green/60 fill-eco-green/60" />
        </span>
      </footer>
    </div>
  );
}
