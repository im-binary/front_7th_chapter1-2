import { EventForm, RepeatInfo } from '../types';

/**
 * 반복 일정 생성 함수
 * @param baseEvent 기본 이벤트 정보 (id 제외)
 * @param repeatInfo 반복 정보
 * @param startDate 시작 날짜
 * @param repeatEndDate 반복 종료 날짜 (최대 2025-12-31)
 * @returns 생성된 반복 이벤트 배열
 */
export function generateRecurringEvents(
  baseEvent: Omit<EventForm, 'id'>,
  repeatInfo: RepeatInfo,
  startDate: Date,
  repeatEndDate: Date
): EventForm[] {
  // TODO: 구현 필요 - RED 단계
  // 현재는 빈 배열을 반환하여 테스트가 실패하도록 함
  return [];
}
