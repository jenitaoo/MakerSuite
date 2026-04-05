import * as React from "react"
import { X, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

type Props = {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]       // existing tags to suggest
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function TagsInput({
  value,
  onChange,
  suggestions = [],
  placeholder = "Add tags...",
  className,
  disabled,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setInputValue("")
    setOpen(false)
  }

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault()
      addTag(inputValue)
    }
    if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  // Suggestions filtered to exclude already-selected tags and matching input
  const filtered = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase())
  )

  const showCreate =
    inputValue.trim().length > 0 &&
    !suggestions.includes(inputValue.trim()) &&
    !value.includes(inputValue.trim())

  return (
    <div
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-none border border-border bg-background px-2 py-1.5 text-sm transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      {/* Selected tags */}
      {value.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="gap-1 pr-1 text-xs"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 rounded-none opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="size-3" />
            </button>
          )}
        </Badge>
      ))}

      {/* Input + dropdown */}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {/* Invisible trigger — input controls open state */}
            <span />
          </PopoverTrigger>

          <input
            className="min-w-[120px] flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-sm"
            placeholder={value.length === 0 ? placeholder : ""}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setOpen(e.target.value.length > 0 || filtered.length > 0)
            }}
            onFocus={() => setOpen(filtered.length > 0 || inputValue.length > 0)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />

          <PopoverContent
            className="w-56 p-0 bg-white"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandList>
                {filtered.length === 0 && !showCreate && (
                  <CommandEmpty>No matching tags.</CommandEmpty>
                )}
                {filtered.length > 0 && (
                  <CommandGroup heading="Existing tags">
                    {filtered.map((s) => (
                      <CommandItem
                        key={s}
                        value={s}
                        onSelect={() => addTag(s)}
                      >
                        {s}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {showCreate && (
                  <CommandGroup heading="Create">
                    <CommandItem
                      value={inputValue.trim()}
                      onSelect={() => addTag(inputValue)}
                    >
                      <Plus className="size-3" />
                      Create &ldquo;{inputValue.trim()}&rdquo;
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}