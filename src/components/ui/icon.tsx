import { lazy, Suspense } from 'react';
import type { LucideProps } from 'lucide-react';

// Lazy load de iconos para reducir el bundle inicial
const iconLoader = (name: string) =>
  lazy(() =>
    import('lucide-react').then((module) => ({
      default: module[name as keyof typeof module] as React.ComponentType<LucideProps>,
    }))
  );

interface IconProps extends LucideProps {
  name: string;
}

export function Icon({ name, ...props }: IconProps) {
  const IconComponent = iconLoader(name);
  
  return (
    <Suspense fallback={<div className={props.className} style={{ width: props.size || 24, height: props.size || 24 }} />}>
      <IconComponent {...props} />
    </Suspense>
  );
}
