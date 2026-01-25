import { useState, useEffect } from 'react';
import { Plus, Layout, BarChart, Settings, Link as LinkIcon, ExternalLink, LogOut } from 'lucide-react';
import { useHub } from '../hooks/useHub';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LinkCard } from '../components/LinkCard';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const [hubs, setHubs] = useState([]);
    const [selectedHubHandle, setSelectedHubHandle] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newHubHandle, setNewHubHandle] = useState('');
    const [isAddingLink, setIsAddingLink] = useState(false);
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    // Hub Data
    const { hub, links, refresh, loading } = useHub(selectedHubHandle);

    // Load Hubs
    useEffect(() => {
        async function fetchHubs() {
            if (!currentUser) return;

            try {
                const token = await currentUser.getIdToken();
                console.log('Fetching hubs with token...');

                const res = await fetch('/api/hubs', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) {
                    throw new Error(`Failed to fetch hubs: ${res.status} ${res.statusText}`);
                }

                const data = await res.json();
                console.log('Fetched hubs:', data);
                setHubs(data);
            } catch (error) {
                console.error('Error fetching hubs:', error);
                // Don't crash, just show empty hubs list
                setHubs([]);
            }
        }

        fetchHubs();
    }, [currentUser]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const createHub = async (e) => {
        e.preventDefault();
        const token = await currentUser.getIdToken();
        const res = await fetch('/api/hubs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ handle: newHubHandle })
        });
        if (res.ok) {
            const data = await res.json();
            setHubs([{ ...data, handle: newHubHandle }, ...hubs]);
            setSelectedHubHandle(newHubHandle);
            setShowCreate(false);
            setNewHubHandle('');
        } else {
            alert('Failed to create hub (Handle might be taken)');
        }
    };

    const addLink = async (e) => {
        e.preventDefault();
        setIsAddingLink(true);

        try {
            const token = await currentUser.getIdToken();
            const formData = new FormData(e.target);
            const body = {
                hubId: hub.id,
                title: formData.get('title'),
                url: formData.get('url'),
                deviceTarget: formData.get('deviceTarget'),
                timePriority: Number(formData.get('timePriority')) || 0,
                startHour: formData.get('startHour') ? Number(formData.get('startHour')) : null,
                endHour: formData.get('endHour') ? Number(formData.get('endHour')) : null,
            };

            const res = await fetch('/api/links', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                throw new Error('Failed to add link');
            }

            e.target.reset();
            await refresh();
        } catch (error) {
            console.error('Error adding link:', error);
            alert('Failed to add link. Please try again.');
        } finally {
            setIsAddingLink(false);
        }
    };

    const deleteLink = async (id) => {
        if (!confirm('Delete this link?')) return;
        const token = await currentUser.getIdToken();
        await fetch(`/api/links/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        refresh();
    };

    return (
        <div className="min-h-screen flex bg-black text-white">
            {/* Sidebar */}
            <div className="w-64 border-r border-zinc-800 p-4 flex flex-col">
                <h1 className="text-xl font-bold mb-6 text-brand-green">Link Hub Admin</h1>
                <div className="space-y-2 flex-grow">
                    {hubs.map(h => (
                        <button
                            key={h.id}
                            onClick={() => setSelectedHubHandle(h.handle)}
                            className={`w-full text-left px-3 py-2 rounded transition-colors ${selectedHubHandle === h.handle ? 'bg-zinc-800 text-brand-green' : 'hover:bg-zinc-900'}`}
                        >
                            /h/{h.handle}
                        </button>
                    ))}
                    <Button variant="secondary" className="w-full mt-4" onClick={() => setShowCreate(true)}>
                        <Plus size={16} className="inline mr-2" /> New Hub
                    </Button>
                </div>
                <div className="mt-auto pt-4 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-2 truncate">{currentUser?.email}</p>
                    <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/10" onClick={handleLogout}>
                        <LogOut size={16} className="inline mr-2" /> Logout
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8">
                {showCreate ? (
                    <div className="max-w-md mx-auto mt-20 p-6 bg-zinc-900 rounded-xl border border-zinc-800">
                        <h2 className="text-xl font-bold mb-4">Create New Hub</h2>
                        <form onSubmit={createHub} className="space-y-4">
                            <Input
                                placeholder="Handle (e.g., my-portfolio)"
                                value={newHubHandle}
                                onChange={e => setNewHubHandle(e.target.value)}
                                required
                            />
                            <div className="flex gap-2 justify-end">
                                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                                <Button type="submit">Create</Button>
                            </div>
                        </form>
                    </div>
                ) : hub ? (
                    <div className="max-w-4xl mx-auto">
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-3xl font-bold mb-1">{hub.title || hub.handle}</h2>
                                <a href={`/h/${hub.handle}`} target="_blank" className="text-brand-green hover:underline flex items-center gap-1">
                                    View Public Page <ExternalLink size={14} />
                                </a>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary"><Settings size={18} /></Button>
                                <Button variant="secondary"><BarChart size={18} /></Button>
                            </div>
                        </header>

                        {/* Add Link Form */}
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
                            <h3 className="font-bold mb-4 flex items-center gap-2"><LinkIcon size={18} /> Add New Link</h3>
                            <form onSubmit={addLink} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input name="title" placeholder="Title" required />
                                <Input name="url" placeholder="URL (https://...)" required />

                                <div className="md:col-span-2 grid grid-cols-3 gap-4">
                                    <select name="deviceTarget" className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-green/50">
                                        <option value="all">All Devices</option>
                                        <option value="mobile">Mobile Only</option>
                                        <option value="desktop">Desktop Only</option>
                                    </select>
                                    <Input name="startHour" type="number" placeholder="Start Hour (0-23)" min="0" max="23" />
                                    <Input name="endHour" type="number" placeholder="End Hour (0-23)" min="0" max="23" />
                                </div>
                                <div className="md:col-span-2">
                                    <Input name="timePriority" type="number" placeholder="Priority Boost Score" />
                                    <p className="text-xs text-zinc-500 mt-1">Extra score when time rule is active</p>
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <Button type="submit" disabled={isAddingLink}>
                                        {isAddingLink ? 'Adding...' : 'Add Link'}
                                    </Button>
                                </div>
                            </form>
                        </div>

                        {/* Links List */}
                        <div className="space-y-4">
                            {loading ? (
                                <div className="text-center text-zinc-500 py-10">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div>
                                    <p className="mt-2">Loading links...</p>
                                </div>
                            ) : (
                                <>
                                    {links.map(link => (
                                        <LinkCard key={link.id} link={link} onDelete={deleteLink} />
                                    ))}
                                    {links.length === 0 && <p className="text-center text-zinc-500 py-10">No links yet. Add your first link above!</p>}
                                </>
                            )}
                        </div>

                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-zinc-500">
                        Select a hub to manage
                    </div>
                )}
            </div>
        </div>
    );
}
