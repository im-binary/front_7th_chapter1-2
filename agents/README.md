# 🤖 Agent Orchestrator

AI 에이전트 팀이 협업하여 TDD 방식으로 기능을 개발하는 오케스트레이션 시스템입니다.

## 📋 개요

5개의 전문 AI 에이전트가 다음 순서로 작업을 진행합니다:

```
┌─────────────────────────────────────────────────────────────┐
│  🎯 Feature Selector → 🧪 Test Designer → 📝 Test Writer   │
│                   ↓                                          │
│            🟢 Test Validator → 🔵 Refactoring              │
└─────────────────────────────────────────────────────────────┘
```

### 1️⃣ Feature Selector (기능 선정)

- **역할**: 요구사항을 구체적인 기능으로 분해
- **입력**: 사용자 요구사항 (자연어)
- **출력**: 기능 명세, 우선순위, 의존성

### 2️⃣ Test Designer (테스트 설계)

- **역할**: 기능 명세를 바탕으로 테스트 케이스 설계
- **입력**: Feature Selector의 출력
- **출력**: 테스트 전략, 테스트 케이스 명세

### 3️⃣ Test Writer (테스트 작성 - RED)

- **역할**: 실패하는 테스트 코드 작성
- **입력**: Test Designer의 출력
- **출력**: 실행 가능한 테스트 코드 파일

### 4️⃣ Test Validator (구현 및 검증 - GREEN)

- **역할**: 테스트를 통과시키는 최소 구현
- **입력**: Test Writer의 출력
- **출력**: 구현 코드, 테스트 결과, 커버리지

### 5️⃣ Refactoring (리팩토링 - REFACTOR)

- **역할**: 코드 품질 개선 및 최적화
- **입력**: Test Validator의 출력
- **출력**: 리팩토링된 코드, 개선 리포트

## 🚀 빠른 시작

### 설치

```bash
# 의존성 설치
pnpm install
```

### 기본 사용

```bash
# CLI로 워크플로우 실행
pnpm agent:run -r "일정 제목에 '[추가합니다]' 접두사 추가"
```

### 프로그래밍 방식으로 사용

```typescript
import { runWorkflow } from './agents/orchestrator';

const result = await runWorkflow('일정 제목에 접두사 추가');

console.log(`상태: ${result.status}`);
console.log(
  `완료: ${result.completedAgents.length}/${
    result.completedAgents.length + result.failedAgents.length
  }`
);
```

## 📁 파일 구조

```
agents/
├── types.ts              # TypeScript 타입 정의
├── workflow.json         # 워크플로우 설정
├── orchestrator.ts       # 오케스트레이터 코어
├── cli.ts                # CLI 도구
├── README.md             # 이 파일
│
├── 01-feature-selector.md    # 에이전트 프롬프트 템플릿
├── 02-test-designer.md
├── 03-test-writer.md
├── 04-test-validator.md
├── 05-refactoring.md
│
└── output/               # 실행 결과 저장 (자동 생성)
    └── workflow-{timestamp}_*.json
```

## ⚙️ 설정

### workflow.json

```json
{
  "name": "TDD Feature Development Workflow",
  "agents": [
    {
      "type": "feature-selector",
      "enabled": true,
      "timeout": 60000,
      "retries": 2,
      "continueOnError": false
    }
    // ... 다른 에이전트
  ],
  "options": {
    "parallel": false,
    "stopOnError": true,
    "saveIntermediateResults": true,
    "outputDir": "./agents/output"
  }
}
```

### 설정 옵션

| 옵션                      | 설명                    | 기본값  |
| ------------------------- | ----------------------- | ------- |
| `enabled`                 | 에이전트 활성화 여부    | `true`  |
| `timeout`                 | 타임아웃 (ms)           | `60000` |
| `retries`                 | 재시도 횟수             | `2`     |
| `continueOnError`         | 에러 시 계속 진행       | `false` |
| `stopOnError`             | 에러 시 워크플로우 중단 | `true`  |
| `saveIntermediateResults` | 중간 결과 저장          | `true`  |

## 💡 사용 예시

### 예시 1: 간단한 기능

```bash
pnpm agent:run -r "버튼 클릭 시 카운터 증가"
```

**결과**:

