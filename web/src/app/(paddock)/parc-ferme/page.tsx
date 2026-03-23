"use client";

import { ProductCard } from "@/components/shop/product-card";
import { products } from "@/lib/mock-data";
import { Product } from "@/lib/types";
import { useState } from "react";

export default function ParcFermePage() {
  const [equipped, setEquipped] = useState<Product[]>([]);

  const onEquip = (product: Product) => {
    setEquipped((prev) => (prev.find((item) => item.id === product.id) ? prev : [product, ...prev]));
  };

  return (
    <div>
      <div className="mb-4 flex items-end justify-between border-b border-primary/20 pb-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">Parc Ferme</p>
          <h2 className="font-headline text-3xl font-bold">Gear Loadout</h2>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
          Equipped units: {equipped.length}
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onEquip={onEquip} />
        ))}
      </section>

      <section className="dashboard-panel mt-5 p-4">
        <h3 className="font-headline text-xl">Current Loadout</h3>
        {equipped.length === 0 ? (
          <p className="mt-2 text-sm text-on-surface-variant">No units equipped yet. Use EQUIP to build your race kit.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {equipped.map((item) => (
              <li key={item.id} className="flex items-center justify-between border border-outline-variant/20 px-3 py-2">
                <span className="font-headline text-sm">{item.name}</span>
                <span className="font-mono text-xs text-secondary">${item.price}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
