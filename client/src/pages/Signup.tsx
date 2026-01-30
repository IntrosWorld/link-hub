import React, { useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Signup(): JSX.Element {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmRef = useRef<HTMLInputElement>(null);
  const { signup } = useAuth();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (passwordRef.current!.value.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (passwordRef.current!.value !== passwordConfirmRef.current!.value) {
      setError("Passwords do not match");
      return;
    }

    try {
      setError("");
      setLoading(true);
      await signup(emailRef.current!.value, passwordRef.current!.value);
      navigate("/admin");
    } catch {
      setError("Failed to create an account");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-zinc-900 rounded-full border-2 border-brand-green flex items-center justify-center text-3xl font-bold text-brand-green shadow-[0_0_20px_rgba(0,255,136,0.3)]">
            S
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Create your account
          </h2>
        </div>
        {error && (
          <div className="bg-red-950/50 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg" role="alert">
            {error}
          </div>
        )}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <input
                ref={emailRef}
                type="email"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 placeholder-zinc-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition-all sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <input
                ref={passwordRef}
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 placeholder-zinc-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition-all sm:text-sm"
                placeholder="Password"
              />
            </div>
            <div>
              <input
                ref={passwordConfirmRef}
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 bg-zinc-900 border border-zinc-800 placeholder-zinc-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition-all sm:text-sm"
                placeholder="Confirm Password"
              />
            </div>
          </div>

          <div>
            <button
              disabled={loading}
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-black bg-brand-green hover:bg-brand-green/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green focus:ring-offset-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:shadow-[0_0_30px_rgba(0,255,136,0.4)]"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
        </form>
        <div className="text-center">
          <Link to="/login" className="font-medium text-brand-green hover:text-brand-green/80 transition-colors">
            Already have an account? Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
