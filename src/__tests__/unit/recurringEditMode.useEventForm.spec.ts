import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { useEventForm } from '../../hooks/useEventForm';

describe('useEventForm - recurringEditMode 상태 관리 (TC005)', () => {
  it('TC005-1: 초기 recurringEditMode는 "none"이어야 함', () => {
    // Given: useEventForm 훅을 초기화
    const { result } = renderHook(() => useEventForm());

    // When: 초기 상태 확인

    // Then: recurringEditMode는 'none'이어야 함
    expect(result.current.recurringEditMode).toBe('none');
  });

  it('TC005-2: setRecurringEditMode로 상태를 "single"로 변경할 수 있어야 함', () => {
    // Given: useEventForm 훅을 초기화
    const { result } = renderHook(() => useEventForm());

    // When: setRecurringEditMode('single') 호출
    act(() => {
      result.current.setRecurringEditMode('single');
    });

    // Then: recurringEditMode는 'single'이어야 함
    expect(result.current.recurringEditMode).toBe('single');
  });

  it('TC005-3: setRecurringEditMode로 상태를 "all"로 변경할 수 있어야 함', () => {
    // Given: useEventForm 훅을 초기화
    const { result } = renderHook(() => useEventForm());

    // When: setRecurringEditMode('all') 호출
    act(() => {
      result.current.setRecurringEditMode('all');
    });

    // Then: recurringEditMode는 'all'이어야 함
    expect(result.current.recurringEditMode).toBe('all');
  });

  it('TC005-4: resetForm 호출 시 recurringEditMode가 "none"으로 초기화되어야 함', () => {
    // Given: useEventForm 훅을 초기화하고 recurringEditMode를 'single'로 설정
    const { result } = renderHook(() => useEventForm());
    act(() => {
      result.current.setRecurringEditMode('single');
    });
    expect(result.current.recurringEditMode).toBe('single');

    // When: resetForm() 호출
    act(() => {
      result.current.resetForm();
    });

    // Then: recurringEditMode는 'none'으로 초기화되어야 함
    expect(result.current.recurringEditMode).toBe('none');
  });

  it('TC005-5: resetForm 호출 시 "all" 상태에서도 "none"으로 초기화되어야 함', () => {
    // Given: useEventForm 훅을 초기화하고 recurringEditMode를 'all'로 설정
    const { result } = renderHook(() => useEventForm());
    act(() => {
      result.current.setRecurringEditMode('all');
    });
    expect(result.current.recurringEditMode).toBe('all');

    // When: resetForm() 호출
    act(() => {
      result.current.resetForm();
    });

    // Then: recurringEditMode는 'none'으로 초기화되어야 함
    expect(result.current.recurringEditMode).toBe('none');
  });
});
