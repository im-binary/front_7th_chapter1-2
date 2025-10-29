import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';

import { Event, EventForm } from '../types';

export const useEventOperations = (editing: boolean, onSave?: () => void) => {
  const [events, setEvents] = useState<Event[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const { events } = await response.json();
      setEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      enqueueSnackbar('이벤트 로딩 실패', { variant: 'error' });
    }
  };

  const saveEvent = async (eventData: Event | EventForm) => {
    try {
      let response;
      if (editing) {
        response = await fetch(`/api/events/${(eventData as Event).id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
      } else {
        response = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save event');
      }

      await fetchEvents();
      onSave?.();
      enqueueSnackbar(editing ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.', {
        variant: 'success',
      });
    } catch (error) {
      console.error('Error saving event:', error);
      enqueueSnackbar('일정 저장 실패', { variant: 'error' });
    }
  };

  const saveMultipleEvents = async (eventsToSave: EventForm[]) => {
    try {
      for (const eventData of eventsToSave) {
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });

        if (!response.ok) {
          throw new Error(`Failed to save event: ${eventData.title}`);
        }
      }

      await fetchEvents();
      onSave?.();
      enqueueSnackbar('반복 일정이 모두 추가되었습니다.', { variant: 'success' });
    } catch (error) {
      console.error('Error saving multiple events:', error);
      enqueueSnackbar('반복 일정 저장 실패', { variant: 'error' });
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const response = await fetch(`/api/events/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      await fetchEvents();
      enqueueSnackbar('일정이 삭제되었습니다.', { variant: 'info' });
    } catch (error) {
      console.error('Error deleting event:', error);
      enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
    }
  };

  // GREEN 단계: 반복 일정 단일 수정 구현
  const updateSingleRecurringEvent = async (eventToUpdate: Event) => {
    try {
      // repeat.type을 'none'으로 변경
      const updatedEvent = {
        ...eventToUpdate,
        repeat: {
          ...eventToUpdate.repeat,
          type: 'none' as const,
        },
      };

      const response = await fetch(`/api/events/${eventToUpdate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEvent),
      });

      if (!response.ok) {
        throw new Error('Failed to update single recurring event');
      }

      await fetchEvents();
      onSave?.();
      enqueueSnackbar('일정이 수정되었습니다.', { variant: 'success' });
    } catch (error) {
      console.error('Error updating single recurring event:', error);
      enqueueSnackbar('일정 수정 실패', { variant: 'error' });
    }
  };

  // GREEN 단계: 반복 일정 전체 수정 구현
  const updateAllRecurringEvents = async (modifiedEvent: Event, originalEvent?: Event) => {
    try {
      // 원본 이벤트가 제공되면 그것을 사용, 아니면 modifiedEvent 사용
      const referenceEvent = originalEvent || modifiedEvent;

      // 동일 그룹 식별: 원본 이벤트의 title, startTime, endTime, repeat.type이 모두 같은 일정들
      const recurringGroup = events.filter(
        (event) =>
          event.title === referenceEvent.title &&
          event.startTime === referenceEvent.startTime &&
          event.endTime === referenceEvent.endTime &&
          event.repeat.type === referenceEvent.repeat.type &&
          event.repeat.type !== 'none'
      );

      // 각 일정에 대해 PUT 요청
      for (const eventInGroup of recurringGroup) {
        const updatedEvent = {
          ...eventInGroup,
          // 변경된 필드만 업데이트
          title: modifiedEvent.title,
          description: modifiedEvent.description,
          location: modifiedEvent.location,
          category: modifiedEvent.category,
          notificationTime: modifiedEvent.notificationTime,
          // id, date는 유지
          // startTime, endTime도 업데이트
          startTime: modifiedEvent.startTime,
          endTime: modifiedEvent.endTime,
          // repeat는 유지
        };

        const response = await fetch(`/api/events/${eventInGroup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedEvent),
        });

        if (!response.ok) {
          throw new Error(`Failed to update event: ${eventInGroup.id}`);
        }
      }

      await fetchEvents();
      onSave?.();
      enqueueSnackbar('모든 반복 일정이 수정되었습니다.', { variant: 'success' });
    } catch (error) {
      console.error('Error updating all recurring events:', error);
      enqueueSnackbar('반복 일정 수정 실패', { variant: 'error' });
    }
  };

  async function init() {
    await fetchEvents();
    enqueueSnackbar('일정 로딩 완료!', { variant: 'info' });
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    events,
    fetchEvents,
    saveEvent,
    deleteEvent,
    saveMultipleEvents,
    updateSingleRecurringEvent,
    updateAllRecurringEvents,
  };
};
