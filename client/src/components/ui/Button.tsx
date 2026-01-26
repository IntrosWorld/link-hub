import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ButtonProps } from '../../types/components';

export function Button({ className, variant = 'primary', disabled, ...props }: ButtonProps): JSX.Element {
  return (
    <button
      className={twMerge(
        clsx(
          'px-4 py-2 rounded-lg font-bold transition-all duration-200 active:scale-95',
          {
            'bg-brand-green text-black hover:bg-green-400': variant === 'primary',
            'bg-zinc-800 text-white hover:bg-zinc-700': variant === 'secondary',
            'bg-red-500/10 text-red-500 hover:bg-red-500/20': variant === 'danger',
            'text-zinc-400 hover:text-white': variant === 'ghost',
            'opacity-50 cursor-not-allowed': disabled,
          }
        ),
        className
      )}
      disabled={disabled}
      {...props}
    />
  );
}
