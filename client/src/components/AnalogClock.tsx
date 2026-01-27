import React, { useRef, useState, useEffect, useMemo } from 'react';

interface AnalogClockProps {
    value?: string; // HH:mm format
    onChange?: (time: string) => void;
    size?: number;
    className?: string;
    isInteractive?: boolean;
}

const AnalogClock: React.FC<AnalogClockProps> = ({
    value = '12:00',
    onChange,
    size = 200,
    className = '',
    isInteractive = false
}) => {
    // Parse time from value prop (re-parses on every render when value changes)
    const [hours, minutes] = useMemo(() => {
        const [h, m] = (value || '12:00').split(':').map(Number);
        console.log('🔄 AnalogClock parsing value:', { value, h, m });
        return [h, m];
    }, [value]);

    const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
    const clockRef = useRef<HTMLDivElement>(null);

    const calculateTimeFromAngle = (clientX: number, clientY: number) => {
        if (!clockRef.current) return;
        const rect = clockRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const x = clientX - centerX;
        const y = clientY - centerY;

        // Calculate angle in degrees (0 is top/12 o'clock)
        let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
        if (angle < 0) angle += 360;

        console.log('🎯 calculateTimeFromAngle - current mode:', mode, 'angle:', angle);

        if (mode === 'hours') {
            let selectedHour = Math.round(angle / 30);
            if (selectedHour === 0) selectedHour = 12;
            console.log('📍 Returning HOURS:', selectedHour);
            return { type: 'hours', value: selectedHour };
        } else {
            let selectedMinute = Math.round(angle / 6);
            if (selectedMinute === 60) selectedMinute = 0;
            console.log('📍 Returning MINUTES:', selectedMinute);
            return { type: 'minutes', value: selectedMinute };
        }
    };

    const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isInteractive || !onChange) return;

        // Prevent default behavior to avoid scrolling on touch devices?
        // e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const result = calculateTimeFromAngle(clientX, clientY);
        if (!result) return;

        console.log('🕐 AnalogClock interaction:', {
            mode,
            currentHours: hours,
            currentMinutes: minutes,
            result
        });

        let newH = hours;
        let newM = minutes;

        if (result.type === 'hours') {
            // Logic: The user selects a visual hour 1-12.
            // We want to apply this to the current AM/PM state.
            const isCurrentPM = hours >= 12;
            const selectedVisualHour = result.value; // 1-12

            console.log('📍 Hour selection:', { isCurrentPM, selectedVisualHour });

            if (isCurrentPM) {
                // If PM, 12 is 12, 1-11 becomes 13-23
                if (selectedVisualHour === 12) newH = 12;
                else newH = selectedVisualHour + 12;
            } else {
                // If AM, 12 becomes 0, 1-11 is 1-11
                if (selectedVisualHour === 12) newH = 0;
                else newH = selectedVisualHour;
            }

            console.log('✅ New hour calculated:', newH);

            // Auto-switch to minutes for better UX
            setMode('minutes');
        } else {
            newM = result.value;
            console.log('✅ New minute calculated:', newM);
        }

        const newTime = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
        console.log('🔄 Calling onChange with:', newTime);
        onChange(newTime);
    };

    const handleMouseUp = () => {
        if (isInteractive && mode === 'hours') {
            setMode('minutes');
        }
    };

    const displayHours = hours % 12 || 12;
    const isPM = hours >= 12;

    const hourAngle = (displayHours * 30) + (minutes / 2);
    const minuteAngle = minutes * 6;

    return (
        <div className={`flex flex-col items-center gap-4 ${className}`}>
            {isInteractive && (
                <div className="flex items-center justify-center gap-2 mb-2 p-2 bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-[200px]">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent click from bubbling to clock
                            console.log('🔘 Hour button clicked, switching to hours mode');
                            setMode('hours');
                        }}
                        className={`px-3 py-1 rounded text-xl font-bold transition-colors ${mode === 'hours' ? 'text-brand-green bg-brand-green/10' : 'text-zinc-400 hover:text-white'}`}
                    >
                        {displayHours.toString().padStart(2, '0')}
                    </button>
                    <span className="text-zinc-600 font-bold mb-1">:</span>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent click from bubbling to clock
                            console.log('🔘 Minute button clicked, switching to minutes mode');
                            setMode('minutes');
                        }}
                        className={`px-3 py-1 rounded text-xl font-bold transition-colors ${mode === 'minutes' ? 'text-brand-green bg-brand-green/10' : 'text-zinc-400 hover:text-white'}`}
                    >
                        {minutes.toString().padStart(2, '0')}
                    </button>
                    <div className="flex flex-col ml-2 border-l border-zinc-800 pl-2 gap-1">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent click from bubbling to clock
                                const newH = (hours + 12) % 24;
                                onChange?.(`${newH.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
                            }}
                            className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${isPM ? 'bg-brand-green text-black' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                        >
                            PM
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent click from bubbling to clock
                                const newH = (hours + 12) % 24;
                                onChange?.(`${newH.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
                            }}
                            className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${!isPM ? 'bg-brand-green text-black' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                        >
                            AM
                        </button>
                    </div>
                </div>
            )}

            {/* Helper Text */}
            {isInteractive && (
                <div className="text-xs text-zinc-500 font-medium">
                    Select {mode === 'hours' ? 'Hours' : 'Minutes'}
                </div>
            )}

            <div
                ref={clockRef}
                className={`relative select-none touch-none ${isInteractive ? 'cursor-pointer' : ''}`}
                style={{ width: size, height: size }}
                onClick={handleInteraction}
                // Support drag interactions? optional but nice
                // onMouseMove={(e) => e.buttons === 1 && handleInteraction(e)}
                onMouseUp={handleMouseUp}
            >
                <div className="absolute inset-0 rounded-full border border-zinc-700 bg-zinc-900 shadow-xl backdrop-blur-sm">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className={`absolute w-0.5 bg-zinc-600 origin-bottom left-1/2 top-0`}
                            style={{
                                height: '10px',
                                transform: `translateX(-50%) rotate(${i * 30}deg)`,
                                transformOrigin: `50% ${size / 2}px`
                            }}
                        />
                    ))}

                    {/* Numbers overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                        {[...Array(12)].map((_, i) => {
                            const num = i === 0 ? 12 : i;
                            const angle = i * 30;
                            const rad = (angle - 90) * (Math.PI / 180);
                            const radius = size / 2 - 28;
                            const x = Math.cos(rad) * radius + size / 2;
                            const y = Math.sin(rad) * radius + size / 2;

                            let isActive = false;
                            if (mode === 'hours' && num === displayHours) isActive = true;
                            // Approximate minute highlighting
                            if (mode === 'minutes' && Math.round(minutes / 5) * 5 === (i * 5) % 60) isActive = true;
                            if (mode === 'minutes' && i === 0 && minutes === 0) isActive = true; // Handle 0/60 case
                            if (mode === 'minutes' && i === 0 && minutes === 60) isActive = true;

                            return (
                                <div
                                    key={i}
                                    className={`absolute w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-200
                     ${isActive ? 'bg-brand-green text-black scale-110 shadow-[0_0_15px_rgba(0,255,136,0.3)]' : 'text-zinc-500'}
                   `}
                                    style={{ left: x - 16, top: y - 16 }}
                                >
                                    {num}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div
                    className="absolute w-1 bg-white rounded-full origin-bottom shadow-lg transition-transform duration-300 ease-out z-10 pointer-events-none"
                    style={{
                        height: '28%',
                        bottom: '50%',
                        left: '50%',
                        transform: `translateX(-50%) rotate(${hourAngle}deg)`,
                    }}
                />

                <div
                    className="absolute w-0.5 bg-zinc-400 rounded-full origin-bottom shadow-lg transition-transform duration-300 ease-out z-10 pointer-events-none"
                    style={{
                        height: '38%',
                        bottom: '50%',
                        left: '50%',
                        transform: `translateX(-50%) rotate(${minuteAngle}deg)`,
                    }}
                />

                <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-brand-green rounded-full -translate-x-1/2 -translate-y-1/2 z-20 shadow-lg shadow-brand-green/20 pointer-events-none" />
            </div>
        </div>
    );
};

export default AnalogClock;
