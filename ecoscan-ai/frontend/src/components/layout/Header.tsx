"use client";

import { motion } from "framer-motion";
import { Leaf } from "lucide-react";

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-eco-dark/70 backdrop-blur-xl"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-eco-green/30 to-eco-green/10 flex items-center justify-center border border-eco-green/20">
          <Leaf className="w-4.5 h-4.5 text-eco-green" />
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-eco-green animate-pulse" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-bold text-white text-lg tracking-tight leading-none">
            Eco<span className="text-eco-green">Scan</span>
          </span>
          <span className="text-eco-green/70 font-semibold text-[10px] uppercase tracking-widest">AI</span>
        </div>
      </div>

      {/* Status pill */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-eco-green/10 border border-eco-green/20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-eco-green opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-eco-green" />
        </span>
        <span className="text-[11px] text-eco-green font-medium">Pronto para escanear</span>
      </div>
    </motion.header>
  );
}
