import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { setupMockHandlerCreation } from '../../__mocks__/handlersUtils';
import App from '../../App';
import { createMockEvent } from '../fixtures/eventFixtures';

const theme = createTheme();

const setup = (element: ReactElement) => {
  const user = userEvent.setup();

  return {
    ...render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider>{element}</SnackbarProvider>
      </ThemeProvider>
    ),
    user,
  };
};

describe('반복 일정 UI - repeatEndDate 최대값 제한', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('반복 종료일 입력 필드의 max 속성이 2025-12-31로 설정되어 있다', async () => {
    // Given: 일정 추가/수정 폼이 열려있고 반복 체크박스가 선택되어 있음
    const { user } = setup(<App />);

    // 일정 추가 버튼 클릭
    const addButton = screen.getByRole('button', { name: /일정 추가/i });
    await user.click(addButton);

    // 반복 일정 체크박스 찾기 및 클릭
    const repeatCheckbox = screen.getByRole('checkbox', { name: /반복 일정/i });
    await user.click(repeatCheckbox);

    // When: 반복 종료일 입력 필드를 확인
    const repeatEndDateInput = screen.getByLabelText(/반복 종료일/i);

    // Then: max 속성이 2025-12-31로 설정되어 있음
    expect(repeatEndDateInput).toHaveAttribute('max', '2025-12-31');
  });
});

describe('반복 일정 저장 - 여러 이벤트 생성 및 스낵바 1회 표시', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('반복 일정 저장 시 여러 이벤트가 생성되고 스낵바 알림은 한 번만 표시된다', async () => {
    // Given: 일정 추가 폼이 열려 있고 반복 일정 설정
    setupMockHandlerCreation([createMockEvent()]);

    const { user } = setup(<App />);

    // 일정 추가 버튼 클릭
    const addButton = screen.getByRole('button', { name: /일정 추가/i });
    await user.click(addButton);

    // 일정 정보 입력
    const titleInput = screen.getByLabelText(/제목/i);
    await user.type(titleInput, '주간 회의');

    const dateInput = screen.getByLabelText(/날짜/i);
    await user.clear(dateInput);
    await user.type(dateInput, '2025-11-01');

    const startTimeInput = screen.getByLabelText(/시작 시간/i);
    await user.clear(startTimeInput);
    await user.type(startTimeInput, '09:00');

    const endTimeInput = screen.getByLabelText(/종료 시간/i);
    await user.clear(endTimeInput);
    await user.type(endTimeInput, '10:00');

    // 반복 일정 체크박스 선택
    const repeatCheckbox = screen.getByRole('checkbox', { name: /반복 일정/i });
    await user.click(repeatCheckbox);

    // 반복 타입 선택 (주간)
    const repeatTypeSelect = screen.getByText(/반복 유형/i);
    await user.click(within(repeatTypeSelect.nextSibling! as HTMLElement).getByRole('combobox')); // 드롭다운 열기
    await user.click(screen.getByRole('listbox'));
    await user.click(screen.getByRole('option', { name: '매주' }));

    // 반복 간격 설정
    const intervalInput = screen.getByLabelText(/반복 간격/i);

    await user.clear(intervalInput);
    await user.type(intervalInput, '1');

    // 반복 종료일 설정 (2주간 반복)
    const repeatEndDateInput = screen.getByLabelText(/반복 종료일/i);
    await user.type(repeatEndDateInput, '2025-11-15');

    // When: 저장 버튼 클릭
    const saveButton = screen.getByRole('button', { name: /일정 (추가|등록)/i });
    await user.click(saveButton);

    // Then: 스낵바 알림이 한 번만 표시됨 (여러 이벤트가 생성되어도 한 번)
    const snackbarMessage = await screen.findByText(
      '반복 일정이 모두 추가되었습니다.',
      {},
      { timeout: 3000 }
    );
    expect(snackbarMessage).toBeInTheDocument();

    // And: 여러 이벤트가 화면에 표시됨
    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });
    const eventItems = screen.getAllByText('주간 회의');
    expect(eventItems.length).toBeGreaterThan(1); // 2주간 반복이므로 최소 2개
  });
});

