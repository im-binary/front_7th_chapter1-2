import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import App from '../../App';
import { server } from '../../setupTests';
import { Event } from '../../types';

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

describe('반복 일정 아이콘 표시 기능', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('주간 캘린더 뷰', () => {
    it('TC001: 주간 캘린더 뷰에서 반복 일정이 Material-UI Repeat 아이콘으로 표시되는지 확인', async () => {
      // Given: 반복 일정이 있고, 알림이 설정되지 않은 상태
      const mockEvents: Event[] = [
        {
          id: '1',
          title: '반복 미팅',
          date: '2024-11-20',
          startTime: '10:00',
          endTime: '11:00',
          description: '',
          location: '',
          category: '',
          repeat: { type: 'weekly', interval: 1, endDate: '2024-12-31' },
          notificationTime: 0,
        },
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        })
      );

      // When: App 컴포넌트를 렌더링하고 주간 뷰 확인
      setup(<App />);

      // Then: 반복 아이콘이 표시되고 알림 아이콘은 표시되지 않음
      const repeatIcon = await screen.findByLabelText('Repeat icon');
      expect(repeatIcon).toBeInTheDocument();

      const notificationIcons = screen.queryAllByLabelText('Notifications icon');
      expect(notificationIcons).toHaveLength(0);
    });

    it('TC002: 주간 캘린더 뷰에서 반복 일정이면서 알림 설정된 경우 Repeat 및 Notification 아이콘이 정렬되어 표시되는지 확인', async () => {
      // Given: 반복 일정이면서 알림도 설정된 상태
      const mockEvents: Event[] = [
        {
          id: '2',
          title: '반복 알림 일정',
          date: '2024-11-20',
          startTime: '14:00',
          endTime: '15:00',
          description: '',
          location: '',
          category: '',
          repeat: { type: 'daily', interval: 1, endDate: '2024-12-31' },
          notificationTime: 10,
        },
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        })
      );

      // When: App 컴포넌트를 렌더링하고 주간 뷰 확인
      setup(<App />);

      // Then: 반복 아이콘과 알림 아이콘이 모두 표시됨
      const repeatIcon = await screen.findByLabelText('Repeat icon');
      expect(repeatIcon).toBeInTheDocument();

      const notificationIcon = await screen.findByLabelText('Notifications icon');
      expect(notificationIcon).toBeInTheDocument();

      // 두 아이콘이 같은 영역 내에 있는지 확인
      const weekView = screen.getByTestId('week-view');
      expect(within(weekView as HTMLElement).getByLabelText('Repeat icon')).toBeInTheDocument();
      expect(
        within(weekView as HTMLElement).getByLabelText('Notifications icon')
      ).toBeInTheDocument();
    });

    it('TC003: 주간 캘린더 뷰에서 반복 일정이 아닌 경우 Repeat 아이콘이 표시되지 않는지 확인', async () => {
      // Given: 반복이 아닌 일정 (repeat.type === 'none')
      const mockEvents: Event[] = [
        {
          id: '3',
          title: '일반 미팅',
          date: '2024-11-20',
          startTime: '11:00',
          endTime: '12:00',
          description: '',
          location: '',
          category: '',
          repeat: { type: 'none', interval: 0 },
          notificationTime: 0,
        },
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        })
      );

      // When: App 컴포넌트를 렌더링하고 주간 뷰 확인
      setup(<App />);

      // Then: 반복 아이콘이 표시되지 않음
      await screen.findByText('일반 미팅');
      const repeatIcons = screen.queryAllByLabelText('Repeat icon');
      expect(repeatIcons).toHaveLength(0);
    });
  });

  describe('월간 캘린더 뷰', () => {
    it('TC004: 월간 캘린더 뷰에서 반복 일정이 Material-UI Repeat 아이콘으로 표시되는지 확인', async () => {
      // Given: 반복 일정이 있고, 알림이 설정되지 않은 상태
      const mockEvents: Event[] = [
        {
          id: '4',
          title: '월간 반복 업무',
          date: '2024-11-15',
          startTime: '09:00',
          endTime: '10:00',
          description: '',
          location: '',
          category: '',
          repeat: { type: 'monthly', interval: 1, endDate: '2024-12-31' },
          notificationTime: 0,
        },
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        })
      );

      // When: App 컴포넌트를 렌더링하고 월간 뷰로 전환
      const { user } = setup(<App />);

      const viewSelect = await screen.findByLabelText('view');
      await user.click(viewSelect);
      const monthOption = await screen.findByRole('option', { name: '월' });
      await user.click(monthOption);

      // Then: 반복 아이콘이 표시되고 알림 아이콘은 표시되지 않음
      const repeatIcon = await screen.findByLabelText('Repeat icon');
      expect(repeatIcon).toBeInTheDocument();

      const notificationIcons = screen.queryAllByLabelText('Notifications icon');
      expect(notificationIcons).toHaveLength(0);
    });

    it('TC005: 월간 캘린더 뷰에서 반복 일정이면서 알림 설정된 경우 Repeat 및 Notification 아이콘이 정렬되어 표시되는지 확인', async () => {
      // Given: 반복 일정이면서 알림도 설정된 상태
      const mockEvents: Event[] = [
        {
          id: '5',
          title: '월간 반복 알림',
          date: '2024-11-25',
          startTime: '16:00',
          endTime: '17:00',
          description: '',
          location: '',
          category: '',
          repeat: { type: 'monthly', interval: 1, endDate: '2024-12-31' },
          notificationTime: 10,
        },
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        })
      );

      // When: App 컴포넌트를 렌더링하고 월간 뷰로 전환
      const { user } = setup(<App />);

      const viewSelect = await screen.findByLabelText('view');
      await user.click(viewSelect);
      const monthOption = await screen.findByRole('option', { name: '월' });
      await user.click(monthOption);

      // Then: 반복 아이콘과 알림 아이콘이 모두 표시됨
      const repeatIcon = await screen.findByLabelText('Repeat icon');
      expect(repeatIcon).toBeInTheDocument();

      const notificationIcon = await screen.findByLabelText('Notifications icon');
      expect(notificationIcon).toBeInTheDocument();
    });

    it('TC006: 월간 캘린더 뷰에서 반복 일정이 아닌 경우 Repeat 아이콘이 표시되지 않는지 확인', async () => {
      // Given: 반복이 아닌 일정
      const mockEvents: Event[] = [
        {
          id: '6',
          title: '일반 일정',
          date: '2024-11-10',
          startTime: '13:00',
          endTime: '14:00',
          description: '',
          location: '',
          category: '',
          repeat: { type: 'none', interval: 0 },
          notificationTime: 0,
        },
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        })
      );

      // When: App 컴포넌트를 렌더링하고 월간 뷰로 전환
      const { user } = setup(<App />);

      const viewSelect = await screen.findByLabelText('view');
      await user.click(viewSelect);
      const monthOption = await screen.findByRole('option', { name: '월' });
      await user.click(monthOption);

      // Then: 반복 아이콘이 표시되지 않음
      await screen.findByText('일반 일정');
      const repeatIcons = screen.queryAllByLabelText('Repeat icon');
      expect(repeatIcons).toHaveLength(0);
    });
  });

  describe('일정 목록', () => {
    it('TC007: 일정 목록에서 반복 일정이 Material-UI Repeat 아이콘으로 표시되는지 확인', async () => {
      // Given: 반복 일정이 있고, 알림이 설정되지 않은 상태
      const mockEvents: Event[] = [
        {
          id: '7',
          title: '목록 반복 일정',
          date: '2024-11-21',
          startTime: '10:00',
          endTime: '11:00',
          description: '',
          location: '',
          category: '',
          repeat: { type: 'daily', interval: 1, endDate: '2024-12-31' },
          notificationTime: 0,
        },
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        })
      );

      // When: App 컴포넌트를 렌더링하고 일정 목록 확인
      setup(<App />);

      const eventList = await screen.findByTestId('event-list');

      // Then: 일정 목록에서 반복 아이콘이 표시됨
      const repeatIcon = await within(eventList).findByLabelText('Repeat icon');
      expect(repeatIcon).toBeInTheDocument();

      const notificationIcons = within(eventList).queryAllByLabelText('Notifications icon');
      expect(notificationIcons).toHaveLength(0);
    });

    it('TC008: 일정 목록에서 반복 일정이면서 알림 설정된 경우 Repeat 및 Notification 아이콘이 정렬되고 색상 구분이 되는지 확인', async () => {
      // Given: 반복 일정이면서 알림도 설정된 상태
      const mockEvents: Event[] = [
        {
          id: '8',
          title: '목록 반복 알림',
          date: '2024-11-22',
          startTime: '15:00',
          endTime: '16:00',
          description: '',
          location: '',
          category: '',
          repeat: { type: 'weekly', interval: 1, endDate: '2024-12-31' },
          notificationTime: 10,
        },
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        })
      );

      // When: App 컴포넌트를 렌더링하고 일정 목록 확인
      setup(<App />);

      const eventList = await screen.findByTestId('event-list');

      // Then: 반복 아이콘과 알림 아이콘이 모두 표시됨
      const repeatIcon = await within(eventList).findByLabelText('Repeat icon');
      expect(repeatIcon).toBeInTheDocument();

      const notificationIcon = await within(eventList).findByLabelText('Notifications icon');
      expect(notificationIcon).toBeInTheDocument();

      // 색상 구분 확인 (Repeat: primary, Notifications: error)
      // Material-UI의 color prop은 클래스로 적용되므로 클래스 확인
      expect(repeatIcon).toHaveClass('MuiSvgIcon-colorPrimary');
      expect(notificationIcon).toHaveClass('MuiSvgIcon-colorError');
    });

    it('TC009: 일정 목록에서 반복 일정이 아닌 경우 Repeat 아이콘이 표시되지 않는지 확인', async () => {
      // Given: 반복이 아닌 일정
      const mockEvents: Event[] = [
        {
          id: '9',
          title: '일반 목록 일정',
          date: '2024-11-23',
          startTime: '11:00',
          endTime: '12:00',
          description: '',
          location: '',
          category: '',
          repeat: { type: 'none', interval: 0 },
          notificationTime: 0,
        },
      ];

      server.use(
        http.get('/api/events', () => {
          return HttpResponse.json({ events: mockEvents });
        })
      );

      // When: App 컴포넌트를 렌더링하고 일정 목록 확인
      setup(<App />);

      const eventList = await screen.findByTestId('event-list');
      await within(eventList).findByText('일반 목록 일정');

      // Then: 반복 아이콘이 표시되지 않음
      const repeatIcons = within(eventList).queryAllByLabelText('Repeat icon');
      expect(repeatIcons).toHaveLength(0);
    });
  });
});
