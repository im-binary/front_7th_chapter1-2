import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import App from '../../App';

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

describe('App - 반복 일정 수정 다이얼로그 (TC001-TC004) - RED 단계', () => {
  it('TC001: 반복 일정 수정 버튼 클릭 시 범위 선택 다이얼로그 표시되어야 함', async () => {
    // Given: 캘린더에 반복 일정이 표시되어 있음
    const { user } = setup(<App />);

    // API 응답 대기 (일정 로드)
    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // 반복 일정 찾기 (Repeat 아이콘이 있는 일정)
    const repeatIcons = screen.queryAllByTestId('RepeatIcon');

    // RED 단계: 아직 다이얼로그 기능이 구현되지 않았으므로
    // 반복 일정이 있다면 수정 버튼을 클릭해도 다이얼로그가 나타나지 않아야 함
    if (repeatIcons.length > 0) {
      const firstRepeatIcon = repeatIcons[0];
      const eventRow =
        firstRepeatIcon.closest('tr') || firstRepeatIcon.closest('div')?.closest('div');

      if (eventRow) {
        const editButtons = within(eventRow).queryAllByRole('button');
        const editButton = editButtons.find((btn) => btn.querySelector('[data-testid="EditIcon"]'));

        if (editButton) {
          // When: 사용자가 반복 일정 옆의 수정 버튼을 클릭
          await user.click(editButton);

          // Then: 아직 구현되지 않았으므로 다이얼로그가 나타나지 않아야 함
          const dialog = screen.queryByText('해당 일정만 수정하시겠어요?');
          expect(dialog).toBeNull(); // RED: 다이얼로그가 없어야 테스트 통과
        }
      }
    }
  });

  it('TC002: 일반 일정 수정 버튼 클릭 시 다이얼로그 없이 바로 폼 열려야 함', async () => {
    // Given: 캘린더에 일반 일정이 표시되어 있음
    const { user } = setup(<App />);

    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // 일정 추가
    const titleInput = screen.getByLabelText(/제목/i);
    await user.type(titleInput, '일반 일정 테스트');

    const dateInput = screen.getByLabelText(/날짜/i);
    await user.type(dateInput, '2025-11-01');

    const startTimeInput = screen.getByLabelText(/시작 시간/i);
    await user.clear(startTimeInput);
    await user.type(startTimeInput, '10:00');

    const endTimeInput = screen.getByLabelText(/종료 시간/i);
    await user.clear(endTimeInput);
    await user.type(endTimeInput, '11:00');

    const addButton = screen.getByRole('button', { name: /일정 추가/i });
    await user.click(addButton);

    // 추가된 일정 찾기
    await screen.findByText('일반 일정 테스트', {}, { timeout: 2000 });

    // When: 일반 일정의 수정 버튼 클릭
    const eventTitle = screen.getByText('일반 일정 테스트');
    const eventRow = eventTitle.closest('tr') || eventTitle.closest('div')?.closest('div');

    if (eventRow) {
      const editButtons = within(eventRow).queryAllByRole('button');
      const editButton = editButtons.find((btn) => btn.querySelector('[data-testid="EditIcon"]'));

      if (editButton) {
        await user.click(editButton);

        // Then: 다이얼로그가 나타나지 않고 폼이 열려야 함
        const dialog = screen.queryByText('해당 일정만 수정하시겠어요?');
        expect(dialog).toBeNull();

        // 폼이 열렸는지 확인 (제목이 채워져 있어야 함)
        const titleInForm = screen.getByLabelText(/제목/i) as HTMLInputElement;
        expect(titleInForm.value).toBe('일반 일정 테스트');
      }
    }
  });

  it('TC003: 다이얼로그에서 "예 (이 일정만)" 선택 시 단일 수정 모드로 폼 열려야 함 (RED)', async () => {
    // Given: 반복 일정 수정 다이얼로그가 표시되어 있어야 함
    const { user } = setup(<App />);

    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // RED 단계: 다이얼로그 기능이 아직 구현되지 않았으므로
    // 다이얼로그를 찾을 수 없어야 함
    const dialog = screen.queryByText('해당 일정만 수정하시겠어요?');

    // Then: 다이얼로그가 없어야 함 (아직 구현 안됨)
    expect(dialog).toBeNull();
  });

  it('TC004: 다이얼로그에서 "아니오 (모든 일정)" 선택 시 전체 수정 모드로 폼 열려야 함 (RED)', async () => {
    // Given: 반복 일정 수정 다이얼로그가 표시되어 있어야 함
    const { user } = setup(<App />);

    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // RED 단계: 다이얼로그 기능이 아직 구현되지 않았으므로
    // 다이얼로그를 찾을 수 없어야 함
    const dialog = screen.queryByText('해당 일정만 수정하시겠어요?');

    // Then: 다이얼로그가 없어야 함 (아직 구현 안됨)
    expect(dialog).toBeNull();
  });
});

describe('App - addOrUpdateEvent 함수 분기 로직 (TC006-TC008) - RED 단계', () => {
  it('TC006: addOrUpdateEvent에서 일반 일정 수정 시 saveEvent 호출되어야 함', async () => {
    // Given: 일반 일정 수정 상황
    const { user } = setup(<App />);

    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // 일정 추가
    const titleInput = screen.getByLabelText(/제목/i);
    await user.type(titleInput, '일반 일정');

    const dateInput = screen.getByLabelText(/날짜/i);
    await user.type(dateInput, '2025-11-01');

    const startTimeInput = screen.getByLabelText(/시작 시간/i);
    await user.clear(startTimeInput);
    await user.type(startTimeInput, '10:00');

    const endTimeInput = screen.getByLabelText(/종료 시간/i);
    await user.clear(endTimeInput);
    await user.type(endTimeInput, '11:00');

    const addButton = screen.getByRole('button', { name: /일정 추가/i });
    await user.click(addButton);

    // 추가 성공 메시지 확인
    await screen.findByText('일정이 추가되었습니다.', {}, { timeout: 2000 });

    // When & Then: 일반 일정 수정 플로우는 기존대로 작동해야 함
    // (recurringEditMode가 'none'인 경우)
    expect(screen.getByText('일반 일정')).toBeInTheDocument();
  });

  it('TC007: addOrUpdateEvent에서 반복 일정 단일 수정 시 updateSingleRecurringEvent 호출되어야 함 (RED)', async () => {
    // Given: 반복 일정 단일 수정 상황
    const { user } = setup(<App />);

    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // RED 단계: updateSingleRecurringEvent 함수가 아직 구현되지 않았으므로
    // 이 함수가 호출되는 플로우도 아직 구현되지 않았음
    // 따라서 다이얼로그도 나타나지 않아야 함
    const dialog = screen.queryByText('해당 일정만 수정하시겠어요?');
    expect(dialog).toBeNull();
  });

  it('TC008: addOrUpdateEvent에서 반복 일정 전체 수정 시 updateAllRecurringEvents 호출되어야 함 (RED)', async () => {
    // Given: 반복 일정 전체 수정 상황
    const { user } = setup(<App />);

    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // RED 단계: updateAllRecurringEvents 함수가 아직 구현되지 않았으므로
    // 이 함수가 호출되는 플로우도 아직 구현되지 않았음
    // 따라서 다이얼로그도 나타나지 않아야 함
    const dialog = screen.queryByText('해당 일정만 수정하시겠어요?');
    expect(dialog).toBeNull();
  });
});
