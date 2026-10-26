'use client';

/**
 * ThemedSelect.tsx (AppSelect)
 * Accessible, Sakura Zen themed replacement for native <select> across the entire admin backoffice.
 * Powered by @radix-ui/react-select and aligned with LOCATION_SETTING_UIUX_AUDIT.md Section 3 & 7.
 */

import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import React, { forwardRef, useMemo } from 'react';

const EMPTY_SENTINEL = '__EMPTY_SELECT_VALUE__';

export type Option = {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
};

export type AppSelectProps = {
  value: string;
  onValueChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  id?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  /** Raise z-index when rendered inside custom modals (e.g. z-[90]) so the popper sits above the backdrop. */
  zIndexClass?: string;
};

function toRadixValue(val: string): string {
  return val === '' ? EMPTY_SENTINEL : val;
}

function fromRadixValue(val: string): string {
  return val === EMPTY_SENTINEL ? '' : val;
}

export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  id,
  icon,
  disabled,
  className = '',
  zIndexClass = 'z-[70]',
  ...aria
}: AppSelectProps) {
  const normalizedOptions = useMemo(
    () =>
      options.map((o) => ({
        ...o,
        radixValue: toRadixValue(o.value),
      })),
    [options]
  );

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const radixCurrentValue = selectedOption ? toRadixValue(value) : undefined;

  return (
    <Select.Root
      value={radixCurrentValue}
      onValueChange={(nextVal) => onValueChange(fromRadixValue(nextVal))}
      disabled={disabled}
    >
      <Select.Trigger
        id={id}
        {...aria}
        className={
          'group inline-flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg ' +
          'border border-(--border-field) bg-white px-3 text-sm font-medium text-(--text) ' +
          'transition-colors hover:bg-(--bg-subtle) ' +
          'focus-visible:border-(--brand) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)/30 ' +
          'data-[state=open]:border-(--brand) data-[placeholder]:text-(--text-placeholder) ' +
          'aria-[invalid=true]:border-(--error) disabled:cursor-not-allowed disabled:opacity-50 ' +
          className
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon && <span className="shrink-0 text-(--text-muted)">{icon}</span>}
          <span className="truncate" title={selectedOption?.label || placeholder}>
            <Select.Value placeholder={placeholder}>
              {selectedOption ? selectedOption.label : placeholder}
            </Select.Value>
          </span>
        </span>
        <Select.Icon>
          <ChevronDown className="size-4 shrink-0 text-(--text-muted) transition-transform group-data-[state=open]:rotate-180" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className={
            `${zIndexClass} app-select-content min-w-(--radix-select-trigger-width) max-w-[min(92vw,360px)] ` +
            'overflow-hidden rounded-xl border border-(--border) bg-white shadow-[0_8px_24px_rgba(27,28,28,0.12)]'
          }
        >
          <Select.Viewport className="app-select-viewport max-h-[min(320px,var(--radix-select-content-available-height))] p-1">
            {normalizedOptions.map((o) => (
              <Item key={o.radixValue} option={o} radixValue={o.radixValue} />
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

const Item = forwardRef<
  HTMLDivElement,
  { option: Option; radixValue: string }
>(function Item({ option, radixValue }, ref) {
  return (
    <Select.Item
      ref={ref}
      value={radixValue}
      disabled={option.disabled}
      className={
        'relative flex min-h-9 cursor-pointer select-none items-center rounded-lg py-1.5 pl-3 pr-9 text-sm text-(--text) outline-none ' +
        'data-[highlighted]:bg-(--bg-subtle) data-[state=checked]:bg-(--brand-soft) data-[state=checked]:font-semibold ' +
        'data-[state=checked]:data-[highlighted]:bg-(--brand-soft-hover) ' +
        'data-[disabled]:cursor-not-allowed data-[disabled]:text-(--text-muted) data-[disabled]:opacity-60'
      }
    >
      <span className="flex min-w-0 flex-col" title={option.label}>
        <Select.ItemText>{option.label}</Select.ItemText>
        {option.hint && (
          <span className="truncate text-xs font-normal text-(--text-muted)">
            {option.hint}
          </span>
        )}
      </span>
      <Select.ItemIndicator className="absolute right-3 text-(--brand)">
        <Check className="size-4" />
      </Select.ItemIndicator>
    </Select.Item>
  );
});

export default AppSelect;
