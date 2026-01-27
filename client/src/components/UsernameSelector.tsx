import { useState } from 'react';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Check, X, Loader2 } from 'lucide-react';
import { User } from 'firebase/auth';

interface UsernameSelectorProps {
  currentUser: User;
  onUsernameSet: (username: string) => void;
}

export function UsernameSelector({ currentUser, onUsernameSet }: UsernameSelectorProps) {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validateUsername = (value: string): boolean => {
    const regex = /^[a-zA-Z0-9_-]{3,20}$/;
    return regex.test(value);
  };

  const checkAvailability = async (value: string) => {
    if (!validateUsername(value)) {
      setAvailable(null);
      return;
    }

    setChecking(true);
    setError('');

    try {
      const response = await fetch(`/api/users/check/${value.toLowerCase()}`);
      const data = await response.json();
      setAvailable(data.available);
    } catch (err) {
      console.error('Error checking username:', err);
      setError('Failed to check availability');
    } finally {
      setChecking(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setAvailable(null);
    setError('');

    if (value.length >= 3) {
      const timeoutId = setTimeout(() => checkAvailability(value), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateUsername(username)) {
      setError('Username must be 3-20 characters (letters, numbers, underscores, hyphens only)');
      return;
    }

    if (available === false) {
      setError('Username is not available');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = await currentUser.getIdToken();

      const response = await fetch('/api/users/username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: username.toLowerCase() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set username');
      }

      onUsernameSet(username.toLowerCase());
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-2">Choose Your Username</h2>
        <p className="text-zinc-400 text-sm mb-6">
          Your username will be part of your public hub URLs: <span className="text-brand-green">yoursite.com/username/hub</span>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <div className="relative">
              <Input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="username"
                className="pr-10"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {checking && <Loader2 className="animate-spin text-zinc-400" size={20} />}
                {!checking && available === true && <Check className="text-green-500" size={20} />}
                {!checking && available === false && <X className="text-red-500" size={20} />}
              </div>
            </div>

            <p className="text-xs text-zinc-500 mt-2">
              3-20 characters • Letters, numbers, underscores, hyphens
            </p>

            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}

            {available === true && (
              <p className="text-green-500 text-sm mt-2">Username is available!</p>
            )}

            {available === false && (
              <p className="text-red-500 text-sm mt-2">Username is already taken</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={!username || available !== true || submitting}
            className="w-full"
          >
            {submitting ? 'Setting username...' : 'Continue'}
          </Button>
        </form>

        <p className="text-xs text-zinc-500 mt-4 text-center">
          Username cannot be changed once set
        </p>
      </div>
    </div>
  );
}
