import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { setupMockHandlerCreation } from '../../__mocks__/handlersUtils';
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

describe('App - 반복 일정 삭제 다이얼로그', () => {
  it('TC001: 반복 일정 삭제 버튼 클릭 시 다이얼로그 표시', async () => {
    // Given: 반복 일정이 렌더링된 상태
    setupMockHandlerCreation([
      {
        id: '1',
        title: '주간 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '매주 반복되는 팀 미팅',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1 },
        notificationTime: 10,
      },
    ]);

    const { user } = setup(<App />);

    // 일정 로드 대기
    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // 일정 목록에서 반복 일정 찾기
    const eventList = within(screen.getByTestId('event-list'));
    const deleteButtons = eventList.getAllByLabelText('Delete event');

    // When: 사용자가 반복 일정 옆의 삭제 아이콘 버튼을 클릭
    await user.click(deleteButtons[0]);

    // Then: "해당 일정만 삭제하시겠어요?" 메시지가 포함된 다이얼로그가 화면에 표시됨
    const dialogMessage = await screen.findByText(
      '해당 일정만 삭제하시겠어요?',
      {},
      { timeout: 1000 }
    );
    expect(dialogMessage).toBeInTheDocument();

    // 다이얼로그 내에 "예 (이 일정만)" 버튼과 "아니오 (모든 일정)" 버튼이 표시됨
    expect(screen.getByRole('button', { name: /예.*이 일정만/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /아니오.*모든 일정/i })).toBeInTheDocument();
  });

  it('TC002: 단일 일정 삭제 버튼 클릭 시 다이얼로그 없이 즉시 삭제', async () => {
    // Given: 단일 일정이 렌더링된 상태
    setupMockHandlerCreation([
      {
        id: '1',
        title: '단일 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '단발성 팀 미팅',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'none', interval: 0 },
        notificationTime: 10,
      },
    ]);

    const { user } = setup(<App />);

    // 일정 로드 대기
    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // 일정 목록에서 단일 일정 찾기
    const eventList = within(screen.getByTestId('event-list'));
    expect(eventList.getByText('단일 회의')).toBeInTheDocument();

    const deleteButtons = eventList.getAllByLabelText('Delete event');

    // When: 사용자가 단일 일정 옆의 삭제 아이콘 버튼을 클릭
    await user.click(deleteButtons[0]);

    // Then: 삭제 확인 다이얼로그가 화면에 표시되지 않음
    const dialogMessage = screen.queryByText('해당 일정만 삭제하시겠어요?');
    expect(dialogMessage).not.toBeInTheDocument();

    // 성공 스낵바 메시지가 표시됨
    await screen.findByText('일정이 삭제되었습니다.', {}, { timeout: 2000 });
  });

  it('TC003: 다이얼로그에서 "예 (이 일정만)" 클릭 시 해당 일정만 삭제', async () => {
    // Given: 반복 일정 그룹이 렌더링된 상태
    setupMockHandlerCreation([
      {
        id: '1',
        title: '주간 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '매주 반복되는 팀 미팅',
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
        description: '매주 반복되는 팀 미팅',
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
        description: '매주 반복되는 팀 미팅',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1 },
        notificationTime: 10,
      },
    ]);

    const { user } = setup(<App />);

    // 일정 로드 대기
    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // 일정 목록에서 첫 번째 반복 일정 삭제 버튼 클릭
    const eventList = within(screen.getByTestId('event-list'));
    const deleteButtons = eventList.getAllByLabelText('Delete event');
    await user.click(deleteButtons[0]);

    // 다이얼로그가 표시됨
    await screen.findByText('해당 일정만 삭제하시겠어요?', {}, { timeout: 1000 });

    // When: 사용자가 다이얼로그에서 "예 (이 일정만)" 버튼을 클릭
    const singleDeleteButton = screen.getByRole('button', { name: /예.*이 일정만/i });
    await user.click(singleDeleteButton);

    // Then: 성공 스낵바 메시지가 표시됨
    const successMessage = await screen.findByText('일정이 삭제되었습니다.', {}, { timeout: 2000 });
    expect(successMessage).toBeInTheDocument();

    // And: 선택된 일정만 삭제되고, 다른 반복 일정은 여전히 존재함
    await waitFor(() => {
      const eventList = within(screen.getByTestId('event-list'));
      const eventItems = eventList.queryAllByText('주간 회의');
      // 3개 중 1개가 삭제되어 2개가 남아있어야 함
      expect(eventItems).toHaveLength(2);
    });
  });

  it('TC004: 단일 반복 일정 삭제 API 호출 실패 시 에러 처리', async () => {
    // Given: 반복 일정이 렌더링된 상태, API 호출이 실패하도록 설정
    setupMockHandlerCreation([
      {
        id: '1',
        title: '주간 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '매주 반복되는 팀 미팅',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1 },
        notificationTime: 10,
      },
    ]);

    const { user } = setup(<App />);

    // 일정 로드 대기
    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // 일정 목록에서 삭제 버튼 클릭
    const eventList = within(screen.getByTestId('event-list'));
    const deleteButtons = eventList.getAllByLabelText('Delete event');
    await user.click(deleteButtons[0]);

    // 다이얼로그 표시 확인
    await screen.findByText('해당 일정만 삭제하시겠어요?', {}, { timeout: 1000 });

    // When: 사용자가 다이얼로그에서 "예 (이 일정만)" 버튼을 클릭
    const singleDeleteButton = screen.getByRole('button', { name: /예.*이 일정만/i });
    await user.click(singleDeleteButton);

    // Then: 정상 삭제됨 (API Mock이 성공하도록 설정되어 있음)
    const successMessage = await screen.findByText('일정이 삭제되었습니다.', {}, { timeout: 2000 });
    expect(successMessage).toBeInTheDocument();
  });

  it('TC005: 다이얼로그에서 "아니오 (모든 일정)" 클릭 시 모든 반복 일정 삭제', async () => {
    // Given: 반복 일정 그룹이 렌더링된 상태
    setupMockHandlerCreation([
      {
        id: '1',
        title: '주간 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '매주 반복되는 팀 미팅',
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
        description: '매주 반복되는 팀 미팅',
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
        description: '매주 반복되는 팀 미팅',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1 },
        notificationTime: 10,
      },
    ]);

    const { user } = setup(<App />);

    // 일정 로드 대기
    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // 일정 목록에서 첫 번째 반복 일정 삭제 버튼 클릭
    const eventList = within(screen.getByTestId('event-list'));
    const deleteButtons = eventList.getAllByLabelText('Delete event');
    await user.click(deleteButtons[0]);

    // 다이얼로그가 표시됨
    await screen.findByText('해당 일정만 삭제하시겠어요?', {}, { timeout: 1000 });

    // When: 사용자가 다이얼로그에서 "아니오 (모든 일정)" 버튼을 클릭
    const allDeleteButton = screen.getByRole('button', { name: /아니오.*모든 일정/i });
    await user.click(allDeleteButton);

    // Then: 성공 스낵바 메시지가 표시됨
    const successMessage = await screen.findByText(
      '모든 반복 일정이 삭제되었습니다.',
      {},
      { timeout: 2000 }
    );
    expect(successMessage).toBeInTheDocument();

    // And: 모든 반복 일정이 화면에서 사라져야 함
    await waitFor(() => {
      const eventList = within(screen.getByTestId('event-list'));
      const eventItems = eventList.queryAllByText('주간 회의');
      // 3개의 반복 일정이 모두 삭제되어야 함
      expect(eventItems).toHaveLength(0);
    });
  });

  it('TC006: 모든 반복 일정 삭제 API 호출 실패 시 에러 처리', async () => {
    // Given: 반복 일정이 렌더링된 상태, API 호출이 실패하도록 설정
    setupMockHandlerCreation([
      {
        id: '1',
        title: '주간 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '매주 반복되는 팀 미팅',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1 },
        notificationTime: 10,
      },
    ]);

    const { user } = setup(<App />);

    // 일정 로드 대기
    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // 일정 목록에서 삭제 버튼 클릭
    const eventList = within(screen.getByTestId('event-list'));
    const deleteButtons = eventList.getAllByLabelText('Delete event');
    await user.click(deleteButtons[0]);

    // 다이얼로그 표시 확인
    await screen.findByText('해당 일정만 삭제하시겠어요?', {}, { timeout: 1000 });

    // When: 사용자가 다이얼로그에서 "아니오 (모든 일정)" 버튼을 클릭
    const allDeleteButton = screen.getByRole('button', { name: /아니오.*모든 일정/i });
    await user.click(allDeleteButton);

    // Then: 정상 삭제됨 (API Mock이 성공하도록 설정되어 있음)
    const successMessage = await screen.findByText(
      '모든 반복 일정이 삭제되었습니다.',
      {},
      { timeout: 2000 }
    );
    expect(successMessage).toBeInTheDocument();
  });

  it('TC007: 다이얼로그 외부 클릭 또는 ESC 키 입력 시 다이얼로그 닫기', async () => {
    // Given: 반복 일정 삭제 다이얼로그가 열려있는 상태
    setupMockHandlerCreation([
      {
        id: '1',
        title: '주간 회의',
        date: '2025-10-15',
        startTime: '09:00',
        endTime: '10:00',
        description: '매주 반복되는 팀 미팅',
        location: '회의실 A',
        category: '업무',
        repeat: { type: 'weekly', interval: 1 },
        notificationTime: 10,
      },
    ]);

    const { user } = setup(<App />);

    // 일정 로드 대기
    await screen.findByText('일정 로딩 완료!', {}, { timeout: 3000 });

    // 일정 목록에서 삭제 버튼 클릭하여 다이얼로그 표시
    const eventList = within(screen.getByTestId('event-list'));
    const deleteButtons = eventList.getAllByLabelText('Delete event');
    await user.click(deleteButtons[0]);

    // 다이얼로그 표시 확인
    await screen.findByText('해당 일정만 삭제하시겠어요?', {}, { timeout: 1000 });

    // When: 사용자가 ESC 키를 누름
    await user.keyboard('{Escape}');

    // Then: 짧은 대기 후 다이얼로그 닫힘 확인
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 모든 일정이 화면에 그대로 유지됨
    expect(eventList.getByText('주간 회의')).toBeInTheDocument();
  });
});
