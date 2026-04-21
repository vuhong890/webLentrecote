'use client';
import Image from 'next/image';

/**
 * A wrapper around next/image that mimics background-image behavior.
 * Renders an absolutely-positioned Image inside a relative container.
 * Falls back to a gradient + emoji when no src is provided.
 */
export default function OptimizedBgImage({
  src,
  alt = '',
  priority = false,
  sizes = '100vw',
  quality = 75,
  fallbackGradient = 'linear-gradient(135deg, #2a1a0a 0%, #4a2a1a 100%)',
  fallbackEmoji,
  className,
  style,
  children,
}) {
  if (!src) {
    return (
      <div
        className={className}
        style={{ ...style, background: fallbackGradient, position: 'relative' }}
      >
        {fallbackEmoji && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {fallbackEmoji}
          </div>
        )}
        {children}
      </div>
    );
  }

  return (
    <div className={className} style={{ ...style, position: 'relative', overflow: 'hidden' }}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        quality={quality}
        priority={priority}
        style={{ objectFit: 'cover', objectPosition: 'center' }}
      />
      {children}
    </div>
  );
}
