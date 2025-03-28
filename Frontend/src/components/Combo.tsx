import { Popover, PopoverTrigger, PopoverContent } from "@radix-ui/react-popover"; // Ensure these imports are correct
import { Button } from "@/components/ui/button"; // Adjust the import path as necessary
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"; // Adjust the import path as necessary
import { Check, ChevronsUpDown } from "lucide-react"; // Ensure these icons are imported
import { cn } from "@/lib/utils"; // Ensure this utility is imported correctly

interface Framework {
  value: string;
  label: string;
}

interface ComboboxProps {
  frameworks: Framework[];
  value: string;
  setValue: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  onChange: (value: string) => void; // New prop for callback
}

export const Combobox: React.FC<ComboboxProps> = ({ frameworks, value, setValue, open, setOpen, onChange }) => {
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
      <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full max-w-[478px] justify-between py-3 px-4 border rounded-lg text-sm bg-neutral-900 border-neutral-700 text-neutral-300 placeholder-neutral-500 hover:bg-neutral-800 focus:bg-neutral-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none"
          >
          {value
            ? frameworks.find((framework) => framework.value === value)?.label
            : "Select location..."}
          <ChevronsUpDown className="ml-2 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] py-3 px-4 block w-full border rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none bg-neutral-900 dark:bg-neutral-900 border-neutral-700 dark:border-neutral-700 text-neutral-400 dark:text-neutral-400 placeholder-neutral-500 dark:placeholder-neutral-500 focus:ring-neutral-600 dark">
        <Command className="h-[280px] overflow-auto ">
          <CommandInput placeholder="Search location..." />
          <CommandList>
            <CommandEmpty>No location found.</CommandEmpty>
            <CommandGroup>
              {frameworks.map((framework) => (
                <CommandItem
                  key={framework.value}
                  onSelect={(currentValue) => {
                    const newValue = currentValue === value ? "" : currentValue;
                    setValue(newValue);
                    onChange(newValue);
                    setOpen(false);
                  }}
                >
                  {framework.label}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === framework.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};