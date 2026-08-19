import { motion } from "framer-motion";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function Card({ children, className = "", glow, onClick }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      onClick={onClick}
      className={`
        relative rounded-2xl border bg-eco-card/80 backdrop-blur-sm p-5 overflow-hidden
        ${glow ? `border-${glow}-500/40 shadow-lg shadow-${glow}-900/20` : "border-white/[0.06]"}
        ${onClick ? "cursor-pointer hover:bg-eco-card transition-colors" : ""}
        ${className}
      `}
    >
      {glow && (
        <div className={`absolute inset-0 bg-gradient-to-br from-${glow}-500/[0.05] to-transparent pointer-events-none`} />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  );
}
