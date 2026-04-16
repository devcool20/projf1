"use client";

import Image from "next/image";
import { CSSProperties } from "react";

export type ParcFermeCard = {
  id: string;
  title: string;
  artist: string;
  description: string;
  imageSrc?: string;
};

type CollectibleCardProps = {
  card: ParcFermeCard;
  isCenter: boolean;
  className?: string;
  style?: CSSProperties;
};

export function CollectibleCard({ card, isCenter, className = "", style }: CollectibleCardProps) {
  return (
    <div
      className={`parc-show-card pointer-events-none ${isCenter ? "parc-show-card--center" : ""} ${className}`}
      style={style}
      aria-hidden
    >
      <div className="parc-card-image-slot">
        {card.imageSrc ? (
          <Image
            src={card.imageSrc}
            alt={card.title}
            fill
            sizes="(max-width: 640px) 156px, 182px"
            className="parc-card-image"
            priority={isCenter}
            unoptimized={card.imageSrc.startsWith("/cards/")}
          />
        ) : (
          <div className="parc-card-placeholder absolute inset-0 flex items-center justify-center">
            <span className="parc-card-placeholder-label">Image Placeholder</span>
          </div>
        )}
      </div>
      <div className="parc-card-gloss" />
      <div className="parc-card-meta">
        <p className="parc-card-title">{card.title}</p>
        <p className="parc-card-subtitle">{card.artist}</p>
      </div>
    </div>
  );
}
