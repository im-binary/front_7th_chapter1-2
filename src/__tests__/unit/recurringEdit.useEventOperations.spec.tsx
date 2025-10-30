import { renderHook, waitFor } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';
import { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { setupMockHandlers } from '../../__mocks__/handlersUtils';
import { useEventOperations } from '../../hooks/useEventOperations';
import { createRecurringEventGroup } from '../fixtures/eventFixtures';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SnackbarProvider>{children}</SnackbarProvider>
);

describe('useEventOperations - 반복 일정 수정', () => {
  it('updateSingleRecurringEvent - 단일 일정만 수정하고 반복 그룹에서 분리', async () => {
    // Given: 3개의 반복 일정이 존재
    const recurringEvents = createRecurringEventGroup(3);
    setupMockHandlers(recurringEvents);

    const { result } = renderHook(() => useEventOperations(false), { wrapper });

    // 초기 이벤트 로드 대기
    await waitFor(() => {
      expect(result.current.events).toHaveLength(3);
    });

    // When: 첫 번째 일정만 수정 (제목 변경)
    const eventToUpdate = result.current.events[0];
    const modifiedEvent = {
      ...eventToUpdate,
      title: '수정된 단일 일정',
    };

    await result.current.updateSingleRecurringEvent(modifiedEvent);

    // Then: 수정된 일정은 repeat.type이 'none'으로 변경되어 반복 그룹에서 분리됨
    await waitFor(() => {
      const updatedEvents = result.current.events;

      // 1. 수정된 일정의 제목이 변경됨
      const updatedEvent = updatedEvents.find((e) => e.id === eventToUpdate.id);
      expect(updatedEvent?.title).toBe('수정된 단일 일정');

      // 2. 수정된 일정의 repeat.type이 'none'으로 변경됨
      expect(updatedEvent?.repeat.type).toBe('none');

      // 3. 나머지 2개의 일정은 여전히 반복 일정으로 유지됨
      const stillRecurring = updatedEvents.filter(
        (e) => e.id !== eventToUpdate.id && e.repeat.type === 'weekly'
      );
      expect(stillRecurring).toHaveLength(2);

      // 4. 나머지 일정들의 제목은 변경되지 않음
      stillRecurring.forEach((event) => {
        expect(event.title).toBe('주간 회의');
      });
    });
  });

  it('updateAllRecurringEvents - 반복 그룹 전체를 수정하고 날짜는 유지', async () => {
    // Given: 3개의 반복 일정이 존재
    vi.setSystemTime(new Date('2025-10-01'));
    const recurringEvents = createRecurringEventGroup(3);
    setupMockHandlers(recurringEvents);

    const { result } = renderHook(() => useEventOperations(false), { wrapper });

    // 초기 이벤트 로드 대기
    await waitFor(() => {
      expect(result.current.events).toHaveLength(3);
    });

    // 원본 날짜 저장 (수정 후에도 유지되어야 함)
    const originalDates = result.current.events.map((e) => e.date);
    const originalIds = result.current.events.map((e) => e.id);

    // When: 반복 그룹 전체 수정 (제목, 시간, 위치 변경)
    const originalEvent = result.current.events[0];
    const modifiedEvent = {
      ...originalEvent,
      title: '전체 수정된 회의',
      startTime: '14:00',
      endTime: '15:00',
      location: '회의실 B',
      description: '수정된 설명',
    };

    // originalEvent를 두 번째 인자로 전달하여 그룹 식별에 사용
    await result.current.updateAllRecurringEvents(modifiedEvent, originalEvent);

    // Then: 모든 반복 일정이 동일하게 수정되고, 날짜와 반복 정보는 유지됨
    await waitFor(
      () => {
        const updatedEvents = result.current.events;

        // 1. 모든 일정의 개수가 그대로 유지됨
        expect(updatedEvents).toHaveLength(3);

        // 2. 첫 번째 일정이 수정되었는지 확인 (변경 감지)
        const firstEvent = updatedEvents[0];
        expect(firstEvent.title).toBe('전체 수정된 회의');

        updatedEvents.forEach((event, index) => {
          // 3. 모든 일정의 수정 가능한 필드가 동일하게 변경됨
          expect(event.title).toBe('전체 수정된 회의');
          expect(event.startTime).toBe('14:00');
          expect(event.endTime).toBe('15:00');
          expect(event.location).toBe('회의실 B');
          expect(event.description).toBe('수정된 설명');

          // 4. 각 일정의 날짜는 원래 날짜 그대로 유지됨
          expect(event.date).toBe(originalDates[index]);

          // 5. 반복 정보도 그대로 유지됨
          expect(event.repeat.type).toBe('weekly');
          expect(event.repeat.interval).toBe(1);

          // 6. 각 일정의 ID도 그대로 유지됨
          expect(event.id).toBe(originalIds[index]);
        });
      },
      { timeout: 3000 }
    );
  });
});
