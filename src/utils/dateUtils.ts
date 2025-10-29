import { Event } from '../types.ts';

/**
 * 주어진 년도와 월의 일수를 반환합니다.
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * 주어진 날짜가 속한 주의 모든 날짜를 반환합니다.
 */
export function getWeekDates(date: Date): Date[] {
  const day = date.getDay();
  const diff = date.getDate() - day;
  const sunday = new Date(date.setDate(diff));
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const nextDate = new Date(sunday);
    nextDate.setDate(sunday.getDate() + i);
    weekDates.push(nextDate);
  }
  return weekDates;
}

export function getWeeksAtMonth(currentDate: Date) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month + 1);
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const weeks = [];

  const initWeek = () => Array(7).fill(null);

  let week: Array<number | null> = initWeek();

  for (let i = 0; i < firstDayOfMonth; i++) {
    week[i] = null;
  }

  for (const day of days) {
    const dayIndex = (firstDayOfMonth + day - 1) % 7;
    week[dayIndex] = day;
    if (dayIndex === 6 || day === daysInMonth) {
      weeks.push(week);
      week = initWeek();
    }
  }

  return weeks;
}

export function getEventsForDay(events: Event[], date: number): Event[] {
  return events.filter((event) => new Date(event.date).getDate() === date);
}

export function formatWeek(targetDate: Date) {
  const dayOfWeek = targetDate.getDay();
  const diffToThursday = 4 - dayOfWeek;
  const thursday = new Date(targetDate);
  thursday.setDate(targetDate.getDate() + diffToThursday);

  const year = thursday.getFullYear();
  const month = thursday.getMonth() + 1;

  const firstDayOfMonth = new Date(thursday.getFullYear(), thursday.getMonth(), 1);

  const firstThursday = new Date(firstDayOfMonth);
  firstThursday.setDate(1 + ((4 - firstDayOfMonth.getDay() + 7) % 7));

  const weekNumber: number =
    Math.floor((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

  return `${year}년 ${month}월 ${weekNumber}주`;
}

/**
 * 주어진 날짜의 월 정보를 "YYYY년 M월" 형식으로 반환합니다.
 */
export function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}년 ${month}월`;
}

const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * 주어진 날짜가 특정 범위 내에 있는지 확인합니다.
 */
export function isDateInRange(date: Date, rangeStart: Date, rangeEnd: Date): boolean {
  const normalizedDate = stripTime(date);
  const normalizedStart = stripTime(rangeStart);
  const normalizedEnd = stripTime(rangeEnd);

  return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
}

export function fillZero(value: number, size = 2) {
  return String(value).padStart(size, '0');
}

export function formatDate(currentDate: Date, day?: number) {
  return [
    currentDate.getFullYear(),
    fillZero(currentDate.getMonth() + 1),
    fillZero(day ?? currentDate.getDate()),
  ].join('-');
}

/**
 * 윤년 여부를 확인합니다.
 * @param year 확인할 연도
 * @returns 윤년이면 true, 아니면 false
 */
export function isLeapYear(year: number): boolean {
  // 400의 배수는 윤년
  if (year % 400 === 0) return true;
  // 100의 배수는 윤년이 아님
  if (year % 100 === 0) return false;
  // 4의 배수는 윤년
  if (year % 4 === 0) return true;
  // 그 외는 윤년이 아님
  return false;
}

/**
 * 날짜에 일수를 더합니다.
 * @param date 기준 날짜
 * @param days 더할 일수
 * @returns 계산된 새로운 날짜
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 날짜에 주를 더합니다.
 * @param date 기준 날짜
 * @param weeks 더할 주 수
 * @returns 계산된 새로운 날짜
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * 날짜에 개월을 더합니다. (31일 특수 케이스 처리)
 * @param date 기준 날짜
 * @param months 더할 개월 수
 * @returns 계산된 새로운 날짜
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);

  // 31일 등 특수 케이스 처리: 날짜가 넘쳐서 다음 달로 넘어간 경우
  // 예: 1월 31일 + 1개월 = 3월 3일(X) -> 2월 28일(O)
  const expectedMonth = (((date.getMonth() + months) % 12) + 12) % 12;
  if (result.getMonth() !== expectedMonth) {
    // 0일로 설정하면 전월의 마지막 날이 됨
    result.setDate(0);
  }

  return result;
}

/**
 * 날짜에 연도를 더합니다. (윤년 29일 특수 케이스 처리)
 * @param date 기준 날짜
 * @param years 더할 연도 수
 * @returns 계산된 새로운 날짜
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  const targetYear = result.getFullYear() + years;
  result.setFullYear(targetYear);

  // 윤년 2월 29일 특수 케이스 처리
  // 예: 2024-02-29 + 1년 = 2025-03-01(X) -> 2025-02-28(O)
  if (date.getMonth() === 1 && date.getDate() === 29 && result.getMonth() !== 1) {
    // 2월 29일이었는데 다음 해가 윤년이 아니어서 3월로 넘어간 경우
    result.setDate(0); // 전월(2월) 마지막 날로 설정
  }

  return result;
}
