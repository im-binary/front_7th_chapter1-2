# 예시: 간단한 기능 추가

## 요구사항

```
일정 생성 시 자동으로 제목 앞에 '[새 일정]' 접두사를 추가해주세요.
```

## 실행 방법

```bash
pnpm agent:run -r "일정 생성 시 자동으로 제목 앞에 '[새 일정]' 접두사를 추가해주세요"
```

## 예상되는 실행 흐름

### 1️⃣ Feature Selector (기능 선택 에이전트)

**분석 결과:**

- 핵심 기능: 일정 제목 자동 접두사 추가
- 난이도: Easy
- 영향 범위:
  - `src/utils/eventUtils.ts` (유틸리티 함수 추가)
  - `src/hooks/useEventOperations.ts` (통합)

### 2️⃣ Test Designer (테스트 설계 에이전트)

**테스트 케이스 설계:**

**Unit Tests (src/**tests**/unit/easy.eventPrefix.spec.ts):**

- ✅ 빈 문자열 처리
- ✅ 일반 제목 접두사 추가
- ✅ 이미 접두사가 있는 경우 중복 방지
- ✅ 공백 처리
- ✅ 특수문자 포함 제목

**Integration Tests (src/**tests**/hooks/medium.useEventOperations.spec.ts):**

- ✅ 새 일정 생성 시 접두사 자동 추가 확인
- ✅ 일정 수정 시 접두사 유지
- ✅ 기존 일정은 영향 없음

### 3️⃣ Test Writer (테스트 작성 에이전트)

**생성되는 파일:**

```typescript
// src/__tests__/unit/easy.eventPrefix.spec.ts
import { describe, test, expect } from 'vitest';
import { addEventPrefix } from '@/utils/eventUtils';

describe('addEventPrefix', () => {
  test('빈 문자열에 접두사 추가', () => {
    expect(addEventPrefix('')).toBe('[새 일정] ');
  });

  test('일반 제목에 접두사 추가', () => {
    expect(addEventPrefix('회의')).toBe('[새 일정] 회의');
  });

  test('이미 접두사가 있으면 중복하지 않음', () => {
    expect(addEventPrefix('[새 일정] 회의')).toBe('[새 일정] 회의');
  });

  // ... 더 많은 테스트 케이스
});
```

**실행 결과:** 🔴 RED - 테스트 실패 (함수 미구현)

### 4️⃣ Test Validator (검증 에이전트)

**구현 코드:**

```typescript
// src/utils/eventUtils.ts
export const EVENT_NEW_PREFIX = '[새 일정]';

/**
 * 일정 제목에 접두사 추가
 */
export const addEventPrefix = (title: string): string => {
  if (title.startsWith(EVENT_NEW_PREFIX)) {
    return title;
  }
  return `${EVENT_NEW_PREFIX} ${title}`;
};
```

```typescript
// src/hooks/useEventOperations.ts
import { addEventPrefix } from '@/utils/eventUtils';

// saveEvent 함수 내부
const newEventData = {
  ...eventData,
  title: addEventPrefix(eventData.title),
};
```

**실행 결과:** 🟢 GREEN - 모든 테스트 통과 (127/127 tests passed)

### 5️⃣ Refactoring (리팩토링 에이전트)

**개선 사항:**

- ✅ 상수 추출로 유지보수성 향상
- ✅ JSDoc 주석 추가로 가독성 개선
- ✅ 순수 함수로 구현하여 테스트 용이성 확보
- ✅ Edge case 처리 (빈 문자열, 중복 접두사)

**최종 결과:** ✨ REFACTOR - 코드 품질 개선 완료

---

## 생성되는 아티팩트

### 테스트 파일

- `src/__tests__/unit/easy.eventPrefix.spec.ts` (새로 생성)
- `src/__tests__/hooks/medium.useEventOperations.spec.ts` (수정)

### 구현 파일

- `src/utils/eventUtils.ts` (수정)
- `src/hooks/useEventOperations.ts` (수정)

### 결과 파일 (agents/output/)

- `feature-selection.json`
- `test-design.json`
- `test-code.json`
- `implementation.json`
- `refactoring.json`

---

## 예상 소요 시간

- Feature Selector: ~30초
- Test Designer: ~45초
- Test Writer: ~60초
- Test Validator: ~90초
- Refactoring: ~60초

**총 예상 시간: 약 5분**

---

## 실제 테스트 해보기

```bash
# 1. 에이전트 실행
pnpm agent:run -r "일정 생성 시 자동으로 제목 앞에 '[새 일정]' 접두사를 추가해주세요"

# 2. 테스트 확인
pnpm test

# 3. 결과 파일 확인
ls -la agents/output/
```

---

## 참고사항

- 현재는 시뮬레이션 모드로 실행됩니다 (LLM API 미연결)
- 실제 LLM 연동 시 더 정교한 분석과 구현이 가능합니다
- 각 단계의 결과는 `agents/output/` 디렉토리에 저장됩니다
