import { Trash2, Smartphone, Monitor, Clock, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';

export function LinkCard({ link, onDelete }) {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-center justify-between group hover:border-brand-green/30 transition-colors">
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
                <div className="text-xs text-zinc-600 mt-2 flex gap-3">
                    <span>Clicks: <b className="text-zinc-400">{link.clicks}</b></span>
                    {link.time_priority > 0 && <span>Priority Boost: <b className="text-brand-green">+{link.time_priority}</b></span>}
                </div>
            </div>
            <div>
                <Button variant="danger" className="opacity-0 group-hover:opacity-100 p-2" onClick={() => onDelete(link.id)}>
                    <Trash2 size={18} />
                </Button>
            </div>
        </div>
    );
}
