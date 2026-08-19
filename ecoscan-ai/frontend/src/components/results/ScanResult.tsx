"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Recycle,
  FileText,
  Wine,
  Zap,
  Leaf,
  AlertTriangle,
  Droplets,
  Trash2,
  RotateCcw,
  Sparkles,
  FlaskConical,
  Tag,
  ImageIcon,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { ScanResponse, COLOR_MAP } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const ICON_MAP: Record<string, React.ReactNode> = {
  Recycle: <Recycle className="w-8 h-8" />,
  FileText: <FileText className="w-8 h-8" />,
  Wine: <Wine className="w-8 h-8" />,
  Zap: <Zap className="w-8 h-8" />,
  Leaf: <Leaf className="w-8 h-8" />,
  AlertTriangle: <AlertTriangle className="w-8 h-8" />,
};

const CATEGORY_LABEL_PT: Record<string, string> = {
  plastic: "Plástico",
  paper: "Papel / Papelão",
  glass: "Vidro",
  metal: "Metal",
  organic: "Orgânico",
  reject: "Rejeito",
  unknown: "Não identificado",
};

interface ScanResultProps {
  result: ScanResponse;
  capturedImage: string | null;
  onReset: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

function ConfidenceGauge({ percent, color }: { percent: number; color: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-700/50" />
        <motion.circle
          cx="48" cy="48" r={radius} fill="none"
          stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          className={color}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          {percent}%
        </motion.span>
        <span className="text-[10px] text-slate-500 font-medium">confiança</span>
      </div>
    </div>
  );
}

export function ScanResult({ result, capturedImage, onReset }: ScanResultProps) {
  const { waste_info, detected_labels, confidence, demo_mode } = result;
  const alternatives = result.alternatives ?? [];
  const lowConfidence = result.low_confidence ?? confidence < 0.55;
  const [showImage, setShowImage] = useState(false);

  if (!waste_info) {
    return (
      <div className="text-center py-10">
        <p className="text-red-400">Erro ao processar imagem. Tente novamente.</p>
        <Button variant="secondary" onClick={onReset} className="mt-4">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  const colors = COLOR_MAP[waste_info.color_tailwind] ?? COLOR_MAP.gray;
  const icon = ICON_MAP[waste_info.icon_name] ?? <Recycle className="w-8 h-8" />;
  const confidencePercent = Math.round(confidence * 100);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-3.5 pb-6"
    >
      {/* ── Hero Result Card ───────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card glow={waste_info.color_tailwind} className="!p-0 overflow-hidden">
          {/* Top colored accent bar */}
          <div className={`h-1 w-full ${colors.bg}`} />

          <div className="p-5">
            <div className="flex items-start gap-4">
              {/* Category icon with glow */}
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
                className={`relative flex-shrink-0 w-16 h-16 rounded-2xl ${colors.bgLight} ${colors.text} flex items-center justify-center border ${colors.border}/30`}
              >
                {icon}
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${waste_info.is_recyclable ? 'bg-eco-green' : 'bg-red-500'}`}>
                  {waste_info.is_recyclable
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    : <XCircle className="w-3.5 h-3.5 text-white" />
                  }
                </div>
              </motion.div>

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-xl font-bold text-white">{waste_info.label}</h2>
                  {demo_mode && (
                    <span className="px-2 py-0.5 rounded-full bg-yellow-900/40 border border-yellow-600/50 text-yellow-400 text-[10px] font-semibold uppercase tracking-wide">
                      Demo
                    </span>
                  )}
                </div>
                <p className={`text-sm font-medium ${waste_info.is_recyclable ? 'text-eco-green' : 'text-red-400'} mb-1.5`}>
                  {waste_info.is_recyclable ? "✓ Reciclável" : "✗ Não reciclável"}
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">{waste_info.description}</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Low-confidence Warning ─────────────────────────────────────── */}
      {lowConfidence && (
        <motion.div variants={itemVariants}>
          <Card className="border-yellow-500/30 bg-yellow-500/[0.06]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-400 mb-1">
                  Confiança baixa
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-2">
                  A IA não conseguiu identificar o material com total certeza.
                  Tire outra foto com mais luz, fundo neutro e o objeto bem
                  enquadrado para um resultado mais preciso.
                </p>
                {alternatives.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="text-[11px] text-slate-500 mr-1 self-center">
                      Outras possibilidades:
                    </span>
                    {alternatives.slice(0, 3).map((alt) => (
                      <span
                        key={alt.category}
                        className="px-2 py-0.5 rounded-md bg-slate-800/60 text-slate-300 text-[11px] border border-white/[0.06]"
                      >
                        {CATEGORY_LABEL_PT[alt.category] ?? alt.category}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Confidence + Lixeira Row ───────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-5 gap-3">
        {/* Confidence gauge — 2 cols */}
        <Card className="col-span-2 flex flex-col items-center justify-center !py-4">
          <ConfidenceGauge percent={confidencePercent} color={colors.text} />
        </Card>

        {/* Lixeira color — 3 cols */}
        <Card className={`col-span-3 flex flex-col justify-between border ${colors.border}/30 ${colors.bgLight}`}>
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-2">
              <Trash2 className="w-3.5 h-3.5" />
              Lixeira correta
            </div>
            <div className={`text-2xl font-bold ${colors.text} mb-1`}>{waste_info.color_name}</div>
            <p className="text-slate-400 text-xs leading-relaxed">{waste_info.disposal_instructions}</p>
          </div>
          <div className={`w-full h-2 rounded-full ${colors.bg} mt-3`} />
        </Card>
      </motion.div>

      {/* ── Cleaning Instructions ──────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card>
          <h3 className="text-sm font-semibold text-white mb-3.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5 text-blue-400" />
            </div>
            Como higienizar
          </h3>
          <ul className="flex flex-col gap-2.5">
            {waste_info.cleaning_instructions.map((step, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                className="flex items-start gap-3 text-sm text-slate-300 leading-relaxed"
              >
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-full ${colors.bgLight} ${colors.text} text-[11px] flex items-center justify-center font-bold mt-0.5`}
                >
                  {i + 1}
                </span>
                {step}
              </motion.li>
            ))}
          </ul>
        </Card>
      </motion.div>

      {/* ── Eco Tip ───────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-eco-green/20 bg-gradient-to-br from-eco-green/[0.06] to-transparent">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-eco-green/15 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-eco-green" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-eco-green mb-1">Você sabia?</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{waste_info.eco_tip}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Detected Labels ───────────────────────────────────────────── */}
      {detected_labels.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="!py-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
              <Tag className="w-3 h-3" />
              Detectado pela IA
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {detected_labels.slice(0, 8).map((label) => (
                <span
                  key={label}
                  className="px-2.5 py-1 rounded-lg bg-slate-700/40 text-slate-300 text-xs border border-white/[0.04]"
                >
                  {label}
                </span>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Captured Image (collapsible) ──────────────────────────────── */}
      {capturedImage && (
        <motion.div variants={itemVariants}>
          <button
            onClick={() => setShowImage(!showImage)}
            className="w-full flex items-center justify-between px-5 py-3 rounded-2xl bg-eco-card/80 border border-white/[0.06] text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5" />
              Imagem capturada
            </span>
            <motion.div animate={{ rotate: showImage ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </button>
          {showImage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedImage}
                alt="Resíduo capturado"
                className="w-full rounded-2xl object-cover max-h-48"
              />
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ── Reset Button ──────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="pt-1">
        <Button
          variant="primary"
          size="lg"
          leftIcon={<RotateCcw className="w-4 h-4" />}
          onClick={onReset}
          className="w-full"
        >
          Escanear Outro Resíduo
        </Button>
      </motion.div>
    </motion.div>
  );
}
