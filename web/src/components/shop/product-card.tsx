"use client";

import { motion } from "framer-motion";
import { Product } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type Props = {
  product: Product;
  onEquip: (product: Product) => void;
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

export function ProductCard({ product, onEquip }: Props) {
  return (
    <motion.article
      whileHover={{ scale: 1.02, rotateX: 4, rotateY: -4 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="dashboard-panel group relative overflow-hidden p-3"
      style={{ transformStyle: "preserve-3d", perspective: 1000 }}
    >
      <div className="relative h-52">
        <ImageWithLoader
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover"
          containerClass="h-full w-full"
        />
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
