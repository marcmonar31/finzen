import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useFlashStore } from "@/stores/flash";

const COLORS = {
  success: "#C7FF6B",
  delete:  "#FF5C5C",
  error:   "#FF9A4D",
};

export function FlashOverlay() {
  const { visible, message, variant } = useFlashStore();
  const color = COLORS[variant];

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key="flash-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[9000] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.60)" }}
        >
          <motion.div
            key="flash-card"
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1,    opacity: 1 }}
            exit={{    scale: 0.75, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            className="bg-[#1a1a1a] rounded-3xl flex flex-col items-center gap-4 px-10 py-8 min-w-[200px] max-w-[280px] border border-white/8"
          >
            {/* Animated check SVG */}
            <motion.svg
              viewBox="0 0 52 52"
              className="w-16 h-16"
              fill="none"
            >
              {/* Circle */}
              <motion.circle
                cx="26" cy="26" r="23"
                stroke={color}
                strokeWidth="2.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.38, ease: "easeOut" }}
              />
              {/* Checkmark */}
              <motion.path
                stroke={color}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M 14 27 L 22 35 L 38 17"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.32, ease: "easeOut", delay: 0.22 }}
              />
            </motion.svg>

            <p className="text-white font-semibold text-sm text-center leading-snug">
              {message}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
