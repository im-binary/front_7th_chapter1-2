# 예시: 복잡한 기능 추가

## 요구사항

```
일정 반복 기능을 추가해주세요.
사용자가 일정을 생성할 때 "매일", "매주", "매월" 반복 옵션을 선택할 수 있어야 하고,
선택한 경우 지정한 기간 동안 자동으로 반복 일정이 생성되어야 합니다.
```

## 실행 방법

```bash
pnpm agent:run -r "일정 반복 기능 추가: 매일/매주/매월 반복 옵션 제공, 자동 반복 일정 생성"
```

## 예상되는 실행 흐름

### 1️⃣ Feature Selector (기능 선택 에이전트)

**분석 결과:**

- 핵심 기능: 일정 반복 자동 생성
- 난이도: Hard
- 영향 범위:
  - `src/types.ts` (타입 확장)
  - `src/utils/eventUtils.ts` (반복 로직)
  - `src/components/EventForm.tsx` (UI 추가)
  - `src/hooks/useEventOperations.ts` (반복 일정 생성)

**기술적 고려사항:**

- 날짜 계산 로직의 정확성
- 반복 종료 조건 처리
- 대량 일정 생성 시 성능
- 기존 일정과의 충돌 체크

### 2️⃣ Test Designer (테스트 설계 에이전트)

**테스트 케이스 설계:**

**Unit Tests (src/**tests**/unit/medium.repeatEvent.spec.ts):**

- ✅ 매일 반복 일정 생성 (7일)
- ✅ 매주 반복 일정 생성 (4주)
- ✅ 매월 반복 일정 생성 (3개월)
- ✅ 반복 없는 경우 단일 일정만 반환
- ✅ 종료일이 시작일보다 빠른 경우 에러
- ✅ 잘못된 반복 타입 처리
- ✅ 윤년 2월 처리
- ✅ 월말 날짜 처리 (31일 → 30일 월)
- ✅ 시간대 처리

**Integration Tests (src/**tests**/hooks/hard.useEventOperations.spec.ts):**

- ✅ 반복 일정 생성 시 모든 이벤트 저장 확인
- ✅ 반복 일정 수정 시 단일 이벤트만 수정
- ✅ 반복 일정 삭제 시 사용자 선택 반영 (단일/전체)
- ✅ 반복 일정 겹침 체크
- ✅ 대량 반복 일정 생성 성능 테스트

**Component Tests (src/**tests**/components/EventForm.spec.tsx):**

- ✅ 반복 옵션 UI 렌더링
- ✅ 반복 타입 선택 시 종료일 입력 활성화
- ✅ 유효하지 않은 종료일 입력 방지
- ✅ 폼 제출 시 올바른 데이터 전달

### 3️⃣ Test Writer (테스트 작성 에이전트)

**생성되는 파일:**

```typescript
// src/__tests__/unit/medium.repeatEvent.spec.ts
import { describe, test, expect } from 'vitest';
import { generateRepeatEvents } from '@/utils/eventUtils';

describe('generateRepeatEvents', () => {
  test('매일 반복: 7일간 7개 일정 생성', () => {
    const baseEvent = {
      id: 1,
      title: '매일 운동',
      date: '2024-01-01',
      startTime: '09:00',
      endTime: '10:00',
      repeat: {
        type: 'daily',
        endDate: '2024-01-07',
      },
    };

    const events = generateRepeatEvents(baseEvent);

    expect(events).toHaveLength(7);
    expect(events[0].date).toBe('2024-01-01');
    expect(events[6].date).toBe('2024-01-07');
  });

  test('매주 반복: 4주간 4개 일정 생성', () => {
    const baseEvent = {
      id: 1,
      title: '주간 회의',
      date: '2024-01-01', // 월요일
      startTime: '14:00',
      endTime: '15:00',
      repeat: {
        type: 'weekly',
        endDate: '2024-01-29',
      },
    };

    const events = generateRepeatEvents(baseEvent);

    expect(events).toHaveLength(5); // 1/1, 1/8, 1/15, 1/22, 1/29
    expect(events[1].date).toBe('2024-01-08');
    expect(events[4].date).toBe('2024-01-29');
  });

  // ... 더 많은 테스트 케이스
});
```

