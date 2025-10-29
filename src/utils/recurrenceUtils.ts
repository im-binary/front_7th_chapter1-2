import { EventForm, RepeatInfo } from '../types';
import { formatDate, getDaysInMonth } from './dateUtils';

/**
 * 반복 일정 생성 함수
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
  const maxDate = new Date('2025-12-31');

  // 종료일이 최대 날짜를 초과하면 최대 날짜로 제한
  const effectiveEndDate = repeatEndDate.getTime() > maxDate.getTime() ? maxDate : repeatEndDate;

  let currentDate = new Date(startDate);
  const initialDay = startDate.getDate();
  const initialMonth = startDate.getMonth();

  while (currentDate.getTime() <= effectiveEndDate.getTime()) {
    let shouldAddEvent = true;

    // 특수 케이스 처리
    if (repeatInfo.type === 'monthly' && initialDay === 31) {
      // 31일로 시작한 경우, 현재 달이 31일이 있는지 확인
      const daysInCurrentMonth = getDaysInMonth(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1
      );
      if (daysInCurrentMonth < 31) {
        shouldAddEvent = false;
      }
    } else if (repeatInfo.type === 'yearly' && initialMonth === 1 && initialDay === 29) {
      // 윤년 2월 29일로 시작한 경우
      const year = currentDate.getFullYear();
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      if (!isLeapYear) {
        shouldAddEvent = false;
      }
    }

    if (shouldAddEvent) {
      events.push({
        ...baseEvent,
        date: formatDate(currentDate),
      });
    }

    // 다음 반복 날짜 계산
    if (repeatInfo.type === 'daily') {
      currentDate.setDate(currentDate.getDate() + repeatInfo.interval);
    } else if (repeatInfo.type === 'weekly') {
      currentDate.setDate(currentDate.getDate() + repeatInfo.interval * 7);
    } else if (repeatInfo.type === 'monthly') {
      currentDate.setMonth(currentDate.getMonth() + repeatInfo.interval);
      // 원래 날짜로 재설정 (월이 바뀌면서 날짜가 변경될 수 있음)
      const daysInNewMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth() + 1);
      currentDate.setDate(Math.min(initialDay, daysInNewMonth));
    } else if (repeatInfo.type === 'yearly') {
      currentDate.setFullYear(currentDate.getFullYear() + repeatInfo.interval);
      // 윤년 처리
      const daysInNewMonth = getDaysInMonth(currentDate.getFullYear(), initialMonth + 1);
      currentDate.setMonth(initialMonth);
      currentDate.setDate(Math.min(initialDay, daysInNewMonth));
    } else {
      break;
    }
  }

  return events;
}
