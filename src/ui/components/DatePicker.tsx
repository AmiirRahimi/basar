'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import MultiDatePicker from 'react-multi-date-picker';
import TimePicker from 'react-multi-date-picker/plugins/time_picker';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { PiCalendarBlank, PiCaretDownBold } from 'react-icons/pi';
import { Input } from './Input';
import { FieldLabel } from './FieldLabel';
import { cn } from '../lib/cn';
import { useCloseOnScroll } from '../lib/useCloseOnScroll';
import { zIndex } from '../lib/zIndex';
import type { SizeType } from '../types';

export type DatePickerType = 'date' | 'time' | 'dateTime';
export type DatePickerValueCalendar = 'persian' | 'gregorian';

export type DatePickerProps = {
  label?: React.ReactNode;
  value?: string | Date | number | null;
  onChange?: (value: string | null) => void;
  type?: DatePickerType;
  size?: SizeType;
  format?: string;
  placeholderText?: string;
  disabled?: boolean;
  error?: string;
  /** Intl locale for display fallback (default fa-IR) */
  displayLocale?: string;
  outputFormat?: 'space' | 'iso';
  /**
   * Calendar used for string value parse/output.
   * Use `persian` for values like `1404/06/24` (check due dates).
   * Default `gregorian` keeps `YYYY-MM-DD` form values.
   */
  valueCalendar?: DatePickerValueCalendar;
};

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

const pad = (n: number) => String(n).padStart(2, '0');

const toLatinDigits = (value: string) =>
  String(value || '').replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));

const dateToFormValue = (
  value: Date | null,
  type: DatePickerType,
  outputFormat: 'space' | 'iso' = 'space',
  valueCalendar: DatePickerValueCalendar = 'gregorian'
): string | null => {
  if (!value) return null;

  if (valueCalendar === 'persian') {
    const persianDate = new DateObject({ date: value, calendar: persian, locale: persian_fa });
    if (!persianDate.isValid) return null;
    const date = toLatinDigits(persianDate.format('YYYY/MM/DD'));
    const time = `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
    if (type === 'time') return time;
    if (type === 'dateTime') return `${date}${outputFormat === 'space' ? ' ' : 'T'}${time}`;
    return date;
  }

  const time = `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(
    value.getSeconds()
  )}`;
  const date = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate()
  )}`;

  if (type === 'time') return time;
  if (type === 'dateTime') return `${date}${outputFormat === 'space' ? ' ' : 'T'}${time}`;
  return date;
};

const timeStringToDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return null;

  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59 ||
    seconds < 0 ||
    seconds > 59
  ) {
    return null;
  }

  const d = new Date();
  d.setHours(hours, minutes, seconds, 0);
  return d;
};

const parseDateTimeString = (value: string): Date | null => {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(
      value.trim()
    );
  if (!match) return null;

  const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds)
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parsePersianDateString = (value: string): Date | null => {
  const normalized = toLatinDigits(value).trim().replace(/-/g, '/');
  const match =
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(
      normalized
    );
  if (!match) return null;

  const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = match;
  const parsed = new DateObject({
    calendar: persian,
    locale: persian_fa,
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hours),
    minute: Number(minutes),
    second: Number(seconds),
  });

  return parsed.isValid ? parsed.toDate() : null;
};

