"use client";

import { BellRingingIcon } from "@phosphor-icons/react";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./CalendarGrid.module.css";

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
};

export interface CalendarDayStatus {
  isAttended?: boolean;
  pageCount?: number;
}

interface CalendarGridClassNames {
  dayButton?: string;
  otherMonth?: string;
  today?: string;
  selected?: string;
  rangeDay?: string;
}

interface CalendarGridProps {
  currentMonth: Date;
  dayNames: string[];
  selectedDate?: Date | null;
  selectedRange?: { start: Date | null; end: Date | null };
  onDateClick: (date: Date, isCurrentMonth: boolean) => void;
  highlightSelectedDate?: boolean;
  highlightRange?: boolean;
  classNames?: CalendarGridClassNames;
  getDateStatus?: (date: Date) => CalendarDayStatus | undefined;
  highlightedDaysOfWeek?: number[];
  onMonthChange?: (direction: "prev" | "next") => void;
  examDate?: string;
}

const SWIPE_DEAD_ZONE = 5;
const SWIPE_THRESHOLD_RATIO = 0.2;

const isSameDate = (a: Date, b: Date) => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const formatDateKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const buildCalendarDays = (currentMonth: Date): CalendarDay[] => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i -= 1) {
    const day = prevMonthDays - i;
    days.push({
      date: new Date(year, month - 1, day),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  const remainingDays = 42 - days.length;
  for (let day = 1; day <= remainingDays; day += 1) {
    days.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
    });
  }

  return days;
};

export function CalendarGrid({
  currentMonth,
  dayNames,
  selectedDate,
  selectedRange,
  onDateClick,
  highlightSelectedDate = true,
  highlightRange = false,
  classNames,
  getDateStatus,
  highlightedDaysOfWeek,
  onMonthChange,
  examDate,
}: CalendarGridProps) {
  const today = useMemo(() => new Date(), []);
  const days = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const widthRef = useRef(1);
  const dragOffsetRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isSettling, setIsSettling] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: currentMonth is a dependency
  useEffect(() => {
    setIsSettling(false);
  }, [currentMonth]);

  const settle = useCallback(() => {
    const threshold = widthRef.current * SWIPE_THRESHOLD_RATIO;
    const delta = dragOffsetRef.current;

    if (delta < -threshold) {
      setIsSettling(true);
      onMonthChange?.("next");
    } else if (delta > threshold) {
      setIsSettling(true);
      onMonthChange?.("prev");
    }

    dragOffsetRef.current = 0;
    pointerIdRef.current = null;
    isHorizontalRef.current = null;
    setDragOffset(0);
  }, [onMonthChange]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!onMonthChange) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      pointerIdRef.current = event.pointerId;
      startXRef.current = event.clientX;
      startYRef.current = event.clientY;
      widthRef.current = containerRef.current?.offsetWidth ?? 1;
      dragOffsetRef.current = 0;
      isHorizontalRef.current = null;
      if (event.pointerType !== "mouse") {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
    },
    [onMonthChange],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) return;

      const deltaX = event.clientX - startXRef.current;
      const deltaY = event.clientY - startYRef.current;

      if (isHorizontalRef.current === null) {
        if (
          Math.abs(deltaX) < SWIPE_DEAD_ZONE &&
          Math.abs(deltaY) < SWIPE_DEAD_ZONE
        )
          return;
        isHorizontalRef.current = Math.abs(deltaX) > Math.abs(deltaY);
        if (!isHorizontalRef.current) {
          pointerIdRef.current = null;
          return;
        }
      }

      if (!isHorizontalRef.current) return;

      dragOffsetRef.current = deltaX;
      setDragOffset(deltaX);
    },
    [],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) return;
      settle();
    },
    [settle],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) return;
      dragOffsetRef.current = 0;
      pointerIdRef.current = null;
      isHorizontalRef.current = null;
      setDragOffset(0);
    },
    [],
  );

  const isDragging = dragOffset !== 0;
  const gridStyle = isSettling
    ? { opacity: 0 as const, transition: "none" as const }
    : isDragging
      ? {
          transform: `translateX(${dragOffset}px)`,
          transition: "none" as const,
        }
      : { transition: "transform 0.15s ease-out" };

  return (
    <div
      ref={containerRef}
      className={styles.calendar}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div className={styles.weekHeader}>
        {dayNames.map((day) => (
          <div key={day} className={styles.weekDay}>
            {day}
          </div>
        ))}
      </div>
      <div className={styles.daysGrid} style={gridStyle}>
        {days.map(({ date, isCurrentMonth }) => {
          const status = getDateStatus?.(date);
          const isToday = isCurrentMonth && isSameDate(today, date);
          const isSelected =
            isCurrentMonth && selectedDate
              ? isSameDate(selectedDate, date)
              : false;
          const isAttended = isCurrentMonth && Boolean(status?.isAttended);
          const hasReminderMark =
            isCurrentMonth &&
            highlightedDaysOfWeek !== undefined &&
            highlightedDaysOfWeek.includes(date.getDay());
          const isExamDay = (() => {
            if (!isCurrentMonth || !examDate) return false;
            const parts = examDate.split("-");
            if (parts.length !== 3) return false;
            return (
              date.getFullYear() === Number(parts[0]) &&
              date.getMonth() + 1 === Number(parts[1]) &&
              date.getDate() === Number(parts[2])
            );
          })();
          const dotCount = isCurrentMonth
            ? Math.min(status?.pageCount ?? 0, 3)
            : 0;

          const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const rangeStart = selectedRange?.start
            ? formatDateKey(selectedRange.start)
            : null;
          const rangeEnd = selectedRange?.end
            ? formatDateKey(selectedRange.end)
            : null;

          const isInRange =
            highlightRange &&
            isCurrentMonth &&
            rangeStart &&
            rangeEnd &&
            rangeStart <= dateKey &&
            dateKey <= rangeEnd;

          const buttonClass = [
            styles.dayButton,
            classNames?.dayButton,
            !isCurrentMonth ? styles.otherMonth : "",
            !isCurrentMonth ? classNames?.otherMonth : "",
            isToday ? styles.today : "",
            isToday ? classNames?.today : "",
            highlightSelectedDate && isSelected ? styles.selected : "",
            highlightSelectedDate && isSelected ? classNames?.selected : "",
            isInRange ? styles.rangeDay : "",
            isInRange ? classNames?.rangeDay : "",
            isExamDay ? styles.examDay : "",
          ]
            .filter(Boolean)
            .join(" ");

          const dotDescriptors = [
            {
              key: "primary-1",
              className: styles.pageDotPrimary,
            },
            {
              key: "primary-2",
              className: styles.pageDotPrimary,
            },
            {
              key: "overflow-1",
              className: styles.pageDotOverflow,
            },
          ].slice(0, dotCount);

          return (
            <button
              key={dateKey}
              type="button"
              className={buttonClass}
              onClick={() => onDateClick(date, isCurrentMonth)}
            >
              {hasReminderMark && (
                <BellRingingIcon
                  size={10}
                  weight="fill"
                  className={styles.reminderIcon}
                />
              )}
              <span
                className={[
                  styles.dayNumber,
                  isAttended ? styles.dayNumberAttended : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {date.getDate()}
              </span>
              {dotCount > 0 && (
                <span className={styles.pageDots} aria-hidden="true">
                  {dotDescriptors.map((dot) => (
                    <span
                      key={`${dateKey}-dot-${dot.key}`}
                      className={[styles.pageDot, dot.className]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
