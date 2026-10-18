import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hover = false,
  className,
  ...props
}) => {
  return (
    <div
      className={clsx(
        'bg-brand-surface border border-brand-border rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-surface transition-all duration-200',
        hover && 'hover:border-brand-teal/40 hover:-translate-y-0.5 hover:shadow-teal-glow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

