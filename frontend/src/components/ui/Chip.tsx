import React from 'react';
import clsx from 'clsx';

export interface ChipProps {
  label: string;
  variant?: 'teal' | 'muted' | 'neutral' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  onClick?: () => void;
  active?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'teal',
  size = 'sm',
  onClick,
  active = false,
  icon,
  className,
}) => {
  const isClickable = !!onClick;

  const variantStyles = {
    teal: active
      ? 'bg-brand-teal text-[#07110f] font-semibold shadow-sm'
      : 'bg-brand-teal/10 text-brand-teal border border-brand-teal/30 hover:bg-brand-teal/20',
    muted: active
      ? 'bg-brand-border text-brand-heading font-semibold'
      : 'bg-brand-surface-hover/80 text-brand-body border border-brand-border hover:text-brand-heading',
    neutral: active
      ? 'bg-brand-border text-brand-heading font-semibold'
      : 'bg-brand-surface-hover/80 text-brand-body border border-brand-border hover:text-brand-heading',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
    danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3.5 py-1.5 gap-2',
  };

  return (
    <span
      onClick={onClick}
      className={clsx(
        'inline-flex items-center rounded-full font-medium transition-all select-none',
        sizeStyles[size],
        variantStyles[variant],
        isClickable && 'cursor-pointer active:scale-95',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {label}
    </span>
  );
};
