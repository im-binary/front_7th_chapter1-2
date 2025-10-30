import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';

import { Event, EventForm, RepeatType } from '../types';

// API 엔드포인트 상수
const API_BASE_URL = '/api/events';

// HTTP 헤더 상수
const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

// 반복 타입 상수
const REPEAT_TYPE = { NONE: 'none' as RepeatType } as const;

// 스낵바 메시지 상수
const SNACKBAR_MESSAGES = {
  LOADING_COMPLETE: '일정 로딩 완료!',
  LOADING_FAILED: '이벤트 로딩 실패',
  EVENT_ADDED: '일정이 추가되었습니다.',
  EVENT_UPDATED: '일정이 수정되었습니다.',
  EVENT_DELETED: '일정이 삭제되었습니다.',
  EVENT_SAVE_FAILED: '일정 저장 실패',
  EVENT_DELETE_FAILED: '일정 삭제 실패',
  MULTIPLE_EVENTS_ADDED: '반복 일정이 모두 추가되었습니다.',
  MULTIPLE_EVENTS_SAVE_FAILED: '반복 일정 저장 실패',
  ALL_RECURRING_EVENTS_UPDATED: '모든 반복 일정이 수정되었습니다.',
  RECURRING_EVENT_UPDATE_FAILED: '반복 일정 수정 실패',
  SINGLE_RECURRING_EVENT_UPDATE_FAILED: '일정 수정 실패',
  ALL_RECURRING_EVENTS_DELETED: '모든 반복 일정이 삭제되었습니다.',
  RECURRING_EVENT_DELETE_FAILED: '반복 일정 삭제 실패',
} as const;

