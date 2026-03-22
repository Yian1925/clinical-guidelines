import { useState, useRef, useEffect, useLayoutEffect, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseLocalYMD(s: string): Date {
  const parts = s.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return new Date();
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type DatePickerFieldProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  id?: string;
  'aria-label'?: string;
};

export default function DatePickerField({ value, onChange, placeholder, id, 'aria-label': ariaLabel }: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const initial = value ? parseLocalYMD(value) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const wrapRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  const updatePopoverPosition = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pop = popoverRef.current;
    const popW = pop?.offsetWidth ?? 268;
    const popH = pop?.offsetHeight ?? 300;
    const gap = 6;
    let top = r.bottom + gap;
    let left = r.left;
    if (top + popH > window.innerHeight - 8) {
      top = Math.max(8, r.top - popH - gap);
    }
    if (left + popW > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - popW - 8);
    }
    if (left < 8) left = 8;
    setPopoverPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePopoverPosition();
    const idRaf = requestAnimationFrame(() => updatePopoverPosition());
    return () => cancelAnimationFrame(idRaf);
  }, [open, viewYear, viewMonth]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePopoverPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const valueDate = value ? parseLocalYMD(value) : null;

  const cells: Date[] = [];
  let dayNum = 1 - new Date(viewYear, viewMonth, 1).getDay();
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(viewYear, viewMonth, dayNum));
    dayNum += 1;
  }

  const monthLabel = `${viewYear}年${viewMonth + 1}月`;

  const goPrevMonth = () => {
    if (viewMonth <= 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth >= 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const openCalendar = () => {
    const d = value ? parseLocalYMD(value) : new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setOpen(true);
  };

  const popover =
    open &&
    createPortal(
      <div
        ref={popoverRef}
        className="patients-cal-popover patients-cal-popover--portal"
        style={{ top: popoverPos.top, left: popoverPos.left }}
        role="dialog"
        aria-label={ariaLabel ?? '选择日期'}
      >
        <div className="patients-cal-head">
          <button type="button" className="patients-cal-nav" onClick={goPrevMonth} aria-label="上一月">
            ‹
          </button>
          <span className="patients-cal-title">{monthLabel}</span>
          <button type="button" className="patients-cal-nav" onClick={goNextMonth} aria-label="下一月">
            ›
          </button>
        </div>
        <div className="patients-cal-weekdays">
          {WEEKDAYS.map((w) => (
            <span key={w} className="patients-cal-wd">
              {w}
            </span>
          ))}
        </div>
        <div className="patients-cal-grid">
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === viewMonth;
            const selected = valueDate != null && sameDay(d, valueDate);
            return (
              <button
                key={i}
                type="button"
                className={`patients-cal-day${!inMonth ? ' patients-cal-day--muted' : ''}${selected ? ' patients-cal-day--selected' : ''}`}
                onClick={() => {
                  onChange(formatYMD(d));
                  setOpen(false);
                }}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>,
      document.body
    );

  const clearDate = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
    setOpen(false);
  };

  return (
    <div className="patients-date-field" ref={wrapRef}>
      <div
        ref={anchorRef}
        className={`patients-date-field-control${open ? ' patients-date-field-control--open' : ''}${!value ? ' patients-date-field-control--placeholder' : ''}`}
      >
        <button
          type="button"
          id={id}
          className="patients-date-field-value"
          onClick={() => (open ? setOpen(false) : openCalendar())}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel ?? placeholder}
        >
          <span className="patients-date-field-value-text">{value || placeholder}</span>
        </button>
        {value ? (
          <button
            type="button"
            className="patients-date-field-clear"
            onClick={clearDate}
            aria-label="清空日期"
            title="清空"
          >
            ×
          </button>
        ) : null}
      </div>
      {popover}
    </div>
  );
}
