"use client";

import { motion } from "framer-motion";
import { Team, Transcript } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type Props = {
  transcript: Transcript;
  team: Team | undefined;
};

function ImageWithLoader({
  src,
  alt,
  className = "",
  containerClass = "",
}: {
  src: string;
  alt: string;
  className?: string;
  containerClass?: string;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${containerClass}`}>
      {!isLoaded && !isError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-container-low">
          <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant" />
        </div>
      )}
      <img
        key={src}
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsError(true)}
        className={`${className} ${isLoaded ? "opacity-100" : "opacity-0"} transition-opacity`}
      />
      {isError && <div className="absolute inset-0 z-20 flex items-center justify-center text-xs text-on-surface-variant">Image unavailable</div>}
    </div>
  );
}

export function TranscriptCard({ transcript, team }: Props) {
  const borderColor = transcript.severity === "warning" ? "#e10600" : team?.accent ?? "#7ef6ee";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="dashboard-panel p-4"
      style={{ borderLeftColor: borderColor, borderLeftWidth: 4 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-headline text-sm font-semibold">{transcript.handle}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
            {transcript.timestamp} {"//"} {transcript.channel}
          </p>
        </div>
        <span className="font-mono text-[10px] text-on-surface-variant">{transcript.author}</span>
      </div>

      <p className="mt-3 font-headline text-lg leading-relaxed text-on-surface/90">{transcript.message}</p>

      {transcript.mediaUrl && (
        <div className="relative mt-4 h-44 overflow-hidden">
          <ImageWithLoader
            src={transcript.mediaUrl}
            alt="Telemetry media frame"
            className="h-full w-full object-cover grayscale hover:grayscale-0"
            containerClass="h-full w-full"
          />
        </div>
      )}

      <div className="mt-3 flex gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-variant">
        <span>{transcript.likes.toLocaleString()} likes</span>
        <span>{transcript.comments.toLocaleString()} comments</span>
      </div>
    </motion.article>
  );
}
