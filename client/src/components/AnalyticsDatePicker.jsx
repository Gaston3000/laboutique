import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import "../styles/AnalyticsDatePicker.css";

const PRESETS = [
  { key: "today", label: "Hoy", icon: "📅" },
  { key: "yesterday", label: "Ayer", icon: "◀" },
  { key: "7d", label: "Últimos 7 días", icon: "7" },
  { key: "14d", label: "Últimos 14 días", icon: "14" },
  { key: "30d", label: "Últimos 30 días", icon: "30" },
  { key: "60d", label: "Últimos 60 días", icon: "60" },
  { key: "90d", label: "Últimos 90 días", icon: "90" },
];

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAY_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function toDateKey(date) {
  if (!date) return "";
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return toDateKey(a) === toDateKey(b);
}

function isInRange(date, from, to) {
  if (!date || !from || !to) return false;
  const d = new Date(date).setHours(0, 0, 0, 0);
  const f = new Date(from).setHours(0, 0, 0, 0);
  const t = new Date(to).setHours(0, 0, 0, 0);
  return d >= f && d <= t;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getMonthDays(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function presetToRange(key) {
  const now = new Date();
  const today = startOfDay(now);

  switch (key) {
    case "today":
      return { from: today, to: now };
    case "yesterday": {
      const from = startOfDay(addDays(now, -1));
      return { from, to: today };
    }
    default: {
      const match = key.match(/^(\d+)d$/);
      if (match) {
        const days = parseInt(match[1], 10);
        return { from: startOfDay(addDays(now, -days)), to: now };
      }
      return { from: startOfDay(addDays(now, -30)), to: now };
    }
  }
}

function formatDisplayDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function formatDisplayRange(presetKey, from, to) {
  const preset = PRESETS.find((p) => p.key === presetKey);
  if (preset) return preset.label;

  if (from && to) {
    if (isSameDay(from, to)) {
      return formatDisplayDate(from);
    }
    return `${formatDisplayDate(from)} — ${formatDisplayDate(to)}`;
  }

  return "Seleccionar rango";
}

function CalendarMonth({ year, month, rangeFrom, rangeTo, hoverDate, onDateClick, onDateHover, minDate, maxDate }) {
  const daysInMonth = getMonthDays(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const todayKey = toDateKey(new Date());

  const cells = [];
  for (let i = 0; i < firstDow; i++) {
    cells.push(<div key={`blank-${i}`} className="adp-cal-cell adp-cal-blank" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    const isToday = dateKey === todayKey;
    const isDisabled = (maxDate && date > maxDate) || (minDate && date < minDate);

    const effectiveTo = rangeTo || hoverDate;
    const isStart = rangeFrom && isSameDay(date, rangeFrom);
    const isEnd = effectiveTo && isSameDay(date, effectiveTo);
    const inRange = rangeFrom && effectiveTo
      ? isInRange(date, rangeFrom > effectiveTo ? effectiveTo : rangeFrom, rangeFrom > effectiveTo ? rangeFrom : effectiveTo)
      : false;

    let cls = "adp-cal-cell adp-cal-day";
    if (isToday) cls += " adp-cal-today";
    if (isDisabled) cls += " adp-cal-disabled";
    if (isStart) cls += " adp-cal-start";
    if (isEnd) cls += " adp-cal-end";
    if (inRange && !isStart && !isEnd) cls += " adp-cal-in-range";
    if ((isStart || isEnd) && inRange) cls += " adp-cal-edge";

    cells.push(
      <button
        key={day}
        type="button"
        className={cls}
        disabled={isDisabled}
        onClick={() => !isDisabled && onDateClick(date)}
        onMouseEnter={() => !isDisabled && onDateHover(date)}
        aria-label={`${day} de ${MONTH_NAMES[month]} de ${year}`}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="adp-cal-month">
      <div className="adp-cal-month-title">{MONTH_NAMES[month]} {year}</div>
      <div className="adp-cal-weekdays">
        {DAY_LABELS.map((d) => (
          <div key={d} className="adp-cal-wday">{d}</div>
        ))}
      </div>
      <div className="adp-cal-grid">{cells}</div>
    </div>
  );
}

export default function AnalyticsDatePicker({ value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(value || "30d");
  const [mode, setMode] = useState("preset");
  const [calFrom, setCalFrom] = useState(null);
  const [calTo, setCalTo] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const [pickStep, setPickStep] = useState("from");

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const containerRef = useRef(null);

  const maxDate = useMemo(() => new Date(), []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (typeof value === "string" && PRESETS.some((p) => p.key === value)) {
      setActivePreset(value);
      setMode("preset");
    }
  }, [value]);

  const prevMonth = useCallback(() => {
    setViewMonth((v) => {
      const m = v.month - 1;
      return m < 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: m };
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((v) => {
      const m = v.month + 1;
      return m > 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: m };
    });
  }, []);

  const secondMonth = useMemo(() => {
    const m = viewMonth.month + 1;
    return m > 11 ? { year: viewMonth.year + 1, month: 0 } : { year: viewMonth.year, month: m };
  }, [viewMonth]);

  function handlePresetClick(key) {
    setActivePreset(key);
    setMode("preset");
    setCalFrom(null);
    setCalTo(null);
    setPickStep("from");

    const range = presetToRange(key);
    onChange({ preset: key, from: range.from, to: range.to });
    setIsOpen(false);
  }

  function handleDateClick(date) {
    if (pickStep === "from") {
      setCalFrom(date);
      setCalTo(null);
      setPickStep("to");
      setActivePreset(null);
      setMode("custom");
    } else {
      let from = calFrom;
      let to = date;
      if (from > to) {
        [from, to] = [to, from];
      }
      setCalFrom(from);
      setCalTo(to);
      setPickStep("from");
      setActivePreset(null);
      setMode("custom");
      onChange({ preset: null, from: startOfDay(from), to: startOfDay(addDays(to, 1)) });
      setIsOpen(false);
    }
  }

  function handleDateHover(date) {
    if (pickStep === "to") {
      setHoverDate(date);
    }
  }

  function handleClearCustom() {
    setCalFrom(null);
    setCalTo(null);
    setPickStep("from");
    setHoverDate(null);
  }

  const displayText = activePreset
    ? formatDisplayRange(activePreset, null, null)
    : formatDisplayRange(null, calFrom, calTo);

  const isCustomActive = mode === "custom";

  return (
    <div className="adp-container" ref={containerRef}>
      <button
        type="button"
        className={`adp-trigger ${isOpen ? "adp-trigger-open" : ""}`}
        onClick={() => setIsOpen((o) => !o)}
        disabled={disabled}
      >
        <svg className="adp-trigger-icon" viewBox="0 0 20 20" fill="none" width="18" height="18">
          <rect x="2" y="3" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M2 8h16" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 1v4M14 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="adp-trigger-text">{displayText}</span>
        <svg className={`adp-trigger-chevron ${isOpen ? "adp-trigger-chevron-open" : ""}`} viewBox="0 0 12 12" width="12" height="12">
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </button>

      {isOpen && (
        <div className="adp-dropdown">
          <div className="adp-sidebar">
            <div className="adp-sidebar-title">Rango rápido</div>
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                className={`adp-preset-btn ${activePreset === preset.key ? "adp-preset-active" : ""}`}
                onClick={() => handlePresetClick(preset.key)}
              >
                <span className="adp-preset-icon">{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            ))}

            <div className="adp-sidebar-divider" />

            <button
              type="button"
              className={`adp-preset-btn adp-custom-btn ${isCustomActive ? "adp-preset-active" : ""}`}
              onClick={() => {
                setMode("custom");
                setActivePreset(null);
                handleClearCustom();
              }}
            >
              <span className="adp-preset-icon">✦</span>
              <span>Personalizado</span>
            </button>
          </div>

          <div className="adp-calendar-panel">
            <div className="adp-cal-header">
              <button type="button" className="adp-cal-nav" onClick={prevMonth} aria-label="Mes anterior">
                <svg viewBox="0 0 16 16" width="16" height="16"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
              </button>
              <div className="adp-cal-header-months">
                <span>{MONTH_NAMES[viewMonth.month]} {viewMonth.year}</span>
                <span>{MONTH_NAMES[secondMonth.month]} {secondMonth.year}</span>
              </div>
              <button type="button" className="adp-cal-nav" onClick={nextMonth} aria-label="Mes siguiente">
                <svg viewBox="0 0 16 16" width="16" height="16"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
              </button>
            </div>

            {pickStep === "to" && calFrom && (
              <div className="adp-cal-hint">
                Desde <strong>{formatDisplayDate(calFrom)}</strong> — seleccioná la fecha final
                {hoverDate && (() => {
                  const a = startOfDay(calFrom).getTime();
                  const b = startOfDay(hoverDate).getTime();
                  const days = Math.round(Math.abs(b - a) / 86400000) + 1;
                  return (
                    <span className="adp-days-badge">
                      {days} {days === 1 ? 'día' : 'días'}
                    </span>
                  );
                })()}
              </div>
            )}

            {pickStep === "from" && (
              <div className="adp-cal-hint">
                Seleccioná la fecha de inicio
              </div>
            )}

            <div className="adp-cal-body">
              <CalendarMonth
                year={viewMonth.year}
                month={viewMonth.month}
                rangeFrom={calFrom}
                rangeTo={calTo}
                hoverDate={hoverDate}
                onDateClick={handleDateClick}
                onDateHover={handleDateHover}
                maxDate={maxDate}
              />
              <CalendarMonth
                year={secondMonth.year}
                month={secondMonth.month}
                rangeFrom={calFrom}
                rangeTo={calTo}
                hoverDate={hoverDate}
                onDateClick={handleDateClick}
                onDateHover={handleDateHover}
                maxDate={maxDate}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