export const useEventOperations = (editing: boolean, onSave?: () => void) => {
  const [events, setEvents] = useState<Event[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  /**
   * API 요청을 실행하는 공통 헬퍼 함수
   * @param url - API 엔드포인트 URL
   * @param options - fetch 옵션
   * @returns Promise<Response>
   */
  const callApi = async (
    url: string,
    options?: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    }
  ): Promise<Response> => {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    return response;
  };

  /**
   * PUT 요청으로 이벤트를 업데이트하는 헬퍼 함수
   * @param eventId - 업데이트할 이벤트 ID
   * @param eventData - 업데이트할 이벤트 데이터
   */
  const updateEventById = async (eventId: string, eventData: Event): Promise<void> => {
    await callApi(`${API_BASE_URL}/${eventId}`, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(eventData),
    });
  };

  const fetchEvents = async () => {
    try {
      const response = await callApi(API_BASE_URL);
      const { events } = await response.json();
      setEvents(events);
    } catch (error) {
      console.error('Error fetching events:', error);
      enqueueSnackbar(SNACKBAR_MESSAGES.LOADING_FAILED, { variant: 'error' });
    }
  };

  const saveEvent = async (eventData: Event | EventForm) => {
    try {
      if (editing) {
        await updateEventById((eventData as Event).id, eventData as Event);
      } else {
        await callApi(API_BASE_URL, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify(eventData),
        });
      }

      await fetchEvents();
      onSave?.();
      enqueueSnackbar(editing ? SNACKBAR_MESSAGES.EVENT_UPDATED : SNACKBAR_MESSAGES.EVENT_ADDED, {
        variant: 'success',
      });
    } catch (error) {
      console.error('Error saving event:', error);
      enqueueSnackbar(SNACKBAR_MESSAGES.EVENT_SAVE_FAILED, { variant: 'error' });
    }
  };

  const saveMultipleEvents = async (eventsToSave: EventForm[]) => {
    try {
      // 모든 이벤트를 순차적으로 저장
      for (const eventData of eventsToSave) {
        await callApi(API_BASE_URL, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify(eventData),
        });
      }

      await fetchEvents();
      onSave?.();
      enqueueSnackbar(SNACKBAR_MESSAGES.MULTIPLE_EVENTS_ADDED, { variant: 'success' });
    } catch (error) {
      console.error('Error saving multiple events:', error);
      enqueueSnackbar(SNACKBAR_MESSAGES.MULTIPLE_EVENTS_SAVE_FAILED, { variant: 'error' });
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await callApi(`${API_BASE_URL}/${id}`, { method: 'DELETE' });

      await fetchEvents();
      enqueueSnackbar(SNACKBAR_MESSAGES.EVENT_DELETED, { variant: 'info' });
    } catch (error) {
      console.error('Error deleting event:', error);
      enqueueSnackbar(SNACKBAR_MESSAGES.EVENT_DELETE_FAILED, { variant: 'error' });
    }
  };

  /**
   * 반복 일정 중 단일 일정만 수정
   * - 선택한 일정의 repeat.type을 'none'으로 변경하여 반복 그룹에서 분리
   * - 반복 아이콘이 사라지고 일반 일정으로 변경됨
   */
  const updateSingleRecurringEvent = async (eventToUpdate: Event) => {
    try {
      // repeat.type을 'none'으로 변경하여 반복 그룹에서 분리
      const updatedEvent: Event = {
        ...eventToUpdate,
        repeat: {
          ...eventToUpdate.repeat,
          type: REPEAT_TYPE.NONE,
        },
      };

      await updateEventById(eventToUpdate.id, updatedEvent);

      await fetchEvents();
      onSave?.();
      enqueueSnackbar(SNACKBAR_MESSAGES.EVENT_UPDATED, { variant: 'success' });
    } catch (error) {
      console.error('Error updating single recurring event:', error);
      enqueueSnackbar(SNACKBAR_MESSAGES.SINGLE_RECURRING_EVENT_UPDATE_FAILED, { variant: 'error' });
    }
  };

  /**
   * 동일한 반복 그룹에 속하는 모든 일정을 찾는 헬퍼 함수
   * @param referenceEvent - 기준이 되는 이벤트 (원본 이벤트)
   * @returns 동일 그룹에 속하는 이벤트 배열
   */
  const findRecurringGroupEvents = (referenceEvent: Event): Event[] => {
    return events.filter(
      (event) =>
        event.title === referenceEvent.title &&
        event.startTime === referenceEvent.startTime &&
        event.endTime === referenceEvent.endTime &&
        event.repeat.type === referenceEvent.repeat.type &&
        event.repeat.type !== REPEAT_TYPE.NONE
    );
  };

  /**
   * 반복 그룹의 특정 이벤트에 수정사항을 적용하는 헬퍼 함수
   * @param groupEvent - 그룹 내의 개별 이벤트
   * @param modifiedEvent - 수정된 값들을 담은 이벤트
   * @returns 업데이트된 이벤트 객체
   */
  const applyUpdatesToGroupEvent = (groupEvent: Event, modifiedEvent: Event): Event => {
    return {
      ...groupEvent,
      // 수정 가능한 필드들 업데이트
      title: modifiedEvent.title,
      description: modifiedEvent.description,
      location: modifiedEvent.location,
      category: modifiedEvent.category,
      notificationTime: modifiedEvent.notificationTime,
      startTime: modifiedEvent.startTime,
      endTime: modifiedEvent.endTime,
      // id, date, repeat는 그대로 유지 (각 일정의 고유 정보)
    };
  };

  /**
   * 반복 일정 그룹 전체를 수정
   * - 동일한 반복 그룹의 모든 일정에 동일한 수정사항 적용
   * - 각 일정의 날짜와 반복 정보는 유지
   * @param modifiedEvent - 수정된 이벤트 데이터
   * @param originalEvent - 원본 이벤트 (그룹 식별용, optional)
   */
  const updateAllRecurringEvents = async (modifiedEvent: Event, originalEvent?: Event) => {
    try {
      // 그룹 식별을 위한 기준 이벤트 결정
      const referenceEvent = originalEvent || modifiedEvent;

      // 동일 그룹에 속하는 모든 일정 찾기
      const matchingRecurringEvents = findRecurringGroupEvents(referenceEvent);

      // 그룹 내 각 일정을 순차적으로 업데이트
      for (const groupEvent of matchingRecurringEvents) {
        const updatedEvent = applyUpdatesToGroupEvent(groupEvent, modifiedEvent);
        await updateEventById(groupEvent.id, updatedEvent);
      }

      await fetchEvents();
      onSave?.();
      enqueueSnackbar(SNACKBAR_MESSAGES.ALL_RECURRING_EVENTS_UPDATED, { variant: 'success' });
    } catch (error) {
      console.error('Error updating all recurring events:', error);
      enqueueSnackbar(SNACKBAR_MESSAGES.RECURRING_EVENT_UPDATE_FAILED, { variant: 'error' });
    }
  };

  /**
   * 반복 일정 그룹 전체를 삭제
   * - 동일한 반복 그룹의 모든 일정을 삭제
   * @param referenceEvent - 기준이 되는 반복 일정
   */
  const deleteAllRecurringEvents = async (referenceEvent: Event) => {
    try {
      // 1. 동일한 반복 그룹에 속하는 모든 일정 찾기
      const matchingRecurringEvents = findRecurringGroupEvents(referenceEvent);

      // 2. 각 일정을 순차적으로 삭제
      for (const event of matchingRecurringEvents) {
        await callApi(`${API_BASE_URL}/${event.id}`, { method: 'DELETE' });
      }

      // 3. 이벤트 목록 갱신
      await fetchEvents();

      // 4. 성공 메시지 표시
      enqueueSnackbar(SNACKBAR_MESSAGES.ALL_RECURRING_EVENTS_DELETED, { variant: 'success' });
    } catch (error) {
      console.error('Error deleting all recurring events:', error);
      enqueueSnackbar(SNACKBAR_MESSAGES.RECURRING_EVENT_DELETE_FAILED, { variant: 'error' });
    }
  };

  /**
   * 초기화 함수 - 이벤트 목록을 불러오고 사용자에게 알림
   */
  const init = async () => {
    await fetchEvents();
    enqueueSnackbar(SNACKBAR_MESSAGES.LOADING_COMPLETE, { variant: 'info' });
  };

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
    deleteAllRecurringEvents,
  };
};
