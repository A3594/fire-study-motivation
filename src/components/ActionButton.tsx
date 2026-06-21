import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export function ActionButton({ children, variant = 'secondary', className = '', ...props }: ActionButtonProps) {
  return (
    <button className={`action-button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
