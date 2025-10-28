# Prompt 관리 시스템

## 📁 구조

```
agents/
├── prompts/
│   ├── red-phase.md      # TDD RED 단계 프롬프트
│   ├── green-phase.md    # TDD GREEN 단계 프롬프트
│   └── refactor-phase.md # TDD REFACTOR 단계 프롬프트
├── promptLoader.ts       # 프롬프트 로딩 유틸리티
└── orchestrator.ts       # 오케스트레이터 (프롬프트 사용)
```

## 🎯 장점

### 1. **유지보수성 향상**

- 프롬프트를 코드와 분리하여 관리
- Markdown 형식으로 읽기 쉬움
- 버전 관리 용이

### 2. **재사용성**

- 여러 곳에서 동일한 프롬프트 사용 가능
- 템플릿 변수로 커스터마이징

### 3. **협업 효율성**

- 개발자가 아닌 사람도 프롬프트 수정 가능
- 변경 사항 추적 쉬움

## 📝 사용 방법

### 기본 사용

```typescript
import { loadPrompt } from './promptLoader';

// 프롬프트 로드
const prompt = loadPrompt('red-phase.md');
console.log(prompt);
```

### 변수 치환

```typescript
import { generateRedPhasePrompt } from './promptLoader';

const prompt = generateRedPhasePrompt({
  requirement: '일정 제목에 접두사 제거',
  featureSpec: '기능 명세서 내용...',
  testDesign: '테스트 설계 내용...',
});

// Copilot에게 전달
console.log(prompt);
```

### Orchestrator에서 사용

```typescript
import { generateRedPhasePrompt, generateGreenPhasePrompt } from './promptLoader';

// RED 단계
const redPrompt = generateRedPhasePrompt({
  requirement: this.context.requirement,
  featureSpec: featureSpecMarkdown,
  testDesign: testDesignMarkdown,
});

// GREEN 단계
const greenPrompt = generateGreenPhasePrompt({
  requirement: this.context.requirement,
  featureSpec: featureSpecMarkdown,
  testCode: testCodeContent,
});
```

## 🔧 Orchestrator 리팩토링 예시

### Before (하드코딩)

```typescript
private generateCopilotTestWritingPrompt(featureSpec: string, testDesign: string): string {
  return `# TDD RED 단계: 테스트 코드 작성

## 요구사항
${this.context.requirement}

## 기능 명세서
${featureSpec}

## 테스트 설계
${testDesign}

위 기능 명세서와 테스트 설계를 기반으로 **실패하는 테스트 코드**를 작성해주세요.
...
`;
}
```

### After (파일 기반)

```typescript
import { generateRedPhasePrompt } from './promptLoader';

private generateCopilotTestWritingPrompt(featureSpec: string, testDesign: string): string {
  return generateRedPhasePrompt({
    requirement: this.context.requirement,
    featureSpec,
    testDesign
  });
}
```

## 📋 프롬프트 파일 수정

### red-phase.md 수정 예시

```markdown
# TDD RED 단계: 테스트 코드 작성 프롬프트

## System Context

당신은 TDD의 RED 단계를 담당하는 테스트 작성 전문가입니다.

## Your Role

...

## Template Variables

- `{{requirement}}`: 요구사항
- `{{featureSpec}}`: 기능 명세서 내용
- `{{testDesign}}`: 테스트 설계 내용
```

### 변수 치환

프롬프트 파일에서 `{{변수명}}`으로 정의하면 자동으로 치환됩니다:

```markdown
## 요구사항

{{requirement}}

## 기능 명세서

{{featureSpec}}
```

↓

```markdown
## 요구사항

일정 제목에 접두사 제거

## 기능 명세서

기능 명세서 내용...
```

## 🎨 커스터마이징

### 새 프롬프트 추가

1. `agents/prompts/` 폴더에 새 `.md` 파일 생성
2. `promptLoader.ts`에 헬퍼 함수 추가

```typescript
export function generateMyPhasePrompt(variables: { variable1: string; variable2: string }): string {
  return loadPrompt('my-phase.md', variables);
}
```

3. 사용

```typescript
const prompt = generateMyPhasePrompt({
  variable1: 'value1',
  variable2: 'value2',
});
```

## 🔄 마이그레이션 가이드

### 기존 하드코딩된 프롬프트 → 파일 기반

1. 프롬프트 내용을 `.md` 파일로 추출
2. 변수 부분을 `{{변수명}}` 형식으로 변경
3. `orchestrator.ts`에서 `loadPrompt()` 또는 헬퍼 함수 사용
4. 테스트하여 동작 확인

## 📚 참고

- 프롬프트 파일은 Markdown 형식
- 변수는 `{{변수명}}` 형식 사용
- System Prompt 섹션을 추출하려면 `loadAgentPrompt()` 사용
- 프롬프트 로더는 `__dirname` 기준으로 상대 경로 해석

## 🚀 다음 단계

1. `orchestrator.ts`의 기존 프롬프트 메서드들을 리팩토링
2. 프롬프트 버전 관리 시스템 추가 (선택)
3. 프롬프트 A/B 테스트 기능 추가 (선택)
