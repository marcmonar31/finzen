import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PinStore {
  pinHash: string | null;
  locked: boolean;
  biometricEnabled: boolean;
  credentialId: string | null;
  setPinHash: (hash: string) => void;
  removePin: () => void;
  lock: () => void;
  unlock: () => void;
  setBiometric: (enabled: boolean, credId?: string | null) => void;
}

export const usePinStore = create<PinStore>()(
  persist(
    (set) => ({
      pinHash: null,
      locked: false,
      biometricEnabled: false,
      credentialId: null,
      setPinHash: (hash) => set({ pinHash: hash, locked: false }),
      removePin: () => set({ pinHash: null, biometricEnabled: false, credentialId: null, locked: false }),
      lock: () => set({ locked: true }),
      unlock: () => set({ locked: false }),
      setBiometric: (enabled, credId) => set({ biometricEnabled: enabled, credentialId: credId ?? null }),
    }),
    { name: "finzen-pin" }
  )
);

// Hash del PIN — usa SHA-256 si está disponible (HTTPS/localhost), si no usa obfuscación simple
export async function hashPin(pin: string): Promise<string> {
  const salted = pin + "finzen_lock_v1";
  if (crypto?.subtle) {
    const data = new TextEncoder().encode(salted);
    const buf  = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback para HTTP: XOR simple + base64
  let n = 0x5F3759DF;
  for (let i = 0; i < salted.length; i++) n = (n ^ (salted.charCodeAt(i) * 0x27D4EB2D)) >>> 0;
  return `fb_${n.toString(16)}_${btoa(salted).replace(/=/g, "")}`;
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    return !!(
      window.PublicKeyCredential &&
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    );
  } catch {
    return false;
  }
}

export async function registerBiometric(): Promise<string> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Finzen", id: window.location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "finzen-user", displayName: "Finzen" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60000,
    },
  }) as PublicKeyCredential;
  return btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
}

export async function authenticateWithBiometric(credentialId: string): Promise<boolean> {
  try {
    const challenge   = crypto.getRandomValues(new Uint8Array(32));
    const credIdBytes = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0));
    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: "public-key", id: credIdBytes }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return true;
  } catch {
    return false;
  }
}
