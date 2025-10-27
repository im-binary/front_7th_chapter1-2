import { Event } from '../types';
import { getWeekDates, isDateInRange } from './dateUtils';

function filterEventsByDateRange(events: Event[], start: Date, end: Date): Event[] {
  return events.filter((event) => {
    const eventDate = new Date(event.date);
    return isDateInRange(eventDate, start, end);
  });
}

function containsTerm(target: string, term: string) {
  return target.toLowerCase().includes(term.toLowerCase());
}

function searchEvents(events: Event[], term: string) {
  return events.filter(
    ({ title, description, location }) =>
      containsTerm(title, term) || containsTerm(description, term) || containsTerm(location, term)
  );
}

function filterEventsByDateRangeAtWeek(events: Event[], currentDate: Date) {
  const weekDates = getWeekDates(currentDate);
  return filterEventsByDateRange(events, weekDates[0], weekDates[6]);
}

function filterEventsByDateRangeAtMonth(events: Event[], currentDate: Date) {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  return filterEventsByDateRange(events, monthStart, monthEnd);
}

export function getFilteredEvents(
  events: Event[],
  searchTerm: string,
  currentDate: Date,
  view: 'week' | 'month'
): Event[] {
  const searchedEvents = searchEvents(events, searchTerm);

  if (view === 'week') {
    return filterEventsByDateRangeAtWeek(searchedEvents, currentDate);
  }

  if (view === 'month') {
    return filterEventsByDateRangeAtMonth(searchedEvents, currentDate);
  }

  return searchedEvents;
}

/**
 * 일정 제목 접두사 상수
 */
export const EVENT_PREFIX = '[추가합니다]';

/**
 * 일정 제목에 접두사를 추가합니다.
 * 이미 접두사가 있으면 중복 추가하지 않으며, 공백을 보정합니다.
 *
 * @param title - 원본 제목
 * @returns 접두사가 추가된 제목
 * @example
 * addEventPrefix('회의') // '[추가합니다] 회의'
 * addEventPrefix('[추가합니다] 회의') // '[추가합니다] 회의'
 * addEventPrefix('[추가합니다]회의') // '[추가합니다] 회의'
 */
export function addEventPrefix(title: string): string {
  const trimmedTitle = title.trim();

  if (trimmedTitle.startsWith(EVENT_PREFIX)) {
    // 접두사는 있지만 공백이 없는 경우 공백 추가
    const afterPrefix = trimmedTitle.slice(EVENT_PREFIX.length);
    return afterPrefix.startsWith(' ') ? trimmedTitle : `${EVENT_PREFIX} ${afterPrefix}`;
  }

  return `${EVENT_PREFIX} ${trimmedTitle}`;
}
