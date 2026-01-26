import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { Link } from './api';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export interface LinkCardProps {
  link: Link;
  onDelete: (id: number) => void | Promise<void>;
}

export interface PublicLinkProps {
  link: Link;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}
