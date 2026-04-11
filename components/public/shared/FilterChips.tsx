"use client";

interface FilterChipOption {
  label: string;
  value: string;
  icon?: string;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  selected: string | string[] | null;
  onSelect: (value: string | null) => void;
  label?: string;
}

export function FilterChips({ options, selected, onSelect, label }: FilterChipsProps) {
  const isSelected = (value: string) => {
    if (Array.isArray(selected)) return selected.includes(value);
    return selected === value;
  };

  const handleClick = (value: string) => {
    onSelect(isSelected(value) ? null : value);
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {label && (
        <span className="text-xs text-gray-400 font-medium mr-1">{label}</span>
      )}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={isSelected(opt.value)}
          onClick={() => handleClick(opt.value)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
            isSelected(opt.value)
              ? "bg-gold text-gray-950 shadow-sm"
              : "bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] hover:text-gray-300"
          }`}
        >
          {opt.icon && <span className="text-[10px]">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
