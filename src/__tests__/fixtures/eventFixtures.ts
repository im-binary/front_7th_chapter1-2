import { Event } from '../../types';

/**
 * 테스트용 이벤트 생성 팩토리 함수
 */
export const createMockEvent = (overrides: Partial<Event> = {}): Event => {
  return {
    id: '1',
    title: '주간 회의',
    date: '2025-10-15',
    startTime: '09:00',
    endTime: '10:00',
    description: '매주 반복되는 팀 미팅',
    location: '회의실 A',
    category: '업무',
    repeat: { type: 'weekly', interval: 1 },
    notificationTime: 10,
    ...overrides,
  };
};

/**
 * 반복 일정 그룹 생성 팩토리 함수
 * @param count - 생성할 반복 일정 개수
 * @param baseOverrides - 기본 속성 재정의
 */
export const createRecurringEventGroup = (
  count: number,
  baseOverrides: Partial<Event> = {}
): Event[] => {
  const events: Event[] = [];
  const baseDate = new Date('2025-10-15');

  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + i * 7); // 매주 반복

    events.push(
      createMockEvent({
        id: String(i + 1),
        date: date.toISOString().split('T')[0],
        ...baseOverrides,
      })
    );
  }

  return events;
};

/**
 * 단일 일정 생성 팩토리 함수
 */
export const createSingleEvent = (overrides: Partial<Event> = {}): Event => {
  return createMockEvent({
    repeat: { type: 'none', interval: 0 },
    ...overrides,
  });
};

/**
 * 다른 반복 그룹 이벤트 생성 (테스트용)
 */
export const createDifferentRecurringGroup = (
  count: number,
  baseOverrides: Partial<Event> = {}
): Event[] => {
  return createRecurringEventGroup(count, {
    title: '일일 스탠드업',
    startTime: '10:00',
    endTime: '10:15',
    description: '매일 아침 스탠드업',
    location: '회의실 B',
    repeat: { type: 'daily', interval: 1 },
    notificationTime: 5,
    ...baseOverrides,
  });
};
