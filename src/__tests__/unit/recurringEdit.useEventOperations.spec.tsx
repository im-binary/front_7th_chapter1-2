import { renderHook, waitFor } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';
import { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useEventOperations } from '../../hooks/useEventOperations';
import { Event } from '../../types';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SnackbarProvider>{children}</SnackbarProvider>
);

describe('useEventOperations - 반복 일정 수정 스텁 함수 (TC009, TC010)', () => {
  it('TC009: updateSingleRecurringEvent 함수가 존재하고 undefined를 반환해야 함 (RED)', async () => {
    // Given: useEventOperations 훅 초기화
    const { result } = renderHook(() => useEventOperations(false), { wrapper });

    // 훅이 초기화될 때까지 대기
    await waitFor(() => {
      expect(result.current.events).toBeDefined();
    });

    // When: updateSingleRecurringEvent 함수 호출
    const mockEvent: Event = {
      id: '1',
      title: '테스트 일정',
      date: '2025-10-30',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '업무',
      repeat: {
        type: 'weekly',
        interval: 1,
      },
      notificationTime: 10,
    };

    const returnValue = await result.current.updateSingleRecurringEvent(mockEvent);

    // Then: undefined를 반환해야 함 (아직 구현되지 않았으므로)
    expect(returnValue).toBeUndefined();
    expect(result.current.updateSingleRecurringEvent).toBeDefined();
  });

  it('TC010: updateAllRecurringEvents 함수가 존재하고 undefined를 반환해야 함 (RED)', async () => {
    // Given: useEventOperations 훅 초기화
    const { result } = renderHook(() => useEventOperations(false), { wrapper });

    // 훅이 초기화될 때까지 대기
    await waitFor(() => {
      expect(result.current.events).toBeDefined();
    });

    // When: updateAllRecurringEvents 함수 호출
    const mockEvent: Event = {
      id: '1',
      title: '테스트 일정',
      date: '2025-10-30',
      startTime: '10:00',
      endTime: '11:00',
      description: '',
      location: '',
      category: '업무',
      repeat: {
        type: 'weekly',
        interval: 1,
      },
      notificationTime: 10,
    };

    const returnValue = await result.current.updateAllRecurringEvents(mockEvent);

    // Then: undefined를 반환해야 함 (아직 구현되지 않았으므로)
    expect(returnValue).toBeUndefined();
    expect(result.current.updateAllRecurringEvents).toBeDefined();
  });
});