const toDateOrNull = (
  value: unknown,
  valueCalendar: DatePickerValueCalendar = 'gregorian'
): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === 'string') {
    if (valueCalendar === 'persian') {
      const persianParsed = parsePersianDateString(value);
      if (persianParsed) return persianParsed;
    }
    const parsedDateTime = parseDateTimeString(value);
    if (parsedDateTime) return parsedDateTime;
    if (valueCalendar !== 'persian') {
      const persianFallback = parsePersianDateString(value);
      if (persianFallback) return persianFallback;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
};

export function DatePicker({
  label,
  value,
  onChange,
  type = 'date',
  size = 'md',
  format,
  placeholderText,
  disabled,
  error,
  displayLocale = 'fa-IR',
  outputFormat = 'space',
  valueCalendar = 'gregorian',
}: DatePickerProps) {
  const [isCalenderOpen, setIsCalenderOpen] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<{ closeCalendar?: () => void } | null>(null);

  const selected = useMemo(
    () => (type === 'time' ? timeStringToDate(value) : toDateOrNull(value, valueCalendar)),
    [value, type, valueCalendar]
  );

  const showTime = type === 'dateTime';
  const onlyTime = type === 'time';
  const inputSize = size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalTarget(document.body);
    }
  }, []);

  const isInsideCalendar = (target: Node): boolean => {
    let el: HTMLElement | null = target as HTMLElement;
    while (el) {
      if (el.classList && typeof el.classList.length === 'number') {
        for (let i = 0; i < el.classList.length; i++) {
          if ((el.classList[i] as string)?.startsWith('rmdp-')) return true;
        }
      }
      el = el.parentElement;
    }
    return false;
  };

  const closeCalendar = () => {
    datePickerRef.current?.closeCalendar?.();
    setIsCalenderOpen(false);
  };

  useEffect(() => {
    if (!isCalenderOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current && containerRef.current.contains(target)) return;
      if (isInsideCalendar(target)) return;
      closeCalendar();
    };
    document.addEventListener('mousedown', handleClickOutside, { capture: true });
    return () =>
      document.removeEventListener('mousedown', handleClickOutside, { capture: true });
  }, [isCalenderOpen]);

  useCloseOnScroll(
    isCalenderOpen,
    closeCalendar,
    [containerRef],
    (target) => target instanceof Node && isInsideCalendar(target)
  );

  const getDisplayValue = () => {
    if (!selected) return '';
    try {
      return new Intl.DateTimeFormat(displayLocale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...(showTime || onlyTime
          ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
          : {}),
      }).format(selected);
    } catch {
      return '';
    }
  };

  const pickerFormat =
    format || (showTime ? 'YYYY/MM/DD HH:mm:ss' : onlyTime ? 'HH:mm:ss' : 'YYYY/MM/DD');

  const formatInputDisplayValue = (value: unknown): string => {
    if (value == null || value === '') return '';

    let displayValue: string;
    if (typeof value === 'string') {
      displayValue = value;
    } else if (
      typeof value === 'object' &&
      value !== null &&
      'format' in value &&
      typeof (value as { format?: (f: string) => string }).format === 'function'
    ) {
      displayValue = (value as { format: (f: string) => string }).format(pickerFormat);
    } else if (selected) {
      displayValue = getDisplayValue();
    } else {
      displayValue = String(value);
    }

    if (onlyTime || !showTime) return displayValue;

    const match = displayValue.trim().match(/^(.+?)\s+(.+)$/);
    if (!match) return displayValue;

    return `${match[2]}  -  ${match[1]}`;
  };

  return (
    <div ref={containerRef} className="relative min-w-0 w-full">
      <MultiDatePicker
        ref={datePickerRef}
        value={selected}
        onChange={(date: { isValid?: boolean; toDate?: () => Date } | null) => {
          if (date?.isValid && date.toDate) {
            onChange?.(dateToFormValue(date.toDate(), type, outputFormat, valueCalendar));
          } else {
            onChange?.(null);
          }
        }}
        calendar={persian}
        locale={persian_fa}
        format={pickerFormat}
        plugins={showTime || onlyTime ? [<TimePicker position="bottom" key="timePicker" />] : []}
        disableDayPicker={onlyTime}
        calendarPosition="bottom-center"
        fixMainPosition
        portal
        portalTarget={portalTarget}
        zIndex={zIndex.dropdown}
        className="w-full"
        onOpen={() => setIsCalenderOpen(true)}
        onClose={() => setIsCalenderOpen(false)}
        render={(value: unknown, openCalendar: () => void) => (
          <div className="flex w-full flex-col gap-1.5">
            {label ? <FieldLabel disabled={disabled}>{label}</FieldLabel> : null}
            <div className="relative">
              <Input
                size={inputSize}
                value={formatInputDisplayValue(value)}
                readOnly
                disabled={disabled}
                placeholder={placeholderText || 'Select date'}
                className={cn(
                  'cursor-pointer pr-10',
                  disabled && 'cursor-not-allowed',
                  error &&
                    'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/50 dark:focus:ring-red-500/20'
                )}
                icon={<PiCalendarBlank className="h-4 w-4" />}
                onClick={disabled ? undefined : openCalendar}
              />
              <button
                type="button"
                disabled={disabled}
                onClick={disabled ? undefined : openCalendar}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <PiCaretDownBold
                  className={cn(
                    'h-4 w-4 text-gray-400 transition-transform duration-200',
                    isCalenderOpen && 'rotate-180'
                  )}
                />
              </button>
            </div>
            {error ? <p className="text-xs text-red-500 dark:text-red-400">{error}</p> : null}
          </div>
        )}
      />
    </div>
  );
}

export default DatePicker;
