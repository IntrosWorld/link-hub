import React, { useContext, useState, useEffect, createContext } from "react";
import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { AuthContextValue, AuthProviderProps } from "../types/auth";
import { UsernameSelector } from "../components/UsernameSelector";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [currentUser, setCurrentUser] = useState<AuthContextValue['currentUser']>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [hasUsername, setHasUsername] = useState<boolean>(false);
  const [checkingUsername, setCheckingUsername] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const signup = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const login = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  const checkUserUsername = async (user: AuthContextValue['currentUser']) => {
    if (!user) {
      setHasUsername(false);
      setUsername(null);
      return;
    }

    setCheckingUsername(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.hasUsername && data.user) {
        setHasUsername(true);
        setUsername(data.user.username);
      } else {
        setHasUsername(false);
        setUsername(null);
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setHasUsername(false);
    } finally {
      setCheckingUsername(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await checkUserUsername(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleUsernameSet = (newUsername: string) => {
    setUsername(newUsername);
    setHasUsername(true);
  };

  const value: AuthContextValue = {
    currentUser,
    username,
    hasUsername,
    signup,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {loading || checkingUsername ? (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mb-4"></div>
            <p className="text-zinc-400">Loading...</p>
          </div>
        </div>
      ) : (
        <>
          {currentUser && !hasUsername && (
            <UsernameSelector currentUser={currentUser} onUsernameSet={handleUsernameSet} />
          )}
          {children}
        </>
      )}
    </AuthContext.Provider>
  );
}
