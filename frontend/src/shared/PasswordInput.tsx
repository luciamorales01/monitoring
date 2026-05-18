import {
  useState,
  type CSSProperties,
  type ChangeEventHandler,
  type ReactNode,
} from 'react';
import { EyeIcon, EyeOffIcon } from './uiIcons';

type PasswordInputProps = {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  ariaInvalid?: boolean;
  containerClassName?: string;
  containerStyle?: CSSProperties;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  leadingIcon?: ReactNode;
};

export default function PasswordInput({
  value,
  onChange,
  autoComplete,
  placeholder,
  required = false,
  disabled = false,
  ariaInvalid,
  containerClassName,
  containerStyle,
  inputClassName,
  inputStyle,
  leadingIcon,
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const label = isVisible ? 'Ocultar contraseña' : 'Ver contraseña';

  const inputControl = (
    <>
      <input
        type={isVisible ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className={inputClassName}
        style={inputStyle}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setIsVisible((current) => !current)}
        aria-label={label}
        title={label}
        disabled={disabled}
      >
        {isVisible ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </>
  );

  if (!containerClassName && !containerStyle && !leadingIcon) {
    return inputControl;
  }

  return (
    <div className={containerClassName} style={containerStyle}>
      {leadingIcon}
      {inputControl}
    </div>
  );
}
