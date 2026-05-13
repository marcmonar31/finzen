import {
  Building2, PiggyBank, Banknote, CreditCard, TrendingUp, Package,
  Home, Car, Plane, Wallet, Briefcase, Star, Coffee, Zap, Gift,
  Laptop, ShoppingCart, Utensils, Heart, Music, Target,
  Handshake, Users, Trophy, Gamepad2, PartyPopper, Pizza,
  Dog, Sun, ShoppingBag, Bike, Dumbbell, BookOpen, Film,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  "building2":     Building2,
  "piggy-bank":    PiggyBank,
  "banknote":      Banknote,
  "credit-card":   CreditCard,
  "trending-up":   TrendingUp,
  "package":       Package,
  "home":          Home,
  "car":           Car,
  "plane":         Plane,
  "wallet":        Wallet,
  "briefcase":     Briefcase,
  "star":          Star,
  "coffee":        Coffee,
  "zap":           Zap,
  "gift":          Gift,
  "laptop":        Laptop,
  "shopping-cart": ShoppingCart,
  "utensils":      Utensils,
  "heart":         Heart,
  "music":         Music,
  "target":        Target,
  "handshake":     Handshake,
  "users":         Users,
  "trophy":        Trophy,
  "gamepad2":      Gamepad2,
  "party-popper":  PartyPopper,
  "pizza":         Pizza,
  "dog":           Dog,
  "sun":           Sun,
  "shopping-bag":  ShoppingBag,
  "bike":          Bike,
  "dumbbell":      Dumbbell,
  "book-open":     BookOpen,
  "film":          Film,
};

export const ICON_LIST = Object.keys(ICON_MAP) as (keyof typeof ICON_MAP)[];

interface Props {
  name?: string | null;
  size?: number;
  className?: string;
  fallback?: LucideIcon;
}

export function AppIcon({ name, size = 20, className, fallback: Fallback = Package }: Props) {
  const Icon = (name && ICON_MAP[name]) ? ICON_MAP[name] : Fallback;
  return <Icon size={size} className={className} />;
}
