'use client';


interface ToggleProps {
  options: [string, string];
  selected: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Toggle({
  options,
  selected,
  onChange,
  className = '',
}: ToggleProps) {
  return (
    <div className={`inline-flex items-center bg-gray-100 rounded-xl p-1 ${className}`}>
      {options.map((option) => {
        const isSelected = selected === option;

        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              px-6 py-2 rounded-xl text-sm font-medium transition-all duration-200
              ${isSelected
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}