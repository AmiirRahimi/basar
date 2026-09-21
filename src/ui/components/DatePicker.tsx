'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock } from 'lucide-react';
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
  displayLocale?: string;
  outputFormat?: 'space' | 'iso';
  valueCalendar?: DatePickerValueCalendar;
};

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const PANEL_MS = 320;

const pad = (n: number) => String(n).padStart(2, '0');

const toLatinDigits = (value: string) =>
  String(value || '').replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));

const toFaDigits = (value: string | number) =>
  String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

const dateToFormValue = (
  value: Date | null,
  type: DatePickerType,
  outputFormat: 'space' | 'iso' = 'space',
  valueCalendar: DatePickerValueCalendar = 'gregorian',
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

  const time = `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  const date = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
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
    [hours, minutes, seconds].some((n) => Number.isNaN(n)) ||
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
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hours = '0', minutes = '0', seconds = '0'] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parsePersianDateString = (value: string): Date | null => {
  const normalized = toLatinDigits(value).trim().replace(/-/g, '/');
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(normalized);
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

const toDateOrNull = (value: unknown, valueCalendar: DatePickerValueCalendar = 'gregorian'): Date | null => {
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

function persianParts(date: Date) {
  const obj = new DateObject({ date, calendar: persian, locale: persian_fa });
  return {
    year: obj.year,
    month: obj.month.number,
    day: obj.day,
    monthName: obj.month.name,
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

function monthCells(year: number, month: number) {
  const first = new DateObject({ calendar: persian, locale: persian_fa, year, month, day: 1 });
  const length = first.month.length;
  const leading = (first.toDate().getDay() + 1) % 7;
  return { length, leading, monthName: first.month.name };
}

function Accordion({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

function TimeUnit({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const step = (delta: number) => onChange((value + delta + max + 1) % (max + 1));
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-2xl bg-gray-50 px-2 py-2.5 ring-1 ring-gray-100">
      <button
        type="button"
        onClick={() => step(1)}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 transition hover:bg-white hover:text-gray-900"
        aria-label={`${label} بیشتر`}
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <p className="text-2xl font-semibold tabular-nums text-gray-900">{toFaDigits(pad(value))}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
      <button
        type="button"
        onClick={() => step(-1)}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 transition hover:bg-white hover:text-gray-900"
        aria-label={`${label} کمتر`}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}

export function DatePicker({
  label,
  value,
  onChange,
  type = 'date',
  size = 'md',
  placeholderText,
  disabled,
  error,
  outputFormat = 'space',
  valueCalendar = 'gregorian',
}: DatePickerProps) {
  const showTime = type === 'dateTime';
  const onlyTime = type === 'time';
  const showDate = type !== 'time';
  const inputSize = size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md';

  const selected = useMemo(
    () => (onlyTime ? timeStringToDate(value) : toDateOrNull(value, valueCalendar)),
    [value, onlyTime, valueCalendar],
  );

  const today = useMemo(() => persianParts(new Date()), []);
  const selectedParts = selected ? persianParts(selected) : null;

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panel, setPanel] = useState<'date' | 'time'>(onlyTime ? 'time' : 'date');
  const [viewYear, setViewYear] = useState(selectedParts?.year || today.year);
  const [viewMonth, setViewMonth] = useState(selectedParts?.month || today.month);
  const [hour, setHour] = useState(selectedParts?.hour ?? 0);
  const [minute, setMinute] = useState(selectedParts?.minute ?? 0);
  const [second, setSecond] = useState(selectedParts?.second ?? 0);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 320, place: 'bottom' as 'bottom' | 'top' });

  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedParts) {
      setViewYear(selectedParts.year);
      setViewMonth(selectedParts.month);
      setHour(selectedParts.hour);
      setMinute(selectedParts.minute);
      setSecond(selectedParts.second);
    }
  }, [value]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setPanel(onlyTime ? 'time' : 'date');
      if (!selectedParts) {
        setViewYear(today.year);
        setViewMonth(today.month);
      }
    } else {
      const timer = window.setTimeout(() => setMounted(false), PANEL_MS);
      return () => window.clearTimeout(timer);
    }
  }, [open, onlyTime]);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(320, window.innerWidth - 16);
      const height = panelRef.current?.offsetHeight || 360;
      const rtl = getComputedStyle(document.documentElement).direction === 'rtl';
      let left = rtl ? rect.right - width : rect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      const below = rect.bottom + 8;
      const placeTop = below + height > window.innerHeight - 8 && rect.top - 8 - height > 8;
      setPos({
        top: placeTop ? rect.top - 8 - height : below,
        left,
        width,
        place: placeTop ? 'top' : 'bottom',
      });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, mounted, panel]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const node = event.target as Node;
      if (wrapRef.current?.contains(node) || panelRef.current?.contains(node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  useCloseOnScroll(open, () => setOpen(false), [wrapRef, panelRef]);

  const { length, leading, monthName } = useMemo(() => monthCells(viewYear, viewMonth), [viewYear, viewMonth]);

  function shiftMonth(delta: number) {
    const next = new DateObject({ calendar: persian, locale: persian_fa, year: viewYear, month: viewMonth, day: 1 });
    next.add(delta, 'month');
    setViewYear(next.year);
    setViewMonth(next.month.number);
  }

  function commit(next: Date) {
    onChange?.(dateToFormValue(next, type, outputFormat, valueCalendar));
  }

  function pickDay(day: number) {
    const obj = new DateObject({
      calendar: persian,
      locale: persian_fa,
      year: viewYear,
      month: viewMonth,
      day,
      hour,
      minute,
      second,
    });
    if (!obj.isValid) return;
    commit(obj.toDate());
    if (!showTime) setOpen(false);
  }

  function pickTime(nextHour: number, nextMinute: number, nextSecond: number) {
    setHour(nextHour);
    setMinute(nextMinute);
    setSecond(nextSecond);
    if (onlyTime) {
      const d = new Date();
      d.setHours(nextHour, nextMinute, nextSecond, 0);
      commit(d);
      return;
    }
    if (!selected) return;
    const parts = persianParts(selected);
    const obj = new DateObject({
      calendar: persian,
      locale: persian_fa,
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: nextHour,
      minute: nextMinute,
      second: nextSecond,
    });
    if (obj.isValid) commit(obj.toDate());
  }

  const displayValue = (() => {
    if (!selected) return '';
    if (onlyTime) return toFaDigits(`${pad(selected.getHours())}:${pad(selected.getMinutes())}`);
    const obj = new DateObject({ date: selected, calendar: persian, locale: persian_fa });
    const date = obj.format('YYYY/MM/DD');
    if (!showTime) return date;
    return `${toFaDigits(`${pad(selected.getHours())}:${pad(selected.getMinutes())}`)}  -  ${date}`;
  })();

  const cells: Array<number | null> = [...Array(leading).fill(null), ...Array.from({ length }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <div ref={wrapRef} className="relative min-w-0 w-full">
      <div className="flex w-full flex-col gap-1.5">
        {label ? <FieldLabel disabled={disabled}>{label}</FieldLabel> : null}
        <div className="relative">
          <Input
            size={inputSize}
            value={displayValue}
            readOnly
            disabled={disabled}
            placeholder={placeholderText || (onlyTime ? 'انتخاب ساعت' : 'انتخاب تاریخ')}
            className={cn(
              'cursor-pointer pr-10',
              disabled && 'cursor-not-allowed',
              error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
            )}
            icon={onlyTime ? <Clock className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
            onClick={disabled ? undefined : () => setOpen((current) => !current)}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={disabled ? undefined : () => setOpen((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-label={open ? 'بستن تقویم' : 'باز کردن تقویم'}
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-300', open && 'rotate-180')} />
          </button>
        </div>
        {error ? <p className="text-xs text-red-500">{error}</p> : null}
      </div>

      {mounted && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: pos.top, left: pos.left, width: pos.width, zIndex: zIndex.dropdown }}
              className={cn(
                'fixed origin-top rounded-3xl border border-gray-200 bg-white p-3 shadow-xl shadow-gray-900/10 transition duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
                pos.place === 'top' && 'origin-bottom',
                open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0',
                pos.place === 'bottom' && !open && '-translate-y-1',
                pos.place === 'top' && !open && 'translate-y-1',
              )}
            >
              {showDate && showTime ? (
                <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setPanel('date')}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition',
                      panel === 'date' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800',
                    )}
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    تاریخ
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel('time')}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition',
                      panel === 'time' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800',
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    ساعت
                  </button>
                </div>
              ) : null}

              {showDate ? (
                <Accordion open={!onlyTime && panel === 'date'}>
                  <div className="pb-1">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => shiftMonth(-1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
                        aria-label="ماه قبل"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <p className="text-sm font-semibold text-gray-900">
                        {monthName} {toFaDigits(viewYear)}
                      </p>
                      <button
                        type="button"
                        onClick={() => shiftMonth(1)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
                        aria-label="ماه بعد"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mb-1 grid grid-cols-7">
                      {WEEKDAYS.map((day) => (
                        <p key={day} className="py-1 text-center text-[11px] font-medium text-gray-400">
                          {day}
                        </p>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {cells.map((day, index) => {
                        if (!day) return <span key={`e-${index}`} className="h-9" />;
                        const isSelected =
                          selectedParts?.year === viewYear && selectedParts?.month === viewMonth && selectedParts.day === day;
                        const isToday = today.year === viewYear && today.month === viewMonth && today.day === day;
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => pickDay(day)}
                            className={cn(
                              'h-9 rounded-xl text-sm tabular-nums transition',
                              isSelected
                                ? 'bg-primary text-white shadow-sm shadow-primary/20'
                                : isToday
                                  ? 'bg-primary/10 font-medium text-primary'
                                  : 'text-gray-800 hover:bg-gray-50',
                            )}
                          >
                            {toFaDigits(day)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </Accordion>
              ) : null}

              {showTime || onlyTime ? (
                <Accordion open={onlyTime || panel === 'time'}>
                  <div className={cn('flex gap-2', showDate && 'pt-1')}>
                    <TimeUnit label="ثانیه" value={second} max={59} onChange={(n) => pickTime(hour, minute, n)} />
                    <TimeUnit label="دقیقه" value={minute} max={59} onChange={(n) => pickTime(hour, n, second)} />
                    <TimeUnit label="ساعت" value={hour} max={23} onChange={(n) => pickTime(n, minute, second)} />
                  </div>
                </Accordion>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default DatePicker;
