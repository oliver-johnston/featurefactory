import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import { ChevronDown, Check } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
}: SelectProps) {
  const selected = options.find((o) => o.value === value)

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={`relative ${className}`}>
        <ListboxButton className="relative w-full bg-mantle border border-overlay rounded text-text text-sm px-3 py-2 pr-8 text-left cursor-pointer focus:outline-none focus:border-indigo disabled:opacity-60 disabled:cursor-not-allowed">
          <span className={selected ? '' : 'text-muted'}>
            {selected ? selected.label : placeholder}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="h-3.5 w-3.5 text-muted transition-transform ui-open:rotate-180" />
          </span>
        </ListboxButton>

        <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded bg-mantle border border-overlay py-1 text-sm shadow-lg focus:outline-none">
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className="group relative cursor-pointer select-none py-1.5 pl-3 pr-8 text-text data-[focus]:bg-indigo/15 data-[focus]:text-indigo-light"
            >
              <span className="block truncate group-data-[selected]:font-semibold">
                {option.label}
              </span>
              <span className="absolute inset-y-0 right-0 hidden items-center pr-2 text-indigo group-data-[selected]:flex">
                <Check className="h-3.5 w-3.5" />
              </span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
