import { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Input } from './Input';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({ tags, onChange, placeholder = "Add username and press Enter", className = "" }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmedValue = inputValue.trim().toLowerCase();

      if (trimmedValue && !tags.includes(trimmedValue)) {
        onChange([...tags, trimmedValue]);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <div
            key={tag}
            className="flex items-center gap-1 bg-brand-green text-black px-3 py-1 rounded-full text-sm font-semibold"
          >
            <span>@{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      <p className="text-xs text-zinc-500 mt-1">
        Type username and press Enter to add
      </p>
    </div>
  );
}
