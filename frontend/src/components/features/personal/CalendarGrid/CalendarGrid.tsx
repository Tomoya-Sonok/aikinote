import { useMemo } from "react";
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
}

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
}: CalendarGridProps) {
  const today = useMemo(() => new Date(), []);
  const days = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  return (
    <div className={styles.calendar}>
      <div className={styles.weekHeader}>
        {dayNames.map((day) => (
          <div key={day} className={styles.weekDay}>
            {day}
          </div>
        ))}
      </div>
      <div className={styles.daysGrid}>
        {days.map(({ date, isCurrentMonth }) => {
          const status = getDateStatus?.(date);
          const isToday = isCurrentMonth && isSameDate(today, date);
          const isSelected =
            isCurrentMonth && selectedDate
              ? isSameDate(selectedDate, date)
              : false;
          const isAttended = isCurrentMonth && Boolean(status?.isAttended);
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
