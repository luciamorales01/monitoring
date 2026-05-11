import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ButtonVariant } from './Button';
import './button.css';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  variant?: ButtonVariant;
};

export default function IconButton({
  className,
  icon,
  label,
  type = 'button',
  variant = 'secondary',
  ...props
}: IconButtonProps) {
  const classes = ['ui-icon-button', `ui-icon-button--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      aria-label={label}
      className={classes}
      title={label}
      type={type}
      {...props}
    >
      {icon}
    </button>
  );
}
