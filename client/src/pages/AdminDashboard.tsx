import { useState, useEffect } from 'react';
import { Plus, BarChart, Settings, Link as LinkIcon, ExternalLink, LogOut, Shield, Users, Clock } from 'lucide-react';
import { useHub } from '../hooks/useHub';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TagInput } from '../components/ui/TagInput';
import { LinkCard } from '../components/LinkCard';
import { ArrangementsPanel } from '../components/ArrangementsPanel';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import TimePicker from '../components/TimePicker';

interface HubListItem {
  id: number;
  handle: string;
  title?: string;
}

type TabType = 'links' | 'arrangements' | 'analytics';

export default function AdminDashboard(): JSX.Element {
  const [hubs, setHubs] = useState<HubListItem[]>([]);
  const [selectedHubHandle, setSelectedHubHandle] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('links');
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [newHubHandle, setNewHubHandle] = useState<string>('');
  const [newHubVisibility, setNewHubVisibility] = useState<'public' | 'private' | 'restricted'>('public');
  const [newHubAllowedUsernames, setNewHubAllowedUsernames] = useState<string[]>([]);
  const [isAddingLink, setIsAddingLink] = useState<boolean>(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [hubVisibility, setHubVisibility] = useState<'public' | 'private' | 'restricted'>('public');
  const [hubAllowedUsernames, setHubAllowedUsernames] = useState<string[]>([]);
  const [isSavingHubAccess, setIsSavingHubAccess] = useState<boolean>(false);
  const [linkVisibility, setLinkVisibility] = useState<'public' | 'restricted'>('public');
  const [linkAllowedUsernames, setLinkAllowedUsernames] = useState<string[]>([]);
  const [newLinkStartTime, setNewLinkStartTime] = useState<string>('');
  const [newLinkEndTime, setNewLinkEndTime] = useState<string>('');
  const { currentUser, logout, username } = useAuth();
  const navigate = useNavigate();

  const { hub, links, refresh, loading } = useHub(selectedHubHandle, undefined, authToken);

  useEffect(() => {
    let active = true;
    if (!currentUser) {
      setAuthToken(null);
      return undefined;
    }

    currentUser.getIdToken()
      .then(token => {
        if (active) setAuthToken(token);
      })
      .catch(() => {
        if (active) setAuthToken(null);
      });

    return () => {
      active = false;
    };
  }, [currentUser]);

  useEffect(() => {
    const fetchHubs = async (): Promise<void> => {
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

        const data: HubListItem[] = await res.json();
        console.log('Fetched hubs:', data);
        setHubs(data);
      } catch (error) {
        console.error('Error fetching hubs:', error);
        setHubs([]);
      }
    };

    fetchHubs();
  }, [currentUser]);

  useEffect(() => {
    if (!hub) return;
    setHubVisibility(hub.visibility || 'public');
    setHubAllowedUsernames(hub.allowedUsernames || []);
  }, [hub]);

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login');
  };

  const createHub = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const token = await currentUser!.getIdToken();
    const allowedUsernames = newHubVisibility === 'restricted' && newHubAllowedUsernames.length > 0
      ? newHubAllowedUsernames
      : null;
    const res = await fetch('/api/hubs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        handle: newHubHandle,
        visibility: newHubVisibility,
        allowedUsernames
      })
    });

    if (res.ok) {
      const data = await res.json();
      setHubs([{ ...data, handle: newHubHandle }, ...hubs]);
      setSelectedHubHandle(newHubHandle);
      setShowCreate(false);
      setNewHubHandle('');
      setNewHubVisibility('public');
      setNewHubAllowedUsernames([]);
    } else {
      alert('Failed to create hub (Handle might be taken)');
    }
  };

  const getFormValue = (formData: FormData, key: string): string => {
    return (formData.get(key) as string) ?? '';
  };

  const getFormNumber = (formData: FormData, key: string): number | null => {
    const value = formData.get(key) as string;
    return value ? Number(value) : null;
  };

  const timeToHour = (timeString: string): number | null => {
    if (!timeString) return null;
    const [hours] = timeString.split(':');
    return parseInt(hours, 10);
  };

  const addLink = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setIsAddingLink(true);

    try {
      const token = await currentUser!.getIdToken();
      const form = e.currentTarget instanceof HTMLFormElement
        ? e.currentTarget
        : (e.target as HTMLElement | null)?.closest('form');
      if (!form) {
        throw new Error('Add link form not found');
      }
      const formData = new FormData(form);
      const visibility = (getFormValue(formData, 'linkVisibility') || 'public') as 'public' | 'restricted';

      const daysOfWeek: number[] = [];
      for (let i = 0; i <= 6; i++) {
        if (formData.get(`day${i}`) === 'on') {
          daysOfWeek.push(i);
        }
      }

      const body = {
        hubId: hub!.id,
        title: getFormValue(formData, 'title'),
        url: getFormValue(formData, 'url'),
        deviceTarget: getFormValue(formData, 'deviceTarget') as 'all' | 'mobile' | 'desktop',
        timePriority: Number(getFormValue(formData, 'timePriority')) || 0,
        startHour: timeToHour(getFormValue(formData, 'startTime')),
        endHour: timeToHour(getFormValue(formData, 'endTime')),
        scheduleStartDate: getFormValue(formData, 'scheduleStartDate') || null,
        scheduleEndDate: getFormValue(formData, 'scheduleEndDate') || null,
        daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : null,
        maxClicks: getFormNumber(formData, 'maxClicks'),
        maxClicksPerUser: getFormNumber(formData, 'maxClicksPerUser'),
        expiresAt: getFormValue(formData, 'expiresAt') || null,
        visibility,
        allowedUsernames: visibility === 'restricted' && linkAllowedUsernames.length > 0
          ? linkAllowedUsernames
          : null
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

      form.reset();
      setLinkVisibility('public');
      setLinkAllowedUsernames([]);
      setNewLinkStartTime('');
      setNewLinkEndTime('');
      await refresh();
    } catch (error) {
      console.error('Error adding link:', error);
      alert('Failed to add link. Please try again.');
    } finally {
      setIsAddingLink(false);
    }
  };

  const updateHubAccess = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!hub) return;

    setIsSavingHubAccess(true);
    try {
      const token = await currentUser!.getIdToken();
      const allowedUsernames = hubVisibility === 'restricted' && hubAllowedUsernames.length > 0
        ? hubAllowedUsernames
        : null;

      const res = await fetch(`/api/hubs/${hub.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          visibility: hubVisibility,
          allowedUsernames
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update hub access');
      }

      await refresh();
    } catch (error) {
      console.error('Error updating hub access:', error);
      alert('Failed to update hub access. Please try again.');
    } finally {
      setIsSavingHubAccess(false);
    }
  };

  const updateLinkAccess = async (
    id: number,
    visibility: 'public' | 'restricted',
    allowedUsernamesInput: string[]
  ): Promise<void> => {
    try {
      const token = await currentUser!.getIdToken();
      const allowedUsernames = visibility === 'restricted' && allowedUsernamesInput.length > 0
        ? allowedUsernamesInput
        : null;

      const res = await fetch(`/api/links/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          visibility,
          allowedUsernames
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update link access');
      }

      await refresh();
    } catch (error) {
      console.error('Error updating link access:', error);
      alert('Failed to update link access. Please try again.');
    }
  };

  const publicPath = hub
    ? (hub.username ? `/${hub.username}/${hub.handle}` : `/h/${hub.handle}`)
    : '';
  const publicUrl = typeof window !== 'undefined' && publicPath
    ? `${window.location.origin}${publicPath}`
    : publicPath;

  const deleteLink = async (id: number): Promise<void> => {
    if (!confirm('Delete this link?')) return;

    const token = await currentUser!.getIdToken();
    await fetch(`/api/links/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    refresh();
  };

  return (
    <div className="min-h-screen flex bg-black text-white">
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
          {username && <p className="text-xs text-zinc-500 mb-2 truncate">@{username}</p>}
          <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/10" onClick={handleLogout}>
            <LogOut size={16} className="inline mr-2" /> Logout
          </Button>
        </div>
      </div>

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
              <div className="space-y-2">
                <label className="text-xs text-zinc-500">Visibility</label>
                <select
                  name="hubVisibility"
                  value={newHubVisibility}
                  onChange={e => setNewHubVisibility(e.target.value as 'public' | 'private' | 'restricted')}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-green/50"
                >
                  <option value="public">Public (anyone)</option>
                  <option value="restricted">Restricted (allowed usernames)</option>
                  <option value="private">Private (only me)</option>
                </select>
              </div>
              {newHubVisibility === 'restricted' && (
                <div>
                  <label className="text-xs text-zinc-500 block mb-2">Allowed Usernames</label>
                  <TagInput
                    tags={newHubAllowedUsernames}
                    onChange={setNewHubAllowedUsernames}
                    placeholder="Type username and press Enter"
                  />
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </div>
        ) : hub ? (
          <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold mb-1">{hub.title || hub.handle}</h2>
                <a href={publicPath} target="_blank" className="text-brand-green hover:underline flex items-center gap-1">
                  View Public Page <ExternalLink size={14} />
                </a>
                <p className="text-xs text-zinc-500 mt-2">
                  Shareable URL: <a href={publicPath} className="text-brand-green hover:underline">{publicUrl}</a>
                </p>
              </div>
            </header>

            {/* Tab Navigation */}
            <div className="border-b border-zinc-800 mb-6">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('links')}
                  className={`px-4 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'links'
                    ? 'text-brand-green border-b-2 border-brand-green'
                    : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  <LinkIcon size={18} />
                  Links & Settings
                </button>
                <button
                  onClick={() => setActiveTab('arrangements')}
                  className={`px-4 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'arrangements'
                    ? 'text-brand-green border-b-2 border-brand-green'
                    : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  <Users size={18} />
                  Arrangements
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-4 py-3 font-semibold transition-colors flex items-center gap-2 ${activeTab === 'analytics'
                    ? 'text-brand-green border-b-2 border-brand-green'
                    : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  <BarChart size={18} />
                  Analytics
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'links' && (
              <>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Shield size={18} /> Hub Access Control</h3>
                  <form onSubmit={updateHubAccess} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-zinc-500">Visibility</label>
                      <select
                        name="hubVisibility"
                        value={hubVisibility}
                        onChange={e => setHubVisibility(e.target.value as 'public' | 'private' | 'restricted')}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-green/50"
                      >
                        <option value="public">Public (anyone)</option>
                        <option value="restricted">Restricted (allowed usernames)</option>
                        <option value="private">Private (only me)</option>
                      </select>
                    </div>
                    {hubVisibility === 'restricted' && (
                      <div>
                        <label className="text-xs text-zinc-500 block mb-2">Allowed Usernames</label>
                        <TagInput
                          tags={hubAllowedUsernames}
                          onChange={setHubAllowedUsernames}
                          placeholder="Type username and press Enter"
                        />
                      </div>
                    )}
                    <div className="md:col-span-2 text-xs text-zinc-500">
                      Public: anyone can view. Restricted: only listed usernames. Private: only you.
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <Button type="submit" disabled={isSavingHubAccess}>
                        {isSavingHubAccess ? 'Saving...' : 'Save Access'}
                      </Button>
                    </div>
                  </form>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-8">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><LinkIcon size={18} /> Add New Link</h3>
                  <form onSubmit={addLink} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input name="title" placeholder="Title" required />
                    <Input name="url" placeholder="URL (https://...)" required />

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs text-zinc-500">Device Target</label>
                      <select name="deviceTarget" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-green/50">
                        <option value="all">All Devices</option>
                        <option value="mobile">Mobile Only</option>
                        <option value="desktop">Desktop Only</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 space-y-3 border border-zinc-800 rounded-lg p-4 bg-zinc-900/30 group">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-brand-green" />
                        <label className="text-sm font-semibold text-brand-green">Time Window (Optional)</label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <TimePicker
                            label="Start Time"
                            name="startTime"
                            value={newLinkStartTime}
                            onChange={setNewLinkStartTime}
                          />
                        </div>
                        <div className="space-y-2">
                          <TimePicker
                            label="End Time"
                            name="endTime"
                            value={newLinkEndTime}
                            onChange={setNewLinkEndTime}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500">Link visible from this time to end time</p>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-500 block mb-2">Priority Boost Score</label>
                      <Input name="timePriority" type="number" placeholder="0" />
                      <p className="text-xs text-zinc-500 mt-1">Extra score when time window is active</p>
                    </div>

                    <div className="md:col-span-2 border-t border-zinc-800 pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-brand-green mb-3">Advanced Scheduling</h4>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-zinc-500">Start Date</label>
                      <Input name="scheduleStartDate" type="date" />
                      <p className="text-xs text-zinc-500">Link visible from this date</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-zinc-500">End Date</label>
                      <Input name="scheduleEndDate" type="date" />
                      <p className="text-xs text-zinc-500">Link hidden after this date</p>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs text-zinc-500">Days of Week (leave unchecked for all days)</label>
                      <div className="flex gap-2 flex-wrap">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                          <label key={i} className="flex items-center gap-1 bg-zinc-800 px-3 py-1 rounded cursor-pointer hover:bg-zinc-700">
                            <input type="checkbox" name={`day${i}`} className="accent-brand-green" />
                            <span className="text-sm">{day}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-zinc-500">Link only visible on selected days</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-zinc-500">Max Total Clicks</label>
                      <Input name="maxClicks" type="number" placeholder="Unlimited" min="1" />
                      <p className="text-xs text-zinc-500">Hide after X total clicks</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-zinc-500">Max Clicks Per User</label>
                      <Input name="maxClicksPerUser" type="number" placeholder="Unlimited" min="1" />
                      <p className="text-xs text-zinc-500">Limit clicks per user</p>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-xs text-zinc-500">Expires At (exact timestamp)</label>
                      <Input name="expiresAt" type="datetime-local" />
                      <p className="text-xs text-zinc-500">Link becomes invalid at specific time</p>
                    </div>

                    <div className="md:col-span-2 border-t border-zinc-800 pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-brand-green mb-3">Access Control</h4>
                    </div>

                    <div className="md:col-span-2 space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-500">Link Visibility</label>
                        <select
                          name="linkVisibility"
                          value={linkVisibility}
                          onChange={e => setLinkVisibility(e.target.value as 'public' | 'restricted')}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-green/50"
                        >
                          <option value="public">Public (anyone can view)</option>
                          <option value="restricted">Restricted (specific users only)</option>
                        </select>
                      </div>
                      {linkVisibility === 'restricted' && (
                        <div>
                          <label className="text-xs text-zinc-500 block mb-2">Allowed Usernames</label>
                          <TagInput
                            tags={linkAllowedUsernames}
                            onChange={setLinkAllowedUsernames}
                            placeholder="Type username and press Enter"
                          />
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <Button type="submit" disabled={isAddingLink}>
                        {isAddingLink ? 'Adding...' : 'Add Link'}
                      </Button>
                    </div>
                  </form>
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center text-zinc-500 py-10">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div>
                      <p className="mt-2">Loading links...</p>
                    </div>
                  ) : (
                    <>
                      {links.map(link => (
                        <LinkCard key={link.id} link={link} onDelete={deleteLink} onUpdateAccess={updateLinkAccess} />
                      ))}
                      {links.length === 0 && <p className="text-center text-zinc-500 py-10">No links yet. Add your first link above!</p>}
                    </>
                  )}
                </div>
              </>
            )}

            {activeTab === 'arrangements' && (
              <ArrangementsPanel
                hubId={hub.id}
                links={links}
                authToken={authToken}
                onRefresh={refresh}
              />
            )}

            {activeTab === 'analytics' && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center">
                <BarChart size={48} className="mx-auto mb-4 text-zinc-600" />
                <h3 className="text-xl font-bold mb-2">Analytics Coming Soon</h3>
                <p className="text-zinc-400">
                  Detailed analytics and insights will be available here
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500">
            Select a hub to manage
          </div>
        )
        }
      </div >
    </div >
  );
}
