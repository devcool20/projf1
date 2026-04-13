"use client";

import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface PremiumButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  glow?: boolean;
  glass?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, { bg: string; glow: string; border: string; text: string; hover: string }> = {
  primary: {
    bg: "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700",
    glow: "shadow-[0_0_20px_rgba(124,58,237,0.35),0_4px_16px_rgba(124,58,237,0.25)]",
    border: "border-violet-400/30",
    text: "text-white",
    hover: "hover:shadow-[0_0_28px_rgba(124,58,237,0.5),0_6px_20px_rgba(124,58,237,0.35)] hover:from-violet-500 hover:via-purple-500 hover:to-indigo-600",
  },
  secondary: {
    bg: "bg-gradient-to-br from-rose-500 via-pink-500 to-red-600",
    glow: "shadow-[0_0_20px_rgba(255,77,109,0.35),0_4px_16px_rgba(255,77,109,0.25)]",
    border: "border-rose-400/30",
    text: "text-white",
    hover: "hover:shadow-[0_0_28px_rgba(255,77,109,0.5),0_6px_20px_rgba(255,77,109,0.35)] hover:from-rose-400 hover:via-pink-500 hover:to-red-500",
  },
  tertiary: {
    bg: "bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600",
    glow: "shadow-[0_0_20px_rgba(0,229,255,0.35),0_4px_16px_rgba(0,229,255,0.25)]",
    border: "border-cyan-400/30",
    text: "text-white",
    hover: "hover:shadow-[0_0_28px_rgba(0,229,255,0.5),0_6px_20px_rgba(0,229,255,0.35)] hover:from-cyan-400 hover:via-sky-500 hover:to-blue-500",
  },
  danger: {
    bg: "bg-gradient-to-br from-red-600 via-rose-600 to-red-700",
    glow: "shadow-[0_0_20px_rgba(220,38,38,0.4),0_4px_16px_rgba(220,38,38,0.3)]",
    border: "border-red-400/30",
    text: "text-white",
    hover: "hover:shadow-[0_0_28px_rgba(220,38,38,0.55),0_6px_20px_rgba(220,38,38,0.4)] hover:from-red-500 hover:via-rose-500 hover:to-red-600",
  },
  success: {
    bg: "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.35),0_4px_16px_rgba(16,185,129,0.25)]",
    border: "border-emerald-400/30",
    text: "text-white",
    hover: "hover:shadow-[0_0_28px_rgba(16,185,129,0.5),0_6px_20px_rgba(16,185,129,0.35)] hover:from-emerald-400 hover:via-green-500 hover:to-teal-500",
  },
  ghost: {
    bg: "bg-white/80 backdrop-blur-md",
    glow: "shadow-[0_2px_12px_rgba(0,0,0,0.08)]",
    border: "border-slate-200/60",
    text: "text-slate-700",
    hover: "hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] hover:border-slate-300/80",
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-7 py-3.5 text-base gap-2.5",
};

export function PremiumButton({
  variant = "primary",
  size = "md",
  glow = true,
  glass = false,
  children,
  icon,
  iconPosition = "left",
  loading = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}: PremiumButtonProps) {
  const styles = variantStyles[variant];
  const isDisabled = disabled || loading;

  const glassClass = glass
    ? "bg-white/70 backdrop-blur-xl border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]"
    : "";

  const glowClass = glow && !isDisabled && variant !== "ghost" ? styles.glow : "";

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.02, y: -1 } : undefined}
      whileTap={!isDisabled ? { scale: 0.97 } : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      disabled={isDisabled}
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl font-headline font-semibold tracking-wide",
        "border transition-all duration-200",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0",
        sizeStyles[size],
        styles.bg,
        styles.border,
        styles.text,
        styles.hover,
        glowClass,
        glassClass,
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {icon && iconPosition === "left" && <span className="flex-shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === "right" && <span className="flex-shrink-0">{icon}</span>}
        </span>
      )}
      {!isDisabled && glow && variant !== "ghost" && (
        <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}
    </motion.button>
  );
}

interface GlassButtonProps extends Omit<PremiumButtonProps, "glass" | "variant"> {
  accentColor?: string;
}

export function GlassButton({
  accentColor = "#7c3aed",
  className,
  children,
  ...props
}: GlassButtonProps) {
  return (
    <PremiumButton
      glass
      glow={false}
      className={cn(
        "backdrop-blur-xl",
        className
      )}
      style={{
        borderColor: `${accentColor}40`,
        background: `linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.6) 100%)`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 1px ${accentColor}20`,
      } as React.CSSProperties}
      {...props}
    >
      {children}
    </PremiumButton>
  );
}

interface IconButtonProps extends Omit<PremiumButtonProps, "size" | "children"> {
  icon: React.ReactNode;
  size?: ButtonSize;
}

export function IconButton({
  icon,
  size = "md",
  ...props
}: IconButtonProps) {
  const sizeMap: Record<ButtonSize, string> = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <PremiumButton
      variant="ghost"
      size={size}
      className={cn("rounded-full p-0", sizeMap[size])}
      {...props}
    >
      <span className="flex items-center justify-center">{icon}</span>
    </PremiumButton>
  );
}

interface PremiumFabProps extends Omit<PremiumButtonProps, "size" | "variant"> {
  size?: "sm" | "md" | "lg";
}

export function PremiumFab({
  size = "md",
  children,
  className,
  ...props
}: PremiumFabProps) {
  const sizeMap: Record<"sm" | "md" | "lg", string> = {
    sm: "h-11 w-11",
    md: "h-13 w-13",
    lg: "h-15 w-15",
  };

  const iconSizeMap: Record<"sm" | "md" | "lg", string> = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-7 w-7",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.08, rotate: 5 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "fixed z-[95] flex items-center justify-center rounded-2xl",
        "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700",
        "border border-violet-400/40 shadow-[0_0_30px_rgba(124,58,237,0.5),0_8px_32px_rgba(0,0,0,0.25)]",
        "text-white",
        sizeMap[size],
        className
      )}
      {...props}
    >
      <span className={iconSizeMap[size]}>{children}</span>
    </motion.button>
  );
}

interface PremiumChipProps extends Omit<HTMLMotionProps<"button">, "children"> {
  selected?: boolean;
  accentColor?: string;
  children?: React.ReactNode;
}

export function PremiumChip({
  selected = false,
  accentColor = "#7c3aed",
  children,
  className,
  ...props
}: PremiumChipProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
        "border transition-all duration-200",
        selected
          ? "border-transparent text-white"
          : "border-slate-200/60 bg-white/80 text-slate-600 hover:border-slate-300/80",
        className
      )}
      style={
        selected
          ? {
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
              boxShadow: `0 4px 16px ${accentColor}40`,
            }
          : undefined
      }
      {...props}
    >
      {children}
    </motion.button>
  );
}