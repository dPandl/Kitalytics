
import React, { useState, useRef, useEffect } from 'react';

interface MultiSelectFilterProps<T extends string> {
    label: string;
    options: T[];
    selected: T[];
    onChange: (selected: T[]) => void;
}

export const MultiSelectFilter = <T extends string>({ label, options, selected, onChange }: MultiSelectFilterProps<T>) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option: T) => {
        const newSelected = selected.includes(option)
            ? selected.filter(o => o !== option)
            : [...selected, option];
        onChange(newSelected);
    };

    const isAllSelected = selected.length === options.length;

    return (
        <div className="relative inline-block text-left w-full" ref={containerRef}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border border-slate-300 rounded-md shadow-sm px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]"
            >
                <div className="flex justify-between items-center">
                    <span className="truncate">
                        {isAllSelected ? 'Alle' : selected.length === 0 ? 'Keine' : selected.join(', ')}
                    </span>
                    <svg className="ml-2 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </div>
            </button>

            {isOpen && (
                <div className="origin-top-right absolute left-0 mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 overflow-hidden">
                    <div className="py-1 max-h-60 overflow-y-auto">
                        {options.map((option) => (
                            <label
                                key={option}
                                className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.includes(option)}
                                    onChange={() => toggleOption(option)}
                                    className="h-4 w-4 text-[#00BCD4] focus:ring-[#00BCD4] border-slate-300 rounded mr-3"
                                />
                                {option}
                            </label>
                        ))}
                    </div>
                    <div className="border-t border-slate-100 p-2 bg-slate-50 flex justify-between gap-2">
                        <button 
                            onClick={() => onChange(options)}
                            className="text-xs font-semibold text-[#0097A7] hover:underline"
                        >
                            Alle wählen
                        </button>
                        <button 
                            onClick={() => onChange([])}
                            className="text-xs font-semibold text-slate-500 hover:underline"
                        >
                            Leeren
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
