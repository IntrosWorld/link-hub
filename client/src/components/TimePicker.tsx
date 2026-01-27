import React, { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import AnalogClock from './AnalogClock';

interface TimePickerProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    name?: string; // For form data compatibility
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, label, name }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update hidden input when value changes for FormData compatibility
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (hiddenInputRef.current) {
            hiddenInputRef.current.value = value;
        }
    }, [value]);

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="text-xs text-zinc-500 mb-2 block">{label}</label>}
            <div
                className="flex items-center gap-3 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 cursor-pointer hover:border-brand-green/50 transition-colors group"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Clock size={16} className="text-zinc-500 group-hover:text-brand-green transition-colors" />
                <span className={value ? 'text-white' : 'text-zinc-500'}>
                    {value || '--:--'}
                </span>
                {/* Hidden input for form submission */}
                <input
                    type="hidden"
                    name={name}
                    value={value}
                    ref={hiddenInputRef}
                />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 p-4 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl animate-fade-in">
                    <div className="mb-4 text-center">
                        <h4 className="text-sm font-medium text-zinc-400">Select Time</h4>
                    </div>
                    <AnalogClock
                        value={value}
                        onChange={(val) => {
                            console.log('⏰ TimePicker onChange called:', { oldValue: value, newValue: val });
                            onChange(val);
                            // Keep open for minute selection, maybe close on outside click only?
                            // Or we could auto-close if minute selection is done?
                            // For now, let user close explicitly or click outside
                        }}
                        isInteractive={true}
                        size={240}
                    />
                </div>
            )}
        </div>
    );
};

export default TimePicker;
