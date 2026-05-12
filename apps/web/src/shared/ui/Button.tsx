import { Link } from 'react-router-dom';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  icon?: ReactNode;
  to?: string;
  variant?: ButtonVariant;
};

export default function Button({
  children,
  className,
  disabled,
  icon,
  to,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const classes = ['ui-button', `ui-button--${variant}`, className]
    .filter(Boolean)
    .join(' ');
  const content = (
    <>
      {icon}
      {children}
    </>
  );

  if (to) {
    return (
      <Link
        aria-disabled={disabled ? 'true' : undefined}
        className={classes}
        onClick={disabled ? (event) => event.preventDefault() : undefined}
        to={to}
      >
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled} type={type} {...props}>
      {content}
    </button>
  );
}
