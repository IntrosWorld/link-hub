import { useState, useEffect } from 'react';
import { Users, GripVertical, Plus, Save, User, TrendingUp, List } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface Link {
  id: number;
  title: string;
  clicks: number;
}

interface Arrangement {
  id: number;
  hub_id: number;
  username: string | null;
  link_order: number[];
  description: string | null;
  active: boolean;
}

type ArrangementMode = 'auto' | 'custom';

interface ArrangementsPanelProps {
  hubId: number;
  links: Link[];
  authToken: string | null;
  onRefresh: () => void;
}

export function ArrangementsPanel({ hubId, links, authToken, onRefresh }: ArrangementsPanelProps) {
  const [arrangements, setArrangements] = useState<Arrangement[]>([]);
  const [selectedArrangementKey, setSelectedArrangementKey] = useState<string | null>(null);
  const [draggedLinkId, setDraggedLinkId] = useState<number | null>(null);
  const [currentLinkOrder, setCurrentLinkOrder] = useState<number[]>([]);
  const [currentMode, setCurrentMode] = useState<ArrangementMode>('auto');
  const [arrangementDescription, setArrangementDescription] = useState<string>('');
  const [newUsername, setNewUsername] = useState<string>('');
  const [showAddUser, setShowAddUser] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAllArrangements();
  }, [hubId, authToken]);

  const fetchAllArrangements = async () => {
    if (!authToken) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/hubs/${hubId}/arrangements`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();

      if (data.arrangements) {
        setArrangements(data.arrangements);
      }
    } catch (error) {
      console.error('Error fetching arrangements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getArrangementKey = (username: string | null): string => {
    return username === null ? 'default' : username;
  };

  const getCurrentArrangement = (): Arrangement | undefined => {
    if (!selectedArrangementKey) return undefined;
    const username = selectedArrangementKey === 'default' ? null : selectedArrangementKey;
    return arrangements.find(a =>
      (username === null && a.username === null) ||
      (username !== null && a.username === username)
    );
  };

  const handleSelectArrangement = async (username: string | null) => {
    const key = getArrangementKey(username);
    setSelectedArrangementKey(key);

    const existingArrangement = arrangements.find(a =>
      (username === null && a.username === null) ||
      (username !== null && a.username === username)
    );

    if (existingArrangement) {
      // Load existing arrangement
      setCurrentLinkOrder(existingArrangement.link_order || []);
      setArrangementDescription(existingArrangement.description || '');
      // Determine mode from link_order
      setCurrentMode(existingArrangement.link_order && existingArrangement.link_order.length > 0 ? 'custom' : 'auto');
    } else {
      // New arrangement - default to auto mode
      setCurrentLinkOrder([]);
      setArrangementDescription('');
      setCurrentMode('auto');
    }
  };

  const getOrderedLinks = (): Link[] => {
    if (currentMode === 'auto' || currentLinkOrder.length === 0) {
      // Sort by clicks descending
      return [...links].sort((a, b) => b.clicks - a.clicks);
    }

    const linkMap = new Map(links.map(link => [link.id, link]));
    const ordered = currentLinkOrder
      .map(id => linkMap.get(id))
      .filter((link): link is Link => link !== undefined);

    // Add any links not in the order at the end
    const remaining = links.filter(link => !currentLinkOrder.includes(link.id));
    return [...ordered, ...remaining];
  };

  const handleDragStart = (linkId: number) => {
    setDraggedLinkId(linkId);
  };

  const handleDragOver = (e: React.DragEvent, targetLinkId: number) => {
    e.preventDefault();
    if (draggedLinkId === null || draggedLinkId === targetLinkId) return;

    const currentOrder = currentLinkOrder.length > 0 ? [...currentLinkOrder] : links.map(l => l.id);
    const draggedIndex = currentOrder.indexOf(draggedLinkId);
    const targetIndex = currentOrder.indexOf(targetLinkId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    currentOrder.splice(draggedIndex, 1);
    currentOrder.splice(targetIndex, 0, draggedLinkId);

    setCurrentLinkOrder(currentOrder);
  };

  const handleDragEnd = () => {
    setDraggedLinkId(null);
  };

  const handleModeChange = (mode: ArrangementMode) => {
    setCurrentMode(mode);
    if (mode === 'custom' && currentLinkOrder.length === 0) {
      // Initialize with current link order
      setCurrentLinkOrder(links.map(l => l.id));
    }
  };

  const handleSaveArrangement = async () => {
    if (!authToken || selectedArrangementKey === null) return;

    setSaving(true);
    try {
      const username = selectedArrangementKey === 'default' ? null : selectedArrangementKey;
      const linkOrder = currentMode === 'custom' ? currentLinkOrder : [];

      const res = await fetch(`/api/hubs/${hubId}/arrangements`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          username,
          linkOrder: linkOrder.length > 0 ? linkOrder : links.map(l => l.id),
          description: arrangementDescription || (currentMode === 'auto' ? 'Auto: Time-based priority' : 'Custom: Fixed order')
        })
      });

      if (res.ok) {
        await fetchAllArrangements();
        alert('Arrangement saved successfully!');
        onRefresh();
      } else {
        throw new Error('Failed to save arrangement');
      }
    } catch (error) {
      console.error('Error saving arrangement:', error);
      alert('Failed to save arrangement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUserArrangement = () => {
    if (!newUsername.trim()) {
      alert('Please enter a username');
      return;
    }

    const username = newUsername.toLowerCase().trim();
    const key = getArrangementKey(username);

    // Check if already exists
    const exists = arrangements.some(a => a.username === username);
    if (exists) {
      alert('Arrangement for this user already exists. Select it from the list to edit.');
      setNewUsername('');
      setShowAddUser(false);
      return;
    }

    setSelectedArrangementKey(key);
    setCurrentLinkOrder([]);
    setCurrentMode('auto');
    setArrangementDescription(`Custom arrangement for @${username}`);
    setNewUsername('');
    setShowAddUser(false);
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div>
        <p className="text-zinc-500 mt-2">Loading arrangements...</p>
      </div>
    );
  }

  const currentArrangement = getCurrentArrangement();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Panel - Arrangement List */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Users size={18} />
            Arrangements
          </h3>

          <div className="space-y-2">
            {/* Default Arrangement */}
            <button
              onClick={() => handleSelectArrangement(null)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                selectedArrangementKey === 'default'
                  ? 'bg-brand-green text-black font-semibold'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={16} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">Default (All Users)</div>
                  <div className="text-xs opacity-70 truncate">
                    {arrangements.find(a => a.username === null)?.description || 'Not configured'}
                  </div>
                </div>
              </div>
            </button>

            {/* User-Specific Arrangements */}
            {arrangements.filter(a => a.username !== null).map(arrangement => (
              <button
                key={arrangement.id}
                onClick={() => handleSelectArrangement(arrangement.username)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedArrangementKey === arrangement.username
                    ? 'bg-brand-green text-black font-semibold'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User size={16} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">@{arrangement.username}</div>
                    {arrangement.description && (
                      <div className="text-xs opacity-70 truncate">{arrangement.description}</div>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {/* Add User Arrangement */}
            {showAddUser ? (
              <div className="bg-zinc-800 p-3 rounded-lg space-y-2">
                <Input
                  placeholder="Username"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddUserArrangement()}
                />
                <div className="flex gap-2">
                  <Button onClick={handleAddUserArrangement} className="flex-1 text-sm py-1">
                    Add
                  </Button>
                  <Button variant="ghost" onClick={() => setShowAddUser(false)} className="text-sm py-1">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setShowAddUser(true)}
              >
                <Plus size={16} className="mr-2" />
                Add User Arrangement
              </Button>
            )}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <h4 className="font-semibold mb-2 text-sm">Arrangement Modes:</h4>
          <ul className="text-xs text-zinc-400 space-y-1">
            <li>• <strong>Auto</strong>: Time-based priority ranking</li>
            <li>• <strong>Custom</strong>: Fixed drag-drop order</li>
            <li>• User arrangements override default</li>
            <li>• All arrangements are saved permanently</li>
          </ul>
        </div>
      </div>

      {/* Right Panel - Arrangement Editor */}
      <div className="lg:col-span-2">
        {selectedArrangementKey === null ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center">
            <Users size={48} className="mx-auto mb-4 text-zinc-600" />
            <h3 className="text-xl font-bold mb-2">Select an Arrangement</h3>
            <p className="text-zinc-400">
              Choose default or create user-specific arrangements
            </p>
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  {selectedArrangementKey === 'default' ? (
                    <>
                      <Users size={20} />
                      Default Arrangement
                    </>
                  ) : (
                    <>
                      <User size={20} />
                      @{selectedArrangementKey}
                    </>
                  )}
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  {currentArrangement ? 'Edit existing arrangement' : 'Create new arrangement'}
                </p>
              </div>
              <Button onClick={handleSaveArrangement} disabled={saving}>
                <Save size={16} className="mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>

            {/* Mode Selection */}
            <div className="mb-6">
              <label className="text-sm font-semibold mb-2 block">Arrangement Mode</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleModeChange('auto')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    currentMode === 'auto'
                      ? 'border-brand-green bg-brand-green/10'
                      : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <TrendingUp size={24} className={`mx-auto mb-2 ${currentMode === 'auto' ? 'text-brand-green' : 'text-zinc-400'}`} />
                  <div className="font-semibold mb-1">Auto Ranking</div>
                  <div className="text-xs text-zinc-400">
                    Time-based priority & clicks
                  </div>
                </button>
                <button
                  onClick={() => handleModeChange('custom')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    currentMode === 'custom'
                      ? 'border-brand-green bg-brand-green/10'
                      : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <List size={24} className={`mx-auto mb-2 ${currentMode === 'custom' ? 'text-brand-green' : 'text-zinc-400'}`} />
                  <div className="font-semibold mb-1">Custom Order</div>
                  <div className="text-xs text-zinc-400">
                    Fixed drag-and-drop order
                  </div>
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <Input
                placeholder="Description (optional)"
                value={arrangementDescription}
                onChange={e => setArrangementDescription(e.target.value)}
              />
            </div>

            {/* Link List */}
            {currentMode === 'auto' ? (
              <div className="space-y-2">
                <div className="text-sm text-zinc-400 mb-4 p-4 bg-zinc-800/50 rounded-lg">
                  <strong>Auto Mode:</strong> Links will be automatically sorted by time-based priority, priority boost scores, and click counts. No manual ordering needed.
                </div>
                <div className="text-xs text-zinc-500 mb-2 flex items-center justify-between">
                  <span>Preview Order ({getOrderedLinks().length} links)</span>
                  <span>Sorted by clicks</span>
                </div>
                {getOrderedLinks().map((link, index) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 bg-zinc-800/50 p-4 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 font-mono">#{index + 1}</span>
                        <span className="font-semibold truncate">{link.title}</span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        {link.clicks} clicks
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-zinc-500 mb-2 flex items-center justify-between">
                  <span>Custom Order ({getOrderedLinks().length} links)</span>
                  <span>Drag to reorder</span>
                </div>

                {getOrderedLinks().map((link, index) => (
                  <div
                    key={link.id}
                    draggable
                    onDragStart={() => handleDragStart(link.id)}
                    onDragOver={e => handleDragOver(e, link.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 bg-zinc-800 p-4 rounded-lg cursor-move hover:bg-zinc-700 transition-colors ${
                      draggedLinkId === link.id ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="text-zinc-500">
                      <GripVertical size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 font-mono">#{index + 1}</span>
                        <span className="font-semibold truncate">{link.title}</span>
                      </div>
                      <div className="text-xs text-zinc-400 mt-1">
                        {link.clicks} clicks
                      </div>
                    </div>
                  </div>
                ))}

                {getOrderedLinks().length === 0 && (
                  <div className="text-center py-8 text-zinc-500">
                    No links available. Add links to your hub first.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
