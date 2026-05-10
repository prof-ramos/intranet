'use client';

/**
 * Reusable Button component following ASOF Design System.
 *
 * Example usage:
 * ```tsx
 * import Button from '@/components/ui/Button';
 *
 * <Button variant="primary" onClick={handleSave}>
 *   Salvar
 * </Button>
 *
 * <Button variant="secondary" asChild>
 *   <Link href="/app/associados">Voltar</Link>
 * </Button>
 *
 * <Button variant="danger" isLoading>
 *   Remover
 * </Button>
 * ```
 */

import React, { forwardRef, useEffect } from 'react';
import {
  focusRingClass,
  navy,
  primaryContainerHover,
  error,
  buttonOutlineBorder,
  buttonOutlineHoverBg,
} from '@/lib/ui/tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'default' | 'sm';
  isLoading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  asChild?: boolean;
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'default',
    isLoading = false,
    disabled = false,
    iconLeft,
    iconRight,
    asChild = false,
    children,
    className = '',
    ...props
  },
  ref
) {
  const isDisabled = disabled || isLoading;

  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' &&
      asChild &&
      (iconLeft || iconRight || isLoading)
    ) {
      console.warn(
        'Button: iconLeft, iconRight, and isLoading are incompatible with asChild.'
      );
    }
  }, [asChild, iconLeft, iconRight, isLoading]);

  const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[var(--btn-bg)] text-white hover:bg-[var(--btn-hover-bg)] shadow-[var(--btn-shadow)]',
    secondary:
      'bg-white text-[var(--btn-text)] border border-[var(--btn-border)] hover:bg-[var(--btn-hover-bg)]',
    ghost:
      'bg-transparent text-[var(--btn-text)] hover:bg-[var(--btn-hover-bg)]',
    danger:
      'bg-[var(--btn-bg)] text-white hover:bg-[var(--btn-hover-bg)]',
  };

  const variantPadding: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'px-5',
    secondary: 'px-4',
    ghost: 'px-4',
    danger: 'px-5',
  };

  const variantVars: Record<
    NonNullable<ButtonProps['variant']>,
    React.CSSProperties
  > = {
    primary: {
      '--btn-bg': navy,
      '--btn-hover-bg': primaryContainerHover,
      '--btn-shadow': `0 4px 0 ${navy}1f`,
    } as React.CSSProperties,
    secondary: {
      '--btn-text': navy,
      '--btn-border': buttonOutlineBorder,
      '--btn-hover-bg': buttonOutlineHoverBg,
    } as React.CSSProperties,
    ghost: {
      '--btn-text': navy,
      '--btn-hover-bg': buttonOutlineHoverBg,
    } as React.CSSProperties,
    danger: {
      '--btn-bg': error,
      '--btn-hover-bg': '#991b1b',
    } as React.CSSProperties,
  };

  const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
    default: 'h-10',
    sm: 'h-8',
  };

  const paddingStyles: Record<NonNullable<ButtonProps['size']>, string> = {
    default: 'px-4',
    sm: 'px-3',
  };

  const mergedClassName = [
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150',
    'text-[13px] leading-[1.2] font-[Google_Sans,sans-serif]',
    focusRingClass,
    variantClasses[variant],
    sizeStyles[size],
    paddingStyles[size],
    variantPadding[variant],
    isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
    className,
  ].join(' ');

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      className?: string;
      'aria-disabled'?: string;
      tabIndex?: number;
      [key: string]: unknown;
    }>;
    const childClassName: string = child.props.className ?? '';

    const forwardedProps: Record<string, unknown> = {};
    for (const key of Object.keys(props)) {
      if (
        key !== 'type' &&
        key !== 'disabled' &&
        key !== 'form' &&
        key !== 'formAction' &&
        key !== 'formEnctype' &&
        key !== 'formMethod' &&
        key !== 'formNoValidate' &&
        key !== 'formTarget' &&
        key !== 'name' &&
        key !== 'value'
      ) {
        forwardedProps[key] = props[key as keyof typeof props];
      }
    }

    return React.cloneElement(child, {
      ...(forwardedProps as Record<string, unknown>),
      ref,
      className: [childClassName, mergedClassName].filter(Boolean).join(' '),
      'aria-disabled': isDisabled ? 'true' : undefined,
      tabIndex: isDisabled ? -1 : undefined,
      style: variantVars[variant],
    });
  }

  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      disabled={isDisabled}
      className={mergedClassName}
      style={variantVars[variant]}
      {...props}
    >
      {isLoading && <Spinner />}
      {!isLoading && iconLeft}
      <span className="inline-flex items-center">{children}</span>
      {!isLoading && iconRight}
    </button>
  );
});

export default Button;
