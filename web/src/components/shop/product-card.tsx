"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Product } from "@/lib/types";

type Props = {
  product: Product;
  onEquip: (product: Product) => void;
};

export function ProductCard({ product, onEquip }: Props) {
  return (
    <motion.article
      whileHover={{ scale: 1.02, rotateX: 4, rotateY: -4 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="dashboard-panel group relative overflow-hidden p-3"
      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
    >
      <div className="relative h-52">
        <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="font-headline text-lg">{product.name}</p>
          <p className="font-mono text-xs text-on-surface-variant">${product.price}</p>
        </div>
        <button
          type="button"
          onClick={() => onEquip(product)}
          className="btn-premium btn-secondary px-3 py-2 font-headline text-xs tracking-[0.2em]"
        >
          EQUIP
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-0 translate-y-full border-t border-outline-variant/20 bg-surface-container-high p-3 transition-transform duration-300 group-hover:translate-y-0">
        {product.specs.map((spec) => (
          <p key={spec} className="font-mono text-[11px] text-on-surface-variant">
            {spec}
          </p>
        ))}
      </div>
    </motion.article>
  );
}
