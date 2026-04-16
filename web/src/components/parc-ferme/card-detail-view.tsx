"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";
import { ParcFermeCard } from "./collectible-card";

type CardDetailViewProps = {
  card: ParcFermeCard | null;
  onClose: () => void;
};

export function CardDetailView({ card, onClose }: CardDetailViewProps) {
  return (
    <AnimatePresence>
      {card && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="parc-detail-layer fixed inset-0 z-90 pointer-events-none"
        >
          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.78, rotateY: -56, rotateX: 13 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0, rotateX: 0 }}
            exit={{ opacity: 0, y: 80, scale: 0.84, rotateY: 46, rotateX: -8 }}
            transition={{
              type: "spring",
              stiffness: 230,
              damping: 24,
              mass: 0.88,
            }}
            className="parc-detail-panel pointer-events-auto absolute bottom-4 left-4 right-4 h-[78dvh] overflow-hidden rounded-3xl border border-white/15 bg-slate-950/96 shadow-[0_26px_72px_rgba(2,6,23,0.58)] lg:bottom-auto lg:left-auto lg:right-6 lg:top-6 lg:h-[calc(100dvh-3rem)] lg:w-[min(520px,40vw)]"
          >
            <button type="button" onClick={onClose} className="parc-detail-close" aria-label="Close details">
              <X className="h-4 w-4" />
            </button>

            <div className="parc-detail-scroll premium-scrollbar p-4 sm:p-5">
              <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
                <div className="parc-collectible-frame">
                  <div className="parc-collectible-badge">Legendary</div>
                  <div className="parc-collectible-image-wrap">
                    {card.imageSrc ? (
                      <div className="relative h-[240px] w-full sm:h-[270px]">
                        <Image
                          src={card.imageSrc}
                          alt={card.title}
                          fill
                          sizes="240px"
                          className="parc-detail-image"
                          unoptimized={card.imageSrc.startsWith("/cards/")}
                        />
                      </div>
                    ) : (
                      <div className="parc-detail-image-placeholder">
                        <span>Image Placeholder</span>
                      </div>
                    )}
                  </div>
                  <div className="parc-collectible-footer">
                    <p className="parc-collectible-driver">{card.title}</p>
                    <p className="parc-collectible-meta">{card.artist}</p>
                  </div>
                </div>

                <div>
                  <p className="parc-detail-kicker">Driver collectible</p>
                  <h3 className="parc-detail-title">{card.title}</h3>
                  <p className="parc-detail-subtitle">Paddock Parc Fermé series</p>
                  <p className="parc-detail-description">
                    Limited driver portrait card for {card.title}. Part of the Parc Fermé grid collection—tap
                    the rail to browse, open the center card for details.
                  </p>

                  <div className="parc-detail-tags">
                    <span>F1</span>
                    <span>Portrait</span>
                    <span>Limited</span>
                    <span>Parc Fermé</span>
                  </div>

                  <div className="parc-spec-grid">
                    <div>
                      <p className="parc-spec-label">Driver</p>
                      <p className="parc-spec-value">{card.title}</p>
                    </div>
                    <div>
                      <p className="parc-spec-label">Collection</p>
                      <p className="parc-spec-value">Parc Fermé Grid</p>
                    </div>
                    <div>
                      <p className="parc-spec-label">Season</p>
                      <p className="parc-spec-value">2026</p>
                    </div>
                    <div>
                      <p className="parc-spec-label">Rarity</p>
                      <p className="parc-spec-value">Legendary</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