describe('반복 일정 저장 - 일정 겹침 확인 건너뛰기', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('반복 일정 저장 시 일정 겹침 확인 다이얼로그가 표시되지 않는다', async () => {
    // Given: 일정 추가 폼이 열려 있고 반복 일정 설정
    setupMockHandlerCreation([createMockEvent()]);

    const { user } = setup(<App />);

    // 일정 추가 버튼 클릭
    const addButton = screen.getByRole('button', { name: /일정 추가/i });
    await user.click(addButton);

    // 일정 정보 입력
    const titleInput = screen.getByLabelText(/제목/i);
    await user.type(titleInput, '테스트 반복 일정');

    const dateInput = screen.getByLabelText(/날짜/i);
    await user.clear(dateInput);
    await user.type(dateInput, '2025-11-01');

    const startTimeInput = screen.getByLabelText(/시작 시간/i);
    await user.clear(startTimeInput);
    await user.type(startTimeInput, '09:00');

    const endTimeInput = screen.getByLabelText(/종료 시간/i);
    await user.clear(endTimeInput);
    await user.type(endTimeInput, '10:00');

    // 반복 일정 체크박스 선택
    const repeatCheckbox = screen.getByRole('checkbox', { name: /반복 일정/i });
    await user.click(repeatCheckbox);

    // 반복 타입 선택
    const repeatTypeSelect = screen.getByText(/반복 유형/i);
    await user.click(within(repeatTypeSelect.nextSibling! as HTMLElement).getByRole('combobox')); // 드롭다운 열기
    await user.click(screen.getByRole('listbox'));
    await user.click(screen.getByRole('option', { name: '매일' }));

    // 반복 간격 설정
    const intervalInput = screen.getByLabelText(/반복 간격/i);
    await user.clear(intervalInput);
    await user.type(intervalInput, '1');

    // 반복 종료일 설정
    const repeatEndDateInput = screen.getByLabelText(/반복 종료일/i);
    await user.type(repeatEndDateInput, '2025-11-07');

    // When: 저장 버튼 클릭
    const saveButton = screen.getByRole('button', { name: /일정 (추가|등록)/i });
    await user.click(saveButton);

    // Then: 일정 겹침 확인 다이얼로그가 표시되지 않음
    // (반복 일정은 겹침 확인을 건너뜀)
    const overlapDialog = screen.queryByText(/일정 겹침 경고/i);
    expect(overlapDialog).not.toBeInTheDocument();

    // And: 성공 메시지가 표시됨
    const successMessage = await screen.findByText(
      '반복 일정이 모두 추가되었습니다.',
      {},
      { timeout: 3000 }
    );
    expect(successMessage).toBeInTheDocument();
  });
});

describe('saveEvent 함수 - showSnackbar 파라미터 동작', () => {
  it('saveEvent와 saveMultipleEvents의 스낵바 표시 동작이 올바르다', async () => {
    // Given: 일정 추가 폼
    const { user } = setup(<App />);

    // Test 1: 단일 일정 저장 시 스낵바 표시
    const addButton = screen.getByRole('button', { name: /일정 추가/i });
    await user.click(addButton);

    const titleInput = screen.getByLabelText(/제목/i);
    await user.type(titleInput, '단일 일정');

    const dateInput = screen.getByLabelText(/날짜/i);
    await user.clear(dateInput);
    await user.type(dateInput, '2025-11-01');

    const startTimeInput = screen.getByLabelText(/시작 시간/i);
    await user.clear(startTimeInput);
    await user.type(startTimeInput, '09:00');

    const endTimeInput = screen.getByLabelText(/종료 시간/i);
    await user.clear(endTimeInput);
    await user.type(endTimeInput, '10:00');

    // When: 단일 일정 저장
    const saveButton = screen.getByRole('button', { name: /일정 (추가|등록)/i });
    await user.click(saveButton);

    // Then: 스낵바가 표시됨
    const singleEventMessage = await screen.findByText(
      '일정이 추가되었습니다.',
      {},
      { timeout: 3000 }
    );
    expect(singleEventMessage).toBeInTheDocument();

    // Test 2: 반복 일정 저장 시 스낵바 한 번만 표시
    await user.click(addButton);

    const titleInput2 = screen.getByLabelText(/제목/i);
    await user.type(titleInput2, '반복 일정');

    const dateInput2 = screen.getByLabelText(/날짜/i);
    await user.clear(dateInput2);
    await user.type(dateInput2, '2025-11-01');

    const startTimeInput2 = screen.getByLabelText(/시작 시간/i);
    await user.clear(startTimeInput2);
    await user.type(startTimeInput2, '90:00');

    const endTimeInput2 = screen.getByLabelText(/종료 시간/i);
    await user.clear(endTimeInput2);
    await user.type(endTimeInput2, '11:00');

    // 반복 일정 설정
    const repeatCheckbox = screen.getByRole('checkbox', { name: /반복 일정/i });
    await user.click(repeatCheckbox);

    const repeatTypeSelect = screen.getByText(/반복 유형/i);
    await user.click(within(repeatTypeSelect.nextSibling! as HTMLElement).getByRole('combobox')); // 드롭다운 열기
    await user.click(screen.getByRole('listbox'));
    await user.click(screen.getByRole('option', { name: '매일' }));

    const intervalInput = screen.getByLabelText(/반복 간격/i);
    await user.clear(intervalInput);
    await user.type(intervalInput, '1');

    const repeatEndDateInput = screen.getByLabelText(/반복 종료일/i);
    await user.type(repeatEndDateInput, '2025-11-05');

    // When: 반복 일정 저장
    const saveButton2 = screen.getByRole('button', { name: /일정 (추가|등록)/i });
    await user.click(saveButton2);

    // Then: 반복 일정 저장 스낵바가 한 번만 표시됨
    const multipleEventsMessage = await screen.findByText(
      '반복 일정이 모두 추가되었습니다.',
      {},
      { timeout: 3000 }
    );
    expect(multipleEventsMessage).toBeInTheDocument();
  });
});

