"use client";

import { useState } from "react";

type PlaceImageProps = {
  src?: string | null;
  alt: string;
  sizes: string;
  className: string;
  priority?: boolean;
};

const SUPABASE_OBJECT_SEGMENT = "/storage/v1/object/public/";
const SUPABASE_RENDER_SEGMENT = "/storage/v1/render/image/public/";
const SUPABASE_WIDTHS = [480, 720, 960];
const SUPABASE_QUALITY = 72;

type OptimizedSource = {
  src: string;
  srcSet?: string;
};

function buildSupabaseVariant(url: URL, width: number) {
  const nextUrl = new URL(url.toString());
  nextUrl.pathname = nextUrl.pathname.replace(
    SUPABASE_OBJECT_SEGMENT,
    SUPABASE_RENDER_SEGMENT
  );
  nextUrl.searchParams.set("width", String(width));
  nextUrl.searchParams.set("quality", String(SUPABASE_QUALITY));
  return nextUrl.toString();
}

function getOptimizedSource(src: string): OptimizedSource {
  try {
    const parsed = new URL(src);
    if (
      parsed.hostname.endsWith(".supabase.co") &&
      parsed.pathname.includes(SUPABASE_OBJECT_SEGMENT)
    ) {
      return {
        src: buildSupabaseVariant(parsed, SUPABASE_WIDTHS[1]),
        srcSet: SUPABASE_WIDTHS.map(
          (width) => `${buildSupabaseVariant(parsed, width)} ${width}w`
        ).join(", "),
      };
    }
  } catch {
    return { src };
  }

  return { src };
}

export default function PlaceImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
}: PlaceImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900">
        <span className="material-symbols-outlined text-4xl text-slate-400">image</span>
      </div>
    );
  }

  const optimized = getOptimizedSource(src);

  return (
    // We intentionally bypass `next/image` here to avoid the extra optimizer hop
    // for feed cards and serve smaller transformed files directly from Supabase.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={optimized.src}
      srcSet={optimized.srcSet}
      sizes={sizes}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
    />
  );
}
