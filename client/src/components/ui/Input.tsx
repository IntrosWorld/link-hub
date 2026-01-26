import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { InputProps } from '../../types/components';

export function Input({ className, ...props }: InputProps): JSX.Element {
  return (
    <input
      className={twMerge(
        'w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-green/50',
        className
      )}
      {...props}
    />
  );
}
