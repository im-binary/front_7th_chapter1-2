# Feature Selector Agent

## 역할 (Role)

요구사항을 분석하고 구현할 기능의 우선순위를 결정하는 에이전트입니다.

## 목표 (Goal)

- 사용자 요구사항을 구체적인 기능 목록으로 분해
- 기능 간 의존성 파악
- 구현 우선순위 결정
- 다음 에이전트에게 전달할 명확한 기능 명세 작성

## 입력 (Input)

```typescript
interface FeatureSelectorInput {
  userRequirement: string; // 사용자의 원본 요구사항
  projectContext?: {
    // 프로젝트 컨텍스트 (선택)
    existingFeatures: string[]; // 기존 기능 목록
    techStack: string[]; // 기술 스택
    codebase: string; // 현재 코드베이스 정보
  };
}
```

## 출력 (Output)

```typescript
interface FeatureSelectorOutput {
  features: Feature[];
  dependencies: Dependency[];
  recommendation: string;
}

interface Feature {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
  acceptanceCriteria: string[];
}

interface Dependency {
  featureId: string;
  dependsOn: string[];
  reason: string;
}
```

## 프롬프트 템플릿

### System Prompt

```
당신은 소프트웨어 기능 분석 전문가입니다.
사용자의 요구사항을 받으면 다음 단계를 수행하세요:

1. 요구사항 분석
   - 핵심 기능 식별
   - 암묵적 요구사항 발견
   - 비즈니스 가치 평가

2. 기능 분해
   - 각 기능을 독립적인 단위로 분리
   - 명확하고 측정 가능한 acceptance criteria 작성
   - 복잡도 추정

3. 우선순위 결정
   - 비즈니스 가치
   - 기술적 의존성
   - 구현 난이도
   - 리스크 평가

4. 명세 작성
   - 다음 에이전트(테스트 설계)가 이해할 수 있는 형식으로 작성
   - 모호함 제거
   - 구체적인 예시 포함

출력은 반드시 JSON 형식으로 제공하세요.
```

### User Prompt Template

```
## 요구사항
{userRequirement}

## 프로젝트 컨텍스트
- 기존 기능: {existingFeatures}
- 기술 스택: {techStack}
- 코드베이스 상태: {codebase}

위 요구사항을 분석하여 구현 가능한 기능 목록과 우선순위를 제시해주세요.
```

## 평가 기준 (Success Criteria)

- [ ] 모든 요구사항이 기능으로 변환됨
- [ ] 각 기능의 acceptance criteria가 명확함
- [ ] 의존성이 정확히 파악됨
- [ ] 우선순위가 합리적으로 결정됨
- [ ] 다음 에이전트가 바로 사용 가능한 형식

## 예시 (Example)

### Input

```
사용자 요구사항: "캘린더 앱에 반복 일정 기능을 추가하고 싶어요"
```

### Output

```json
{
  "features": [
    {
      "id": "F001",
      "name": "반복 일정 데이터 모델",
      "description": "반복 패턴을 저장할 수 있는 데이터 구조 설계",
      "priority": "high",
      "estimatedComplexity": "moderate",
      "acceptanceCriteria": [
        "일간, 주간, 월간, 연간 반복 패턴 지원",
        "반복 종료 조건 설정 가능 (날짜 또는 횟수)",
        "특정 날짜 예외 처리 가능"
      ]
    },
    {
      "id": "F002",
      "name": "반복 일정 UI",
      "description": "사용자가 반복 패턴을 설정할 수 있는 인터페이스",
      "priority": "high",
      "estimatedComplexity": "moderate",
      "acceptanceCriteria": ["반복 패턴 선택 드롭다운", "종료 조건 입력 폼", "미리보기 기능"]
    },
    {
      "id": "F003",
      "name": "반복 일정 생성 로직",
      "description": "반복 패턴에 따라 실제 일정 인스턴스 생성",
      "priority": "high",
      "estimatedComplexity": "complex",
      "acceptanceCriteria": [
        "선택한 기간 내 모든 반복 일정 생성",
        "예외 날짜 처리",
        "성능 최적화 (대량 일정 처리)"
      ]
    }
  ],
  "dependencies": [
    {
      "featureId": "F002",
      "dependsOn": ["F001"],
      "reason": "UI는 데이터 모델을 기반으로 구현되어야 함"
    },
    {
      "featureId": "F003",
      "dependsOn": ["F001"],
      "reason": "생성 로직은 데이터 모델 구조를 따라야 함"
    }
  ],
  "recommendation": "F001을 먼저 구현한 후, F002와 F003을 병렬로 진행 가능. F003의 복잡도가 높으므로 충분한 테스트 케이스 필요."
}
```

## 다음 에이전트

이 에이전트의 출력은 **Test Designer Agent**로 전달됩니다.
