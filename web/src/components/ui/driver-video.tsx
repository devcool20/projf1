import { useState } from "react";
import { UserIcon } from "@heroicons/react/24/outline";

type Props = {
  driverName: string | null;
  className?: string; // e.g. "w-16 h-16"
};

export function DriverVideo({ driverName, className = "h-16 w-16" }: Props) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  if (!driverName || driverName === "None" || driverName.trim().length === 0) {
    // If no driver selected, show a beautiful ghost/placeholder
    return (
      <div className={`relative overflow-hidden rounded bg-surface-container-high border border-outline-variant/30 flex items-center justify-center ${className}`}>
        <UserIcon className="w-1/2 h-1/2 text-on-surface-variant/50" aria-hidden />
        {/* Vignette */}
        <div className="absolute inset-0 rounded shadow-[inset_0_0_12px_rgba(0,0,0,0.8)] pointer-events-none" />
      </div>
    );
  }

  const firstName = driverName.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  const videoSrc = `/api/avatar/${firstName}`;
  
  // Create initials for the thumbnail placeholder
  const initials = driverName
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className={`relative overflow-hidden rounded bg-surface border border-outline-variant/20 shadow-xl flex items-center justify-center isolation-auto transform-gpu ${className}`}>
      
      {/* Thumbnail Placeholder (Visible until video loads) */}
      <div 
        className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-container-high to-surface-dim transition-opacity duration-500 z-10 ${isVideoLoaded ? 'opacity-0' : 'opacity-100'}`}
      >
        <span className="font-headline font-bold text-on-surface-variant/50 tracking-wider">
          {initials}
        </span>
      </div>

      {/* Actual Video */}
      <video
        src={videoSrc}
        className={`absolute inset-0 w-full h-full object-cover scale-[1.15] transition-opacity duration-1000 ease-out`}
        autoPlay
        loop
        muted
        playsInline
        onCanPlay={() => setIsVideoLoaded(true)}
      />

      {/* Very subtle Vignette Overlay to soften edges - inside the border */}
      <div className="absolute inset-0 rounded pointer-events-none mix-blend-multiply z-20 shadow-[inset_0_0_8px_2px_rgba(14,14,16,0.6)]" />
      <div className="absolute inset-0 rounded pointer-events-none z-20 shadow-[inset_0_0_4px_rgba(0,0,0,0.3)] ring-1 ring-inset ring-black/20" />
    </div>
  );
}
