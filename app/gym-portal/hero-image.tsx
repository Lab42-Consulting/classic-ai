"use client";

import { useEffect, useState } from "react";

/** Crossfades through a set of hero photos (subtle, ~5s each). */
export function HeroImage({ images, alt }: { images: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 5000);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <>
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ${i === idx ? "opacity-100" : "opacity-0"}`}
        />
      ))}
    </>
  );
}
