import { describe, it, expect } from 'vitest';

import { addDays, addMonths, addYears, isLeapYear } from '../../utils/dateUtils';

describe('isLeapYear 함수 - 윤년 정확히 판단', () => {
  it('2000년은 윤년으로 true를 반환한다', () => {
    // Given: 2000년 (400의 배수)
    const year = 2000;

    // When: isLeapYear 함수 호출
    const result = isLeapYear(year);

    // Then: true 반환
    expect(result).toBe(true);
  });

  it('2001년은 윤년이 아니므로 false를 반환한다', () => {
    // Given: 2001년 (4로 나누어지지 않음)
    const year = 2001;

    // When: isLeapYear 함수 호출
    const result = isLeapYear(year);

    // Then: false 반환
    expect(result).toBe(false);
  });

  it('2004년은 윤년으로 true를 반환한다', () => {
    // Given: 2004년 (4의 배수, 100의 배수 아님)
    const year = 2004;

    // When: isLeapYear 함수 호출
    const result = isLeapYear(year);

    // Then: true 반환
    expect(result).toBe(true);
  });

  it('1900년은 윤년이 아니므로 false를 반환한다', () => {
    // Given: 1900년 (100의 배수, 400의 배수 아님)
    const year = 1900;

    // When: isLeapYear 함수 호출
    const result = isLeapYear(year);

    // Then: false 반환
    expect(result).toBe(false);
  });
});

describe('addDays 함수 - 올바른 날짜 계산', () => {
  it('2023-01-01에 7일을 더하면 2023-01-08을 반환한다', () => {
    // Given: 2023-01-01 날짜와 7일
    const startDate = new Date('2023-01-01');
    const daysToAdd = 7;

    // When: addDays 함수 호출
    const result = addDays(startDate, daysToAdd);

    // Then: 2023-01-08 반환
    expect(result.toISOString().split('T')[0]).toBe('2023-01-08');
  });

  it('월말을 넘기는 경우 올바르게 계산한다 (2023-01-30 + 5일)', () => {
    // Given: 2023-01-30 날짜와 5일
    const startDate = new Date('2023-01-30');
    const daysToAdd = 5;

    // When: addDays 함수 호출
    const result = addDays(startDate, daysToAdd);

    // Then: 2023-02-04 반환
    expect(result.toISOString().split('T')[0]).toBe('2023-02-04');
  });

  it('연말을 넘기는 경우 올바르게 계산한다 (2023-12-25 + 10일)', () => {
    // Given: 2023-12-25 날짜와 10일
    const startDate = new Date('2023-12-25');
    const daysToAdd = 10;

    // When: addDays 함수 호출
    const result = addDays(startDate, daysToAdd);

    // Then: 2024-01-04 반환
    expect(result.toISOString().split('T')[0]).toBe('2024-01-04');
  });
});

describe('addMonths 함수 - 31일 특수 케이스 처리', () => {
  it('2023-01-31에 1개월을 더하면 2023-02-28을 반환한다', () => {
    // Given: 2023-01-31 (31일) 날짜와 1개월
    const startDate = new Date('2023-01-31');
    const monthsToAdd = 1;

    // When: addMonths 함수 호출
    const result = addMonths(startDate, monthsToAdd);

    // Then: 2023-02-28 반환 (2월은 28일까지)
    expect(result.toISOString().split('T')[0]).toBe('2023-02-28');
  });

  it('2024-01-31에 1개월을 더하면 2024-02-29를 반환한다 (윤년)', () => {
    // Given: 2024-01-31 날짜와 1개월 (2024년은 윤년)
    const startDate = new Date('2024-01-31');
    const monthsToAdd = 1;

    // When: addMonths 함수 호출
    const result = addMonths(startDate, monthsToAdd);

    // Then: 2024-02-29 반환 (윤년 2월은 29일까지)
    expect(result.toISOString().split('T')[0]).toBe('2024-02-29');
  });

  it('2023-03-31에 1개월을 더하면 2023-04-30을 반환한다', () => {
    // Given: 2023-03-31 날짜와 1개월
    const startDate = new Date('2023-03-31');
    const monthsToAdd = 1;

    // When: addMonths 함수 호출
    const result = addMonths(startDate, monthsToAdd);

    // Then: 2023-04-30 반환 (4월은 30일까지)
    expect(result.toISOString().split('T')[0]).toBe('2023-04-30');
  });
});

describe('addYears 함수 - 윤년 29일 특수 케이스 처리', () => {
  it('2024-02-29에 1년을 더하면 2025-02-28을 반환한다', () => {
    // Given: 2024-02-29 (윤년) 날짜와 1년
    const startDate = new Date('2024-02-29');
    const yearsToAdd = 1;

    // When: addYears 함수 호출
    const result = addYears(startDate, yearsToAdd);

    // Then: 2025-02-28 반환 (2025년은 윤년 아님)
    expect(result.toISOString().split('T')[0]).toBe('2025-02-28');
  });

  it('2028-02-29에 4년을 더하면 2032-02-29를 반환한다', () => {
    // Given: 2028-02-29 날짜와 4년
    const startDate = new Date('2028-02-29');
    const yearsToAdd = 4;

    // When: addYears 함수 호출
    const result = addYears(startDate, yearsToAdd);

    // Then: 2032-02-29 반환 (2032년도 윤년)
    expect(result.toISOString().split('T')[0]).toBe('2032-02-29');
  });

  it('2023-02-28에 1년을 더하면 2024-02-28을 반환한다', () => {
    // Given: 2023-02-28 날짜와 1년
    const startDate = new Date('2023-02-28');
    const yearsToAdd = 1;

    // When: addYears 함수 호출
    const result = addYears(startDate, yearsToAdd);

    // Then: 2024-02-28 반환
    expect(result.toISOString().split('T')[0]).toBe('2024-02-28');
  });
});
