'use client';

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info';
type Size = 'sm' | 'md';

interface BadgeProps {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-[#3d3248] text-[#a89b8c]',
  success: 'bg-[#27ae60]/20 text-[#27ae60]',
  warning: 'bg-[#f5a623]/20 text-[#f5a623]',
  error: 'bg-[#e74c3c]/20 text-[#e74c3c]',
  info: 'bg-[#3b82f6]/20 text-[#3b82f6]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export default function Badge({
  variant = 'default',
  size = 'md',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
