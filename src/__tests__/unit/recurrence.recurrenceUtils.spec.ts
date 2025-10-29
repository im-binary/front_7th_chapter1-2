import { describe, it, expect } from 'vitest';

import { EventForm } from '../../types';
import { generateRecurringEvents } from '../../utils/recurrenceUtils';

describe('TC005: generateRecurringEvents 함수 - 매일 반복 일정 생성', () => {
  it('매일 반복 유형으로 올바른 일정을 생성한다', () => {
    // Given: 매일 반복 설정
    const baseEvent: Omit<EventForm, 'id'> = {
      title: '매일 미팅',
      date: '2023-01-01',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '',
      repeat: { type: 'daily', interval: 1, endDate: '2023-01-03' },
      notificationTime: 10,
    };
    const startDate = new Date('2023-01-01');
    const repeatEndDate = new Date('2023-01-03');

    // When: generateRecurringEvents 호출
    const result = generateRecurringEvents(baseEvent, baseEvent.repeat, startDate, repeatEndDate);

    // Then: 3개의 이벤트 생성
    expect(result).toHaveLength(3);
    expect(result[0].date).toBe('2023-01-01');
    expect(result[1].date).toBe('2023-01-02');
    expect(result[2].date).toBe('2023-01-03');
  });

  it('repeatEndDate가 startDate와 동일하면 1개만 생성한다', () => {
    // Given: 시작일과 종료일이 같은 설정
    const baseEvent: Omit<EventForm, 'id'> = {
      title: '1회성 이벤트',
      date: '2023-01-01',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '',
      repeat: { type: 'daily', interval: 1, endDate: '2023-01-01' },
      notificationTime: 10,
    };
    const startDate = new Date('2023-01-01');
    const repeatEndDate = new Date('2023-01-01');

    // When: generateRecurringEvents 호출
    const result = generateRecurringEvents(baseEvent, baseEvent.repeat, startDate, repeatEndDate);

    // Then: 1개만 생성
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2023-01-01');
  });

  it('repeatEndDate가 2025-12-31을 초과하면 2025-12-31까지만 생성한다', () => {
    // Given: 종료일이 최대 제한을 초과하는 설정
    const baseEvent: Omit<EventForm, 'id'> = {
      title: '장기 일정',
      date: '2025-12-30',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '',
      repeat: { type: 'daily', interval: 1, endDate: '2026-01-05' },
      notificationTime: 10,
    };
    const startDate = new Date('2025-12-30');
    const repeatEndDate = new Date('2026-01-05');

    // When: generateRecurringEvents 호출
    const result = generateRecurringEvents(baseEvent, baseEvent.repeat, startDate, repeatEndDate);

    // Then: 2025-12-31까지만 생성
    expect(result.length).toBeGreaterThan(0);
    const lastEvent = result[result.length - 1];
    expect(new Date(lastEvent.date).getTime()).toBeLessThanOrEqual(
      new Date('2025-12-31').getTime()
    );
  });
});

describe('TC006: generateRecurringEvents 함수 - 매월 반복 31일 특수 케이스', () => {
  it('매월 반복에서 31일 특수 케이스를 올바르게 처리한다', () => {
    // Given: 31일로 시작하는 매월 반복
    const baseEvent: Omit<EventForm, 'id'> = {
      title: '월말 미팅',
      date: '2023-01-31',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '',
      repeat: { type: 'monthly', interval: 1, endDate: '2023-04-30' },
      notificationTime: 10,
    };
    const startDate = new Date('2023-01-31');
    const repeatEndDate = new Date('2023-04-30');

    // When: generateRecurringEvents 호출
    const result = generateRecurringEvents(baseEvent, baseEvent.repeat, startDate, repeatEndDate);

    // Then: 31일이 있는 달에만 생성
    // 1월(31), 3월(31) - 2월과 4월은 31일이 없으므로 생성되지 않음
    expect(result.length).toBeGreaterThan(0);
    // 생성된 모든 이벤트가 31일인지 확인
    result.forEach((event) => {
      const eventDate = new Date(event.date);
      expect(eventDate.getDate()).toBe(31);
    });
  });

  it('윤년 2월 29일 포함 시 올바르게 처리한다', () => {
    // Given: 2024년 1월 31일 시작 (윤년)
    const baseEvent: Omit<EventForm, 'id'> = {
      title: '월말 미팅',
      date: '2024-01-31',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '',
      repeat: { type: 'monthly', interval: 1, endDate: '2024-03-31' },
      notificationTime: 10,
    };
    const startDate = new Date('2024-01-31');
    const repeatEndDate = new Date('2024-03-31');

    // When: generateRecurringEvents 호출
    const result = generateRecurringEvents(baseEvent, baseEvent.repeat, startDate, repeatEndDate);

    // Then: 31일이 있는 달에만 생성 (1월, 3월만)
    expect(result.length).toBeGreaterThan(0);
    result.forEach((event) => {
      const eventDate = new Date(event.date);
      expect(eventDate.getDate()).toBe(31);
    });
  });
});

describe('TC007: generateRecurringEvents 함수 - 매년 반복 2월 29일 특수 케이스', () => {
  it('매년 반복에서 윤년 2월 29일 특수 케이스를 올바르게 처리한다', () => {
    // Given: 윤년 2월 29일로 시작하는 매년 반복
    const baseEvent: Omit<EventForm, 'id'> = {
      title: '연례 이벤트',
      date: '2024-02-29',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '',
      repeat: { type: 'yearly', interval: 1, endDate: '2028-02-29' },
      notificationTime: 10,
    };
    const startDate = new Date('2024-02-29');
    const repeatEndDate = new Date('2028-02-29');

    // When: generateRecurringEvents 호출
    const result = generateRecurringEvents(baseEvent, baseEvent.repeat, startDate, repeatEndDate);

    // Then: 윤년에만 생성 (2024, 2028)
    expect(result.length).toBeGreaterThan(0);
    result.forEach((event) => {
      const eventDate = new Date(event.date);
      // 윤년인지 확인
      const year = eventDate.getFullYear();
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      expect(isLeapYear).toBe(true);
      expect(eventDate.getMonth()).toBe(1); // 2월 (0-indexed)
      expect(eventDate.getDate()).toBe(29);
    });
  });

  it('repeatEndDate가 2025-12-31을 초과하는 경우 제한한다', () => {
    // Given: 종료일이 2025-12-31을 초과
    const baseEvent: Omit<EventForm, 'id'> = {
      title: '연례 이벤트',
      date: '2024-02-29',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '',
      repeat: { type: 'yearly', interval: 1, endDate: '2030-02-29' },
      notificationTime: 10,
    };
    const startDate = new Date('2024-02-29');
    const repeatEndDate = new Date('2030-02-29');

    // When: generateRecurringEvents 호출
    const result = generateRecurringEvents(baseEvent, baseEvent.repeat, startDate, repeatEndDate);

    // Then: 2025-12-31까지만 생성
    result.forEach((event) => {
      const eventDate = new Date(event.date);
      expect(eventDate.getTime()).toBeLessThanOrEqual(new Date('2025-12-31').getTime());
    });
  });
});
