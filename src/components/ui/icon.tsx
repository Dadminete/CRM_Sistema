import React, { lazy, Suspense } from 'react';
import type { LucideProps } from 'lucide-react';

interface IconProps extends LucideProps {
  name: string;
}

const iconCache: Record<string, React.LazyExoticComponent<React.ComponentType<LucideProps>>> = {};

export function Icon({ name, ...props }: IconProps) {
  if (!name) return null;

  // Use cached lazy component or create new one
  if (!iconCache[name]) {
    iconCache[name] = lazy(() =>
      import('lucide-react').then((module) => ({
        default: module[name as keyof typeof module] as React.ComponentType<LucideProps>,
      }))
    );
  }

  const IconComponent = iconCache[name];

  return (
    <Suspense fallback={<div className={props.className} style={{ width: props.size || 24, height: props.size || 24 }} />}>
      <IconComponent {...props} />
    </Suspense>
  );
}
