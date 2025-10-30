import { act, renderHook } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import {
  setupMockHandlerCreation,
  setupMockHandlerDeletion,
  setupMockHandlerUpdating,
} from '../../__mocks__/handlersUtils.ts';
import { useEventOperations } from '../../hooks/useEventOperations.ts';
import { server } from '../../setupTests.ts';
import { Event } from '../../types.ts';

const enqueueSnackbarFn = vi.fn();

vi.mock('notistack', async () => {
  const actual = await vi.importActual('notistack');
  return {
    ...actual,
    useSnackbar: () => ({
      enqueueSnackbar: enqueueSnackbarFn,
    }),
  };
});

it('저장되어있는 초기 이벤트 데이터를 적절하게 불러온다', async () => {
  const { result } = renderHook(() => useEventOperations(false));

  await act(() => Promise.resolve(null));

  expect(result.current.events).toEqual([
    {
      id: '1',
      title: '기존 회의',
      date: '2025-10-15',
      startTime: '09:00',
      endTime: '10:00',
      description: '기존 팀 미팅',
      location: '회의실 B',
      category: '업무',
      repeat: { type: 'none', interval: 0 },
      notificationTime: 10,
    },
  ]);
});

it('정의된 이벤트 정보를 기준으로 적절하게 저장이 된다', async () => {
  setupMockHandlerCreation(); // ? Med: 이걸 왜 써야하는지 물어보자

  const { result } = renderHook(() => useEventOperations(false));

  await act(() => Promise.resolve(null));

  const newEvent: Event = {
    id: '1',
    title: '새 회의',
    date: '2025-10-16',
    startTime: '11:00',
    endTime: '12:00',
    description: '새로운 팀 미팅',
    location: '회의실 A',
    category: '업무',
    repeat: { type: 'none', interval: 0 },
    notificationTime: 10,
  };

  await act(async () => {
    await result.current.saveEvent(newEvent);
  });

  expect(result.current.events).toEqual([{ ...newEvent, id: '1' }]);
});

it("새로 정의된 'title', 'endTime' 기준으로 적절하게 일정이 업데이트 된다", async () => {
  setupMockHandlerUpdating();

  const { result } = renderHook(() => useEventOperations(true));

  await act(() => Promise.resolve(null));

  const updatedEvent: Event = {
    id: '1',
    date: '2025-10-15',
    startTime: '09:00',
    description: '기존 팀 미팅',
    location: '회의실 B',
    category: '업무',
    repeat: { type: 'none', interval: 0 },
    notificationTime: 10,
    title: '수정된 회의',
    endTime: '11:00',
  };

  await act(async () => {
    await result.current.saveEvent(updatedEvent);
  });

  expect(result.current.events[0]).toEqual(updatedEvent);
});

it('존재하는 이벤트 삭제 시 에러없이 아이템이 삭제된다.', async () => {
  setupMockHandlerDeletion();

  const { result } = renderHook(() => useEventOperations(false));

  await act(async () => {
    await result.current.deleteEvent('1');
  });

  await act(() => Promise.resolve(null));

  expect(result.current.events).toEqual([]);
});