```typescript
// src/__tests__/hooks/hard.useEventOperations.spec.tsx
import { describe, test, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEventOperations } from '@/hooks/useEventOperations';

describe('useEventOperations - 반복 일정', () => {
  test('반복 일정 생성 시 모든 이벤트가 저장됨', async () => {
    const { result } = renderHook(() => useEventOperations());

    await act(async () => {
      await result.current.saveEvent({
        title: '매일 운동',
        date: '2024-01-01',
        startTime: '09:00',
        endTime: '10:00',
        repeat: {
          type: 'daily',
          endDate: '2024-01-07',
        },
      });
    });

    expect(result.current.events).toHaveLength(7);
  });

  // ... 더 많은 통합 테스트
});
```

**실행 결과:** 🔴 RED - 20개 테스트 실패 (기능 미구현)

### 4️⃣ Test Validator (검증 에이전트)

**구현 코드:**

```typescript
// src/types.ts
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface RepeatInfo {
  type: RepeatType;
  endDate?: string;
}

export interface Event {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  location: string;
  category: string;
  repeat?: RepeatInfo;
  repeatGroupId?: string; // 같은 반복 그룹 식별자
}
```

```typescript
// src/utils/eventUtils.ts
import { Event, RepeatInfo } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 반복 일정을 생성합니다.
 * @param baseEvent 기본 일정 정보
 * @returns 생성된 반복 일정 배열
 */
export const generateRepeatEvents = (baseEvent: Omit<Event, 'id'>): Event[] => {
  if (!baseEvent.repeat || baseEvent.repeat.type === 'none') {
    return [{ ...baseEvent, id: Date.now() }];
  }

  const { type, endDate } = baseEvent.repeat;
  if (!endDate) {
    throw new Error('반복 종료일이 필요합니다');
  }

  const startDate = new Date(baseEvent.date);
  const endDateTime = new Date(endDate);

  if (endDateTime < startDate) {
    throw new Error('종료일은 시작일보다 늦어야 합니다');
  }

  const events: Event[] = [];
  const repeatGroupId = uuidv4();
  let currentDate = new Date(startDate);
  let idCounter = Date.now();

  while (currentDate <= endDateTime) {
    events.push({
      ...baseEvent,
      id: idCounter++,
      date: currentDate.toISOString().split('T')[0],
      repeatGroupId,
    });

    // 다음 날짜 계산
    switch (type) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      default:
        throw new Error(`지원하지 않는 반복 타입: ${type}`);
    }
  }

  return events;
};

/**
 * 반복 일정 그룹에서 단일 일정을 삭제합니다.
 */
export const deleteSingleRepeatEvent = (events: Event[], eventId: number): Event[] => {
  return events.filter((event) => event.id !== eventId);
};

/**
 * 반복 일정 그룹 전체를 삭제합니다.
 */
export const deleteRepeatGroup = (events: Event[], repeatGroupId: string): Event[] => {
  return events.filter((event) => event.repeatGroupId !== repeatGroupId);
};
```

```typescript
// src/hooks/useEventOperations.ts
import { generateRepeatEvents } from '@/utils/eventUtils';

export const useEventOperations = () => {
  // ... 기존 코드

  const saveEvent = async (eventData: Omit<Event, 'id'>) => {
    try {
      // 반복 일정 생성
      const newEvents = generateRepeatEvents(eventData);

      // 모든 일정 저장
      for (const event of newEvents) {
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });
      }

      // 상태 업데이트
      setEvents((prev) => [...prev, ...newEvents]);

      toast.success(`${newEvents.length}개의 일정이 생성되었습니다`);
    } catch (error) {
      console.error('일정 저장 실패:', error);
      toast.error('일정 저장에 실패했습니다');
    }
  };

  const deleteEvent = async (eventId: number, deleteType: 'single' | 'all' = 'single') => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    try {
      if (deleteType === 'all' && event.repeatGroupId) {
        // 반복 그룹 전체 삭제
        const groupEvents = events.filter((e) => e.repeatGroupId === event.repeatGroupId);

        for (const e of groupEvents) {
          await fetch(`/api/events/${e.id}`, { method: 'DELETE' });
        }

        setEvents((prev) => deleteRepeatGroup(prev, event.repeatGroupId!));
        toast.success(`${groupEvents.length}개의 반복 일정이 삭제되었습니다`);
      } else {
        // 단일 일정 삭제
        await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
        setEvents((prev) => deleteSingleRepeatEvent(prev, eventId));
        toast.success('일정이 삭제되었습니다');
      }
    } catch (error) {
      console.error('일정 삭제 실패:', error);
      toast.error('일정 삭제에 실패했습니다');
    }
  };

  return { events, saveEvent, deleteEvent, updateEvent };
};
```

