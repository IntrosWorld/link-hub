import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useHub } from '../hooks/useHub';
import { PublicLink } from '../components/PublicLink';
import { useAuth } from '../contexts/AuthContext';

export default function PublicHub(): JSX.Element {
  const { handle, username } = useParams<{ handle?: string; username?: string }>();
  const { currentUser } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!currentUser) {
      setToken(null);
      return undefined;
    }

    currentUser.getIdToken()
      .then((idToken) => {
        if (active) setToken(idToken);
      })
      .catch(() => {
        if (active) setToken(null);
      });

    return () => {
      active = false;
    };
  }, [currentUser]);

  const { hub, links, loading, error } = useHub(handle, username, token);

  const resolveLink = async (linkId: number): Promise<void> => {
    try {
      const response = await fetch(`/api/links/resolve/${linkId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Access denied');
      }
      window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open link';
      alert(message);
    }
  };

  if (loading) return <div className="min-h-screen bg-black text-brand-green flex items-center justify-center">Loading...</div>;
  if (error) return <div className="min-h-screen bg-black text-red-500 flex items-center justify-center">Error: {error}</div>;
  if (!hub) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Hub not found</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
      <div className="max-w-md w-full space-y-8 mt-12">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-zinc-900 rounded-full border-2 border-brand-green flex items-center justify-center text-4xl font-bold text-brand-green shadow-[0_0_20px_rgba(0,255,136,0.3)]">
            {hub.title ? hub.title[0].toUpperCase() : 'H'}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{hub.title}</h1>
          <p className="text-zinc-400">{hub.description}</p>
          {hub.username && <p className="text-sm text-zinc-500">@{hub.username}</p>}
        </div>

        <div className="space-y-4">
          {links.map(link => (
            <PublicLink key={link.id} link={link} onOpen={resolveLink} />
          ))}
          {links.length === 0 && (
            <div className="text-center text-zinc-600 p-4 border border-zinc-900 border-dashed rounded-lg">
              No active links right now.
            </div>
          )}
        </div>

        <footer className="pt-12 text-center text-zinc-600 text-sm">
          Powered by <span className="text-brand-green font-bold">SmartHub</span>
        </footer>
      </div>
    </div>
  );
}
