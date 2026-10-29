import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
}

export interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  accentColor?: 'emerald' | 'cyan' | 'purple';
  className?: string;
  disabled?: boolean;
  error?: string | null;
  id?: string;
  name?: string;
  required?: boolean;
  size?: 'sm' | 'md';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  accentColor = 'emerald',
  className = '',
  disabled = false,
  error = null,
  id,
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const autoId = useId();
  const selectId = id || autoId;

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Sync highlighted index when opened
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, value, options]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const items = listboxRef.current.querySelectorAll('li');
      const target = items[highlightedIndex];
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          onChange(options[highlightedIndex].value);
          setIsOpen(false);
        }
        break;
      case 'Escape':
      case 'Tab':
        setIsOpen(false);
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(options.length - 1);
        break;
      default:
        break;
    }
  };

  const getAccentBorderClass = () => {
    if (error) return 'border-red-500 focus:border-red-500 focus:ring-red-500/20';
    if (accentColor === 'cyan') return 'focus:border-cyan-500 focus:ring-cyan-500/20';
    if (accentColor === 'purple') return 'focus:border-purple-500 focus:ring-purple-500/20';
    return 'focus:border-emerald-500 focus:ring-emerald-500/20';
  };

  const getAccentSelectedClass = () => {
    if (accentColor === 'cyan') return 'bg-cyan-950/60 text-cyan-300 font-semibold border-l-2 border-cyan-400';
    if (accentColor === 'purple') return 'bg-purple-950/60 text-purple-300 font-semibold border-l-2 border-purple-400';
    return 'bg-emerald-950/60 text-emerald-300 font-semibold border-l-2 border-emerald-400';
  };

  const getAccentActiveBadgeClass = () => {
    if (accentColor === 'cyan') return 'bg-cyan-900/60 text-cyan-300 border-cyan-700/60';
    if (accentColor === 'purple') return 'bg-purple-900/60 text-purple-300 border-purple-700/60';
    return 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60';
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={selectId}
          className="block font-medium text-slate-300 mb-1 text-xs select-none"
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? selectId : undefined}
        className={`w-full text-left flex items-center justify-between gap-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 transition-all cursor-pointer outline-none focus:ring-1 ${getAccentBorderClass()} ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-900/40' : 'hover:border-slate-700'}`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption?.icon && (
            <span className="shrink-0 text-slate-400">{selectedOption.icon}</span>
          )}
          {selectedOption ? (
            <span className="font-medium text-white truncate">{selectedOption.label}</span>
          ) : (
            <span className="text-slate-500 truncate">{placeholder}</span>
          )}
          {selectedOption?.badge && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${getAccentActiveBadgeClass()}`}
            >
              {selectedOption.badge}
            </span>
          )}
        </span>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-400' : ''
          }`}
        />
      </button>

      {/* Custom Dropdown Option List */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-slate-900 border border-slate-700/90 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          <ul
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-60 overflow-y-auto py-1 text-xs divide-y divide-slate-800/40 focus:outline-none"
          >
            {options.map((option, idx) => {
              const isSelected = option.value === value;
              const isHighlighted = idx === highlightedIndex;

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-2.5 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                    isSelected
                      ? getAccentSelectedClass()
                      : isHighlighted
                      ? 'bg-slate-800/80 text-slate-100'
                      : 'text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {option.icon && (
                        <span className="shrink-0 text-slate-400">{option.icon}</span>
                      )}
                      <span className="font-medium truncate">{option.label}</span>
                      {option.badge && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                          {option.badge}
                        </span>
                      )}
                    </div>
                    {option.description && (
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate pl-0.5">
                        {option.description}
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <Check
                      className={`w-4 h-4 shrink-0 ${
                        accentColor === 'cyan'
                          ? 'text-cyan-400'
                          : accentColor === 'purple'
                          ? 'text-purple-400'
                          : 'text-emerald-400'
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error && (
        <div className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
