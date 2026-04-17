'use client';

type Variant = 'default' | 'elevated' | 'outlined';
type Padding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  variant?: Variant;
  padding?: Padding;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-[#2a2035] rounded-xl',
  elevated: 'bg-[#2a2035] rounded-xl shadow-lg shadow-black/20',
  outlined: 'bg-[#2a2035] rounded-xl border border-[#3d3248]',
};

const paddingClasses: Record<Padding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

export default function Card({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
}: CardProps) {
  return (
    <div
      className={[variantClasses[variant], paddingClasses[padding], className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
