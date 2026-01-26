import { useParams } from 'react-router-dom';
import { useHub } from '../hooks/useHub';
import { PublicLink } from '../components/PublicLink';

export default function PublicHub(): JSX.Element {
  const { handle } = useParams<{ handle: string }>();
  const { hub, links, loading, error } = useHub(handle);

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
        </div>

        <div className="space-y-4">
          {links.map(link => (
            <PublicLink key={link.id} link={link} />
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
