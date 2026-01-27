import { useEffect, useState } from 'react';
import { Trash2, Smartphone, Monitor, Clock, ExternalLink, Shield } from 'lucide-react';
import { Button } from './ui/Button';
import { TagInput } from './ui/TagInput';
import { LinkCardProps } from '../types/components';

export function LinkCard({ link, onDelete, onUpdateAccess }: LinkCardProps): JSX.Element {
  const [showAccess, setShowAccess] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'restricted'>(link.visibility || 'public');
  const [allowedUsernames, setAllowedUsernames] = useState<string[]>(link.allowed_usernames || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVisibility(link.visibility || 'public');
    setAllowedUsernames(link.allowed_usernames || []);
  }, [link.visibility, link.allowed_usernames]);

  const handleSaveAccess = async () => {
    if (!onUpdateAccess) return;
    setSaving(true);
    try {
      await onUpdateAccess(link.id, visibility, allowedUsernames);
      setShowAccess(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 group hover:border-brand-green/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-lg text-white group-hover:text-brand-green transition-colors flex items-center gap-2"
            >
              {link.title}
              <ExternalLink size={14} className="opacity-50" />
            </a>
            <div className="flex gap-1 ml-2">
              {link.device_target === 'mobile' && <Smartphone size={16} className="text-blue-400" title="Mobile Only" />}
              {link.device_target === 'desktop' && <Monitor size={16} className="text-purple-400" title="Desktop Only" />}
              {link.start_hour !== null && <Clock size={16} className="text-yellow-400" title={`Time: ${link.start_hour}-${link.end_hour}`} />}
            </div>
          </div>
          <div className="text-sm text-zinc-500 truncate max-w-md">{link.url}</div>
          <div className="text-xs text-zinc-600 mt-2 flex flex-wrap gap-3">
            <span>Clicks: <b className="text-zinc-400">{link.clicks}</b></span>
            {link.time_priority > 0 && <span>Priority Boost: <b className="text-brand-green">+{link.time_priority}</b></span>}
            <span>Visibility: <b className="text-zinc-400 capitalize">{link.visibility}</b></span>
            {link.visibility === 'restricted' && link.allowed_usernames?.length ? (
              <span>Allowed: <b className="text-zinc-400">{link.allowed_usernames.join(', ')}</b></span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onUpdateAccess && (
            <Button variant="ghost" className="opacity-0 group-hover:opacity-100 p-2" onClick={() => setShowAccess(!showAccess)}>
              <Shield size={18} />
            </Button>
          )}
          <Button variant="danger" className="opacity-0 group-hover:opacity-100 p-2" onClick={() => onDelete(link.id)}>
            <Trash2 size={18} />
          </Button>
        </div>
      </div>

      {showAccess && (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-zinc-500">Visibility</label>
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value as 'public' | 'restricted')}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-green/50"
              >
                <option value="public">Public (anyone)</option>
                <option value="restricted">Restricted (allowed usernames)</option>
              </select>
            </div>
            {visibility === 'restricted' && (
              <div>
                <label className="text-xs text-zinc-500 block mb-2">Allowed Usernames</label>
                <TagInput
                  tags={allowedUsernames}
                  onChange={setAllowedUsernames}
                  placeholder="Type username and press Enter"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button type="button" variant="ghost" onClick={() => setShowAccess(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveAccess} disabled={saving}>
              {saving ? 'Saving...' : 'Save Access'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
