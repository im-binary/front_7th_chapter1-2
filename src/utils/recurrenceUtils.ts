import { EventForm, RepeatInfo } from '../types';
import { formatDate, getDaysInMonth } from './dateUtils';

// 상수 정의
const MAX_RECURRENCE_DATE = '2025-12-31' as const;
const LAST_DAY_OF_MONTH = 31 as const;
const LEAP_DAY = 29 as const;
const FEBRUARY_INDEX = 1 as const;
const DAYS_IN_WEEK = 7 as const;

/**
 * 윤년 여부를 판단합니다
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * 매월 반복 시 31일 특수 케이스를 검증합니다
 */
function isValidMonthlyRecurrence(currentDate: Date, initialDay: number): boolean {
  if (initialDay !== LAST_DAY_OF_MONTH) {
    return true;
  }

  const daysInCurrentMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
  return daysInCurrentMonth === LAST_DAY_OF_MONTH;
}

/**
 * 매년 반복 시 윤년 2월 29일 특수 케이스를 검증합니다
 */
function isValidYearlyRecurrence(
  currentDate: Date,
  initialMonth: number,
  initialDay: number
): boolean {
  if (initialMonth !== FEBRUARY_INDEX || initialDay !== LEAP_DAY) {
    return true;
  }

  return isLeapYear(currentDate.getFullYear());
}

/**
 * 이벤트가 생성되어야 하는지 특수 케이스를 고려하여 판단합니다
 */
function shouldCreateEvent(
  repeatType: string,
  currentDate: Date,
  initialMonth: number,
  initialDay: number
): boolean {
  if (repeatType === 'monthly') {
    return isValidMonthlyRecurrence(currentDate, initialDay);
  }

  if (repeatType === 'yearly') {
    return isValidYearlyRecurrence(currentDate, initialMonth, initialDay);
  }

  return true;
}

/**
 * 다음 반복 날짜를 계산합니다
 */
function calculateNextDate(
  currentDate: Date,
  repeatType: string,
  interval: number,
  initialMonth: number,
  initialDay: number
): void {
  switch (repeatType) {
    case 'daily':
      currentDate.setDate(currentDate.getDate() + interval);
      break;

    case 'weekly':
      currentDate.setDate(currentDate.getDate() + interval * DAYS_IN_WEEK);
      break;

    case 'monthly': {
      currentDate.setMonth(currentDate.getMonth() + interval);
      const daysInNewMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
      currentDate.setDate(Math.min(initialDay, daysInNewMonth));
      break;
    }

    case 'yearly': {
      currentDate.setFullYear(currentDate.getFullYear() + interval);
      const daysInNewMonth = getDaysInMonth(currentDate.getFullYear(), initialMonth + 1);
      currentDate.setMonth(initialMonth);
      currentDate.setDate(Math.min(initialDay, daysInNewMonth));
      break;
    }
  }
}

/**
 * 유효한 종료 날짜를 계산합니다 (최대 2025-12-31)
 */
function getEffectiveEndDate(repeatEndDate: Date): Date {
  const maxDate = new Date(MAX_RECURRENCE_DATE);
  return repeatEndDate.getTime() > maxDate.getTime() ? maxDate : repeatEndDate;
}

/**
 * 반복 일정을 생성합니다
 *
 * @param baseEvent 기본 이벤트 정보 (id 제외)
 * @param repeatInfo 반복 정보
 * @param startDate 시작 날짜
 * @param repeatEndDate 반복 종료 날짜 (최대 2025-12-31)
 * @returns 생성된 반복 이벤트 배열
 */
export function generateRecurringEvents(
  baseEvent: Omit<EventForm, 'id'>,
  repeatInfo: RepeatInfo,
  startDate: Date,
  repeatEndDate: Date
): Omit<EventForm, 'id'>[] {
  const events: Omit<EventForm, 'id'>[] = [];
  const effectiveEndDate = getEffectiveEndDate(repeatEndDate);
  const currentDate = new Date(startDate);
  const initialDay = startDate.getDate();
  const initialMonth = startDate.getMonth();

  while (currentDate.getTime() <= effectiveEndDate.getTime()) {
    if (shouldCreateEvent(repeatInfo.type, currentDate, initialMonth, initialDay)) {
      events.push({
        ...baseEvent,
        date: formatDate(currentDate),
      });
    }

    calculateNextDate(currentDate, repeatInfo.type, repeatInfo.interval, initialMonth, initialDay);

    if (repeatInfo.type === 'none') {
      break;
    }
  }

  return events;
}