it("이벤트 로딩 실패 시 '이벤트 로딩 실패'라는 텍스트와 함께 에러 토스트가 표시되어야 한다", async () => {
  server.use(
    http.get('/api/events', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  renderHook(() => useEventOperations(true));

  await act(() => Promise.resolve(null));

  expect(enqueueSnackbarFn).toHaveBeenCalledWith('이벤트 로딩 실패', { variant: 'error' });

  server.resetHandlers();
});

it("존재하지 않는 이벤트 수정 시 '일정 저장 실패'라는 토스트가 노출되며 에러 처리가 되어야 한다", async () => {
  const { result } = renderHook(() => useEventOperations(true));

  await act(() => Promise.resolve(null));

  const nonExistentEvent: Event = {
    id: '999', // 존재하지 않는 ID
    title: '존재하지 않는 이벤트',
    date: '2025-07-20',
    startTime: '09:00',
    endTime: '10:00',
    description: '이 이벤트는 존재하지 않습니다',
    location: '어딘가',
    category: '기타',
    repeat: { type: 'none', interval: 0 },
    notificationTime: 10,
  };

  await act(async () => {
    await result.current.saveEvent(nonExistentEvent);
  });

  expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정 저장 실패', { variant: 'error' });
});

it("네트워크 오류 시 '일정 삭제 실패'라는 텍스트가 노출되며 이벤트 삭제가 실패해야 한다", async () => {
  server.use(
    http.delete('/api/events/:id', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  const { result } = renderHook(() => useEventOperations(false));

  await act(() => Promise.resolve(null));

  await act(async () => {
    await result.current.deleteEvent('1');
  });

  expect(enqueueSnackbarFn).toHaveBeenCalledWith('일정 삭제 실패', { variant: 'error' });

  expect(result.current.events).toHaveLength(1);
});

describe('deleteAllRecurringEvents', () => {
  it('동일한 반복 그룹의 모든 일정을 삭제한다', async () => {
    // Given: 동일한 반복 그룹(recurringId)의 여러 일정이 존재
    const mockEvents: Event[] = [
      {
        id: '1',
        title: '주간 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 팀 미팅',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1 },
        notificationTime: 10,
      },
      {
        id: '2',
        title: '주간 회의',
        date: '2025-10-22',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 팀 미팅',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1 },
        notificationTime: 10,
      },
      {
        id: '3',
        title: '주간 회의',
        date: '2025-10-29',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 팀 미팅',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1 },
        notificationTime: 10,
      },
    ];

    server.use(
      http.get('/api/events', () => {
        return HttpResponse.json({ events: mockEvents });
      }),
      http.delete('/api/events/:id', ({ params }) => {
        const { id } = params;
        const index = mockEvents.findIndex((event) => event.id === id);
        if (index !== -1) {
          mockEvents.splice(index, 1);
        }
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { result } = renderHook(() => useEventOperations(false));
    await act(() => Promise.resolve(null));

    // 초기 상태: 3개의 일정이 있어야 함
    expect(result.current.events).toHaveLength(3);

    const referenceEvent = result.current.events[0];

    // When: deleteAllRecurringEvents 호출
    await act(async () => {
      await result.current.deleteAllRecurringEvents(referenceEvent);
    });

    // Then: 모든 반복 일정이 삭제되어야 함
    expect(result.current.events).toEqual([]);
    expect(result.current.events).toHaveLength(0);
    expect(enqueueSnackbarFn).toHaveBeenCalledWith('모든 반복 일정이 삭제되었습니다.', {
      variant: 'success',
    });
  });

  it('반복 일정 삭제 실패 시 에러 메시지를 표시한다', async () => {
    // Given: 반복 일정이 존재하고 API가 실패
    const mockEvents: Event[] = [
      {
        id: '1',
        title: '주간 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 팀 미팅',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1 },
        notificationTime: 10,
      },
    ];

    server.use(
      http.get('/api/events', () => {
        return HttpResponse.json({ events: mockEvents });
      }),
      http.delete('/api/events/:id', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const { result } = renderHook(() => useEventOperations(false));
    await act(() => Promise.resolve(null));

    const referenceEvent = result.current.events[0];

    // When: deleteAllRecurringEvents 호출 (실패)
    await act(async () => {
      await result.current.deleteAllRecurringEvents(referenceEvent);
    });

    // Then: 에러 메시지가 표시되어야 함
    expect(enqueueSnackbarFn).toHaveBeenCalledWith('반복 일정 삭제 실패', {
      variant: 'error',
    });
  });

  it('다른 반복 그룹의 일정은 삭제되지 않는다', async () => {
    // Given: 서로 다른 반복 그룹의 일정들이 존재
    const mockEvents: Event[] = [
      {
        id: '1',
        title: '주간 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 팀 미팅',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1 },
        notificationTime: 10,
      },
      {
        id: '2',
        title: '주간 회의',
        date: '2025-10-22',
        startTime: '09:00',
        endTime: '10:00',
        description: '주간 팀 미팅',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1 },
        notificationTime: 10,
      },
      {
        id: '3',
        title: '일일 스탠드업',
        date: '2025-10-15',
        startTime: '10:00',
        endTime: '10:15',
        description: '매일 아침 스탠드업',
        location: '회의실 B',
        category: '업무',
        repeat: { type: 'daily', interval: 1 },
        notificationTime: 5,
      },
      {
        id: '4',
        title: '일일 스탠드업',
        date: '2025-10-16',
        startTime: '10:00',
        endTime: '10:15',
        description: '매일 아침 스탠드업',
        location: '회의실 B',
        category: '업무',
        repeat: { type: 'daily', interval: 1 },
        notificationTime: 5,
      },
    ];

    server.use(
      http.get('/api/events', () => {
        return HttpResponse.json({ events: mockEvents });
      }),
      http.delete('/api/events/:id', ({ params }) => {
        const { id } = params;
        const index = mockEvents.findIndex((event) => event.id === id);
        if (index !== -1) {
          mockEvents.splice(index, 1);
        }
        return new HttpResponse(null, { status: 204 });
      })
    );

    const { result } = renderHook(() => useEventOperations(false));
    await act(() => Promise.resolve(null));

    // 초기 상태: 4개의 일정이 있어야 함
    expect(result.current.events).toHaveLength(4);

    // '주간 회의' 그룹의 첫 번째 일정을 참조로 사용
    const weeklyMeetingEvent = result.current.events.find((e) => e.title === '주간 회의')!;

    // When: '주간 회의' 반복 그룹 삭제
    await act(async () => {
      await result.current.deleteAllRecurringEvents(weeklyMeetingEvent);
    });

    // Then: '주간 회의' 2개는 삭제되고, '일일 스탠드업' 2개는 남아있어야 함
    expect(result.current.events).toHaveLength(2);
    expect(result.current.events.every((e) => e.title === '일일 스탠드업')).toBe(true);
    expect(result.current.events.some((e) => e.title === '주간 회의')).toBe(false);
  });
});