**실행 결과:** 🟢 GREEN - 모든 테스트 통과 (147/147 tests passed)

### 5️⃣ Refactoring (리팩토링 에이전트)

**개선 사항:**

1. **성능 최적화**

   - 대량 일정 생성 시 배치 처리
   - 불필요한 렌더링 방지 (useMemo, useCallback)

2. **코드 품질**

   - 날짜 계산 유틸리티 함수 분리
   - 에러 처리 강화
   - 타입 안정성 개선

3. **사용자 경험**

   - 반복 일정 생성 시 로딩 인디케이터
   - 삭제 확인 다이얼로그 개선
   - 반복 일정 뱃지 표시

4. **테스트 커버리지**
   - Edge case 추가 테스트
   - 성능 벤치마크 테스트

**최종 결과:** ✨ REFACTOR - 프로덕션 레디 코드 완성

---

## 생성되는 아티팩트

### 테스트 파일 (9개)

- `src/__tests__/unit/medium.repeatEvent.spec.ts` ⭐ 새로 생성
- `src/__tests__/unit/medium.repeatUtils.spec.ts` ⭐ 새로 생성
- `src/__tests__/hooks/hard.useEventOperations.spec.tsx` 수정
- `src/__tests__/components/EventForm.spec.tsx` 수정

### 구현 파일 (7개)

- `src/types.ts` 수정 (RepeatInfo 추가)
- `src/utils/eventUtils.ts` 수정 (반복 로직 추가)
- `src/utils/dateUtils.ts` 수정 (날짜 계산 유틸)
- `src/hooks/useEventOperations.ts` 수정 (반복 일정 CRUD)
- `src/components/EventForm.tsx` 수정 (UI 추가)
- `src/components/RepeatSelector.tsx` ⭐ 새로 생성
- `src/components/DeleteConfirmDialog.tsx` ⭐ 새로 생성

### 결과 파일

- `agents/output/feature-selection.json`
- `agents/output/test-design.json`
- `agents/output/test-code.json`
- `agents/output/implementation.json`
- `agents/output/refactoring.json`

---

## 예상 소요 시간

- Feature Selector: ~60초 (복잡한 분석)
- Test Designer: ~120초 (20+ 테스트 케이스 설계)
- Test Writer: ~180초 (대량 테스트 코드 작성)
- Test Validator: ~240초 (복잡한 로직 구현)
- Refactoring: ~120초 (성능 최적화 및 리팩토링)

**총 예상 시간: 약 12분**

---

## 기술적 도전 과제

### 1. 날짜 계산의 정확성

- 윤년 처리
- 월말 날짜 처리 (31일 → 30일 월)
- 시간대(Timezone) 고려

### 2. 대량 데이터 처리

- 1년치 매일 반복 = 365개 일정
- 성능 최적화 필요
- 메모리 효율성

### 3. UX 설계

- 반복 일정 수정 시 사용자 의도 파악
  - 단일 일정만 수정?
  - 이후 모든 일정 수정?
  - 전체 반복 그룹 수정?

### 4. 데이터 일관성

- 반복 그룹 ID 관리
- 부분 수정/삭제 시 데이터 무결성
- 서버 동기화

---

## 실제 테스트 해보기

```bash
# 1. 에이전트 실행
pnpm agent:run -r "일정 반복 기능 추가: 매일/매주/매월 반복 옵션 제공, 자동 반복 일정 생성"

# 2. 테스트 확인
pnpm test

# 3. 커버리지 확인
pnpm test:coverage

# 4. 결과 파일 확인
cat agents/output/feature-selection.json | jq
cat agents/output/implementation.json | jq
```

---

## 참고사항

- 이 예시는 복잡한 기능의 개발 프로세스를 보여줍니다
- 실제 LLM 연동 시 더 정교한 설계와 구현이 가능합니다
- 각 단계에서 사람의 검토와 피드백이 권장됩니다
- 성능 테스트와 보안 검토는 별도로 진행해야 합니다
