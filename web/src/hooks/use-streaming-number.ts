"use client";

import { useEffect, useState } from "react";

export function useStreamingNumber(min: number, max: number, initial: number) {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const interval = setInterval(() => {
      setValue(Math.floor(Math.random() * (max - min + 1)) + min);
    }, 1200);

    return () => clearInterval(interval);
  }, [max, min]);

  return value;
}
