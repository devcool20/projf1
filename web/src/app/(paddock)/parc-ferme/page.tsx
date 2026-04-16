"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SharedLayout } from "@/components/motion/page-transition";
import { CardRail } from "@/components/parc-ferme/card-rail";
import { CardDetailView } from "@/components/parc-ferme/card-detail-view";
import { ParcFermeCard } from "@/components/parc-ferme/collectible-card";
import { withCardAssetVersion } from "@/lib/parc-card-assets";

const cardFiles = [
  "verstappen",
  "norris",
  "piastri",
  "russel",
  "leclerc",
  "hamilton",
  "sainz",
  "alonso",
  "stroll",
  "gasly",
  "ocon",
  "hadjar",
  "lawson",
  "colapinto",
  "bortoleto",
  "hulkenberg",
  "antonelli",
  "albon",
  "perez",
  "bearmen",
];

function toDisplayName(lastName: string) {
  if (lastName === "russel") return "Russell";
  if (lastName === "bearmen") return "Bearman";
  return lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
}

const allCardsSeed: ParcFermeCard[] = cardFiles.map((name, index) => ({
  id: `card-${index + 1}`,
  title: toDisplayName(name),
  artist: "Driver Card",
  description: `Collectible profile card for ${toDisplayName(name)} with smooth drag browsing and cinematic 3D detail reveal.`,
  imageSrc: withCardAssetVersion(`/cards/${name}.png`),
}));

export default function ParcFermePage() {
  const [cards] = useState(allCardsSeed);
  const [activeCard, setActiveCard] = useState<ParcFermeCard | null>(null);
  const cardById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);

  const handleCardSelect = (card: ParcFermeCard) => {
    setActiveCard(cardById.get(card.id) ?? card);
  };

  return (
    <SharedLayout itemId="parc-ferme-spotlight-cards">
      <div className="parc-page-shell box-border flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#02050c]">
        <div className="parc-spotlight-page relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-2 pt-4 md:px-7 md:pb-3 md:pt-5">
          <div className="parc-spotlight-bg" />
          <div className="parc-center-line" />
          <div className="parc-grid-layer" />

          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="parc-headline-grid relative z-10 grid shrink-0 items-end gap-3 md:grid-cols-2 md:gap-4"
          >
            <div>
              <p className="parc-kicker">Parc Ferme</p>
              <h1 className="parc-title">Discover the future of collectibles</h1>
            </div>
            <p className="parc-copy">
              Premium card rails with lane-aware interaction, 3D reveal transitions, and responsive micro-interactions for an addictive browse flow.
            </p>
          </motion.section>

          <div className="parc-chip-wrap mt-2 shrink-0 md:mt-3">
            <span className="parc-chip">Exclusive cards from top creators</span>
          </div>

          <section className="parc-rails-wrap relative z-10 min-h-0">
            <CardRail cards={cards} onSelectCard={handleCardSelect} />
          </section>

          <div className="parc-footer-cta relative z-10 shrink-0">
            <p>Join thousands of collectors today</p>
          </div>

          <CardDetailView card={activeCard} onClose={() => setActiveCard(null)} />
        </div>
      </div>
    </SharedLayout>
  );
}
