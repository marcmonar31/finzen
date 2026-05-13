import { useState, useEffect, useCallback } from "react";
import { Fingerprint, Delete } from "lucide-react";
import { usePinStore, hashPin, authenticateWithBiometric } from "@/stores/pin";

const NUMPAD = [
  ["1","2","3"],
  ["4","5","6"],
  ["7","8","9"],
  ["bio","0","del"],
];

interface Props {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: Props) {
  const { pinHash, biometricEnabled, credentialId } = usePinStore();
  const [digits,  setDigits]  = useState<string[]>([]);
  const [shake,   setShake]   = useState(false);
  const [bioAvail, setBioAvail] = useState(false);

  useEffect(() => {
    import("@/stores/pin").then(({ isBiometricAvailable }) =>
      isBiometricAvailable().then(setBioAvail)
    );
  }, []);

  // Si hay biométrica registrada, intentar al montar
  useEffect(() => {
    if (biometricEnabled && credentialId) tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryBiometric = useCallback(async () => {
    if (!credentialId) return;
    const ok = await authenticateWithBiometric(credentialId);
    if (ok) onUnlock();
  }, [credentialId, onUnlock]);

  const handleDigit = useCallback(async (key: string) => {
    if (key === "del") {
      setDigits(d => d.slice(0, -1));
      return;
    }
    if (key === "bio") {
      tryBiometric();
      return;
    }
    const next = [...digits, key];
    setDigits(next);

    if (next.length === 4) {
      const h = await hashPin(next.join(""));
      if (h === pinHash) {
        onUnlock();
      } else {
        setShake(true);
        setTimeout(() => { setShake(false); setDigits([]); }, 600);
      }
    }
  }, [digits, pinHash, onUnlock, tryBiometric]);

  const showBio = biometricEnabled && bioAvail && credentialId;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0A0A14] flex flex-col items-center justify-between pt-16 pb-10 select-none">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#1A1A2E] border border-white/10 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl">💚</span>
        </div>
        <h1 className="text-white text-xl font-bold tracking-tight">Finzen</h1>
        <p className="text-white/40 text-sm mt-1">Introduce tu PIN</p>
      </div>

      {/* Dots */}
      <div className={`flex gap-5 ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
        {[0,1,2,3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              digits.length > i
                ? "bg-[#5BAA1F] border-[#5BAA1F] scale-110"
                : "bg-transparent border-white/30"
            }`}
          />
        ))}
      </div>

      {/* Numpad */}
      <div className="w-full max-w-xs px-6 space-y-3">
        {NUMPAD.map((row, ri) => (
          <div key={ri} className="flex justify-between">
            {row.map((key) => {
              if (key === "bio") {
                return (
                  <button
                    key="bio"
                    onClick={() => tryBiometric()}
                    disabled={!showBio || digits.length > 0}
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white/70 active:bg-white/10 transition-colors disabled:opacity-0"
                  >
                    <Fingerprint className="w-7 h-7" />
                  </button>
                );
              }
              if (key === "del") {
                return (
                  <button
                    key="del"
                    onClick={() => handleDigit("del")}
                    disabled={digits.length === 0}
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white active:bg-white/10 transition-colors disabled:opacity-20"
                  >
                    <Delete className="w-6 h-6" />
                  </button>
                );
              }
              return (
                <button
                  key={key}
                  onClick={() => handleDigit(key)}
                  disabled={digits.length === 4}
                  className="w-20 h-20 rounded-full bg-white/10 flex flex-col items-center justify-center gap-0.5 active:bg-white/20 transition-colors text-white font-light"
                >
                  <span className="text-[28px] leading-none">{key}</span>
                </button>
              );
            })}
          </div>
        ))}

        {showBio && digits.length === 0 && (
          <button
            onClick={tryBiometric}
            className="w-full text-center text-[#5BAA1F] text-sm font-medium py-2 active:opacity-70"
          >
            Usar Face ID / Touch ID
          </button>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
