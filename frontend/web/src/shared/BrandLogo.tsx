import type { CSSProperties } from 'react';

type BrandLogoProps = {
  alt?: string;
  className?: string;
  size?: number;
  style?: CSSProperties;
};

export default function BrandLogo({
  alt = 'Monitoring',
  className,
  size = 32,
  style,
}: BrandLogoProps) {
  return (
    <img
      src="/favicon.svg"
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{
        display: 'block',
        width: size,
        height: size,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
