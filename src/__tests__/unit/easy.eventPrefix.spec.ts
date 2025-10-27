import { describe, expect, it } from 'vitest';

import { addEventPrefix } from '../../utils/eventUtils';

describe('addEventPrefix', () => {
  describe('기본 동작', () => {
    it('일반 제목에 접두사를 추가한다', () => {
      // Arrange
      const title = '팀 회의';

      // Act
      const result = addEventPrefix(title);

      // Assert
      expect(result).toBe('[추가합니다] 팀 회의');
    });

    it('빈 문자열에 접두사만 추가한다', () => {
      // Arrange
      const title = '';

      // Act
      const result = addEventPrefix(title);

      // Assert
      expect(result).toBe('[추가합니다] ');
    });
  });

  describe('중복 방지', () => {
    it('이미 접두사가 있으면 중복 추가하지 않는다', () => {
      // Arrange
      const title = '[추가합니다] 기존 일정';

      // Act
      const result = addEventPrefix(title);

      // Assert
      expect(result).toBe('[추가합니다] 기존 일정');
    });

    it('접두사가 있지만 공백이 없으면 공백을 추가한다', () => {
      // Arrange
      const title = '[추가합니다]기존 일정';

      // Act
      const result = addEventPrefix(title);

      // Assert
      expect(result).toBe('[추가합니다] 기존 일정');
    });
  });

  describe('엣지 케이스', () => {
    it('앞뒤 공백을 제거하고 접두사를 추가한다', () => {
      // Arrange
      const title = '  회의  ';

      // Act
      const result = addEventPrefix(title);

      // Assert
      expect(result).toBe('[추가합니다] 회의');
    });

    it('특수문자가 포함된 제목을 처리한다', () => {
      // Arrange
      const title = '💡 아이디어 회의';

      // Act
      const result = addEventPrefix(title);

      // Assert
      expect(result).toBe('[추가합니다] 💡 아이디어 회의');
    });

    it('한글, 영문, 숫자가 섞인 제목을 처리한다', () => {
      // Arrange
      const title = 'Q1 2025 전략회의';

      // Act
      const result = addEventPrefix(title);

      // Assert
      expect(result).toBe('[추가합니다] Q1 2025 전략회의');
    });
  });

  describe('불변성', () => {
    it('원본 문자열을 변경하지 않는다', () => {
      // Arrange
      const title = '원본 제목';
      const originalTitle = title;

      // Act
      addEventPrefix(title);

      // Assert
      expect(title).toBe(originalTitle);
    });
  });
});