```
🚀 Agent Orchestrator 시작
📝 요구사항: 버튼 클릭 시 카운터 증가

============================================================
🤖 🎯 Feature Selector 실행 중...
============================================================
📋 요구사항 분석 중...
✅ Feature Selector 완료 (1234ms)

============================================================
🤖 🧪 Test Designer 실행 중...
============================================================
🧪 테스트 케이스 설계 중...
✅ Test Designer 완료 (987ms)

... (이하 생략)

============================================================
📊 최종 리포트
============================================================
워크플로우 ID: workflow-1730012345678
상태: ✅ SUCCESS

워크플로우 완료: 5/5 에이전트 성공 (100.0%)
소요 시간: 12.34초
완료: Feature Selector, Test Designer, Test Writer, Test Validator, Refactoring
============================================================
```

### 예시 2: 복잡한 기능

```bash
pnpm agent:run -r "사용자 인증 시스템: 이메일 로그인, JWT 토큰, 비밀번호 암호화"
```

### 예시 3: 프로그래밍 방식

```typescript
import { AgentOrchestrator } from './agents/orchestrator';

const orchestrator = new AgentOrchestrator('./agents/custom-workflow.json');

const result = await orchestrator.execute('결제 시스템에 카카오페이 연동');

// 결과 처리
if (result.status === 'success') {
  console.log('✅ 모든 에이전트 완료');

  // 각 에이전트 결과 확인
  const features = result.results['feature-selector'].data;
  const testResults = result.results['test-validator'].data;

  console.log(`기능 수: ${features.features.length}`);
  console.log(`테스트 통과율: ${testResults.testResults.passRate}%`);
}
```

## 🔧 고급 사용법

### 특정 에이전트만 실행

`workflow.json`에서 특정 에이전트를 비활성화:

```json
{
  "agents": [
    { "type": "feature-selector", "enabled": true },
    { "type": "test-designer", "enabled": true },
    { "type": "test-writer", "enabled": true },
    { "type": "test-validator", "enabled": true },
    { "type": "refactoring", "enabled": false } // 리팩토링 건너뛰기
  ]
}
```

### 에러 처리 전략

```json
{
  "agents": [
    {
      "type": "refactoring",
      "continueOnError": true // 리팩토링 실패해도 워크플로우 완료로 처리
    }
  ],
  "options": {
    "stopOnError": false // 에러 발생 시에도 모든 에이전트 실행 시도
  }
}
```

### 중간 결과 확인

```bash
# 실행 후 output 폴더 확인
ls agents/output/

# 특정 에이전트 결과 보기
cat agents/output/workflow-1730012345678_feature-selector_1730012346000.json
```

## 🎯 실제 사용 사례

### 사례 1: 이번 프로젝트 (캘린더 앱)

**요구사항**: "일정 등록할 때 제목 앞에 '[추가합니다]' 텍스트 자동 추가"

**결과**:

- ✅ 8개 단위 테스트 작성
- ✅ 3개 통합 테스트 작성
- ✅ `addEventPrefix` 함수 구현
- ✅ `useEventOperations` Hook 통합
- ✅ 전체 126개 테스트 통과 (100%)

**소요 시간**: 약 5분 (수동 시뮬레이션 기준)

### 사례 2: 예상 사용 케이스

**요구사항**: "반복 일정 기능 추가"

**예상 결과**:

- Feature Selector: 7개 기능 명세 생성
- Test Designer: 25개 테스트 케이스 설계
- Test Writer: 4개 파일에 25개 테스트 작성
- Test Validator: 구현 완료, 92% 커버리지
- Refactoring: 복잡도 20% 감소

## 📊 성능 및 제약사항

### 성능

| 지표                 | 값     |
| -------------------- | ------ |
| 평균 실행 시간       | 5-15분 |
| 에이전트당 평균 시간 | 1-3분  |
| 최대 테스트 케이스   | ~50개  |

### 제약사항

1. **LLM API 필요**: 실제 AI 동작을 위해서는 LLM API 키 필요
2. **컨텍스트 크기**: 대규모 코드베이스는 여러 번 분할 실행 필요
3. **언어 지원**: 현재 TypeScript/JavaScript 최적화
4. **테스트 프레임워크**: Vitest, Jest 지원

## 🔜 로드맵

### v1.1 (예정)

- [ ] LLM API 통합 (OpenAI, Claude)
- [ ] 실시간 진행률 표시
- [ ] 웹 UI 대시보드

### v1.2 (예정)

- [ ] 병렬 실행 지원
- [ ] 커스텀 에이전트 추가 기능
- [ ] GitHub Actions 통합

### v2.0 (계획)

- [ ] 다국어 지원 (Python, Java 등)
- [ ] 에이전트 간 피드백 루프
- [ ] 자동 PR 생성 및 리뷰

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

MIT License

## 💬 문의

이슈나 질문은 GitHub Issues에 남겨주세요.

---

**Made with ❤️ by AI Agents Team**
