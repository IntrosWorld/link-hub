import { ArrowRight } from 'lucide-react';

export function PublicLink({ link }) {
    return (
        <a
            href={`/go/${link.id}`}
            className="block w-full bg-zinc-900 hover:bg-brand-green hover:text-black border border-zinc-800 hover:border-brand-green p-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] group"
        >
            <div className="flex justify-between items-center">
                <span className="font-bold text-lg">{link.title}</span>
                <ArrowRight className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 transform duration-300" />
            </div>
        </a>
    );
}
