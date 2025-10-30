import { http, HttpResponse } from 'msw';

import { server } from '../setupTests';
import { Event } from '../types';

// ! Hard 여기 제공 안함
/**
 * 이벤트 관련 Mock API 핸들러를 설정합니다.
 * GET, POST, DELETE 요청을 처리합니다.
 *
 * @param initEvents - 초기 이벤트 배열
 * @param options - 핸들러 동작 옵션
 * @param options.deleteSuccess - DELETE 요청 성공 여부 (기본: true)
 */
export const setupMockHandlers = (
  initEvents = [] as Event[],
  options: { deleteSuccess?: boolean } = {}
) => {
  const { deleteSuccess = true } = options;
  const mockEvents: Event[] = [...initEvents];

  server.use(
    http.get('/api/events', () => {
      return HttpResponse.json({ events: mockEvents });
    }),
    http.post('/api/events', async ({ request }) => {
      const newEvent = (await request.json()) as Event;
      newEvent.id = String(mockEvents.length + 1); // 간단한 ID 생성
      mockEvents.push(newEvent);
      return HttpResponse.json(newEvent, { status: 201 });
    }),
    http.put('/api/events/:id', async ({ params, request }) => {
      const { id } = params;
      const updatedEvent = (await request.json()) as Event;
      const index = mockEvents.findIndex((event) => event.id === id);

      if (index !== -1) {
        mockEvents[index] = { ...mockEvents[index], ...updatedEvent };
      }
      return HttpResponse.json(mockEvents[index]);
    }),
    http.delete('/api/events/:id', ({ params }) => {
      // 실패 시나리오 처리
      if (!deleteSuccess) {
        return new HttpResponse(null, { status: 500 });
      }

      // 성공 시나리오
      const { id } = params;
      const index = mockEvents.findIndex((event) => event.id === id);
      if (index !== -1) {
        mockEvents.splice(index, 1);
      }
      return new HttpResponse(null, { status: 204 });
    })
  );
};

// 기존 함수명 유지 (하위 호환성)
export const setupMockHandlerCreation = setupMockHandlers;

export const setupMockHandlerUpdating = () => {
  const mockEvents: Event[] = [
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
    {
      id: '2',
      title: '기존 회의2',
      date: '2025-10-15',
      startTime: '11:00',
      endTime: '12:00',
      description: '기존 팀 미팅 2',
      location: '회의실 C',
      category: '업무',
      repeat: { type: 'none', interval: 0 },
      notificationTime: 10,
    },
  ];

  server.use(
    http.get('/api/events', () => {
      return HttpResponse.json({ events: mockEvents });
    }),
    http.put('/api/events/:id', async ({ params, request }) => {
      const { id } = params;
      const updatedEvent = (await request.json()) as Event;
      const index = mockEvents.findIndex((event) => event.id === id);

      mockEvents[index] = { ...mockEvents[index], ...updatedEvent };
      return HttpResponse.json(mockEvents[index]);
    })
  );
};

export const setupMockHandlerDeletion = () => {
  const mockEvents: Event[] = [
    {
      id: '1',
      title: '삭제할 이벤트',
      date: '2025-10-15',
      startTime: '09:00',
      endTime: '10:00',
      description: '삭제할 이벤트입니다',
      location: '어딘가',
      category: '기타',
      repeat: { type: 'none', interval: 0 },
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

      mockEvents.splice(index, 1);
      return new HttpResponse(null, { status: 204 });
    })
  );
};