describe('단일 일정 생성 - 반복 일정이 아닐 경우 기존 겹침 검사 로직이 유지된다', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('반복 일정이 아닐 경우 기존 겹침 검사 로직이 동작한다', async () => {
    // Given: 기존 일정이 있는 상태
    const { user } = setup(<App />);

    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // 첫 번째 일정 추가 (09:00-10:00)
    const addButton = screen.getByRole('button', { name: /일정 추가/i });
    await user.click(addButton);

    const titleInput = screen.getByLabelText(/제목/i);
    await user.type(titleInput, '기존 회의');

    const dateInput = screen.getByLabelText(/날짜/i);
    await user.clear(dateInput);
    await user.type(dateInput, '2025-11-01');

    const startTimeInput = screen.getByLabelText(/시작 시간/i);
    await user.clear(startTimeInput);
    await user.type(startTimeInput, '09:00');

    const endTimeInput = screen.getByLabelText(/종료 시간/i);
    await user.clear(endTimeInput);
    await user.type(endTimeInput, '10:00');

    const saveButton = screen.getByRole('button', { name: /일정 (추가|등록)/i });
    await user.click(saveButton);

    await screen.findByText('일정이 추가되었습니다.', {}, { timeout: 3000 });

    // When: 겹치는 시간대의 단일 일정 추가 시도 (09:30-10:30)
    await user.click(addButton);

    const titleInput2 = screen.getByLabelText(/제목/i);
    await user.type(titleInput2, '겹치는 회의');

    const dateInput2 = screen.getByLabelText(/날짜/i);
    await user.clear(dateInput2);
    await user.type(dateInput2, '2025-11-01');

    const startTimeInput2 = screen.getByLabelText(/시작 시간/i);
    await user.clear(startTimeInput2);
    await user.type(startTimeInput2, '09:30');

    const endTimeInput2 = screen.getByLabelText(/종료 시간/i);
    await user.clear(endTimeInput2);
    await user.type(endTimeInput2, '10:30');

    // 반복 일정 체크박스가 선택되지 않은 상태 확인
    const repeatCheckbox = screen.getByRole('checkbox', { name: /반복 일정/i });
    expect(repeatCheckbox).not.toBeChecked();

    const saveButton2 = screen.getByRole('button', { name: /일정 (추가|등록)/i });
    await user.click(saveButton2);

    // Then: 일정 겹침 경고 다이얼로그가 표시됨
    // And: 다이얼로그에 겹치는 일정 정보가 표시됨
    waitFor(() => {
      expect(screen.getByText('일정 겹침 경고')).toBeInTheDocument();
      expect(screen.getByText(/다음 일정과 겹칩니다/)).toBeInTheDocument();
      expect(screen.getByText('기존 회의 (2025-10-15 09:00-10:00)')).toBeInTheDocument();
    });
  });
});
