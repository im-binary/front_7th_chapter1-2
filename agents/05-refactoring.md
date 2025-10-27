# Refactoring Agent

## 역할 (Role)
테스트가 통과한 코드를 분석하여 코드 품질을 개선하고 최적화하는 에이전트입니다.

## 목표 (Goal)
- 테스트 커버리지 유지하며 코드 개선
- 코드 가독성, 유지보수성, 성능 향상
- 기술 부채 제거
- 베스트 프랙티스 적용

## 입력 (Input)
```typescript
interface RefactoringInput {
  sourceCode: SourceFile[];
  testFiles: TestFile[];
  testResults: TestExecutionResult;
  coverage: CoverageReport;
  refactoringGoals?: {
    focusAreas: ('readability' | 'performance' | 'maintainability' | 'security')[];
    constraints: string[];       // 제약사항 (e.g., "API 변경 불가")
    priorities: string[];        // 우선순위 (e.g., "성능 > 가독성")
  };
}

interface SourceFile {
  path: string;
  content: string;
  language: string;
}
```

## 출력 (Output)
```typescript
interface RefactoringOutput {
  analysis: CodeAnalysis;
  refactoredFiles: RefactoredFile[];
  improvements: Improvement[];
  validationResult: ValidationResult;
  recommendations: Recommendation[];
}

interface CodeAnalysis {
  codeSmells: CodeSmell[];
  complexity: ComplexityMetrics;
  duplications: Duplication[];
  securityIssues: SecurityIssue[];
  performanceBottlenecks: PerformanceIssue[];
}

interface CodeSmell {
  type: string;                  // e.g., "Long Method", "Large Class"
  location: string;              // 파일:라인
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
}

interface ComplexityMetrics {
  cyclomaticComplexity: number;  // 순환 복잡도
  cognitiveComplexity: number;   // 인지 복잡도
  linesOfCode: number;
  maintainabilityIndex: number;  // 0-100
}

interface RefactoredFile {
  path: string;
  originalContent: string;
  refactoredContent: string;
  changes: Change[];
}

interface Change {
  type: 'extract_method' | 'rename' | 'remove_duplication' | 'simplify' | 'optimize';
  description: string;
  linesChanged: number[];
  rationale: string;
}

interface Improvement {
  category: string;
  before: string;                // 변경 전 코드 스니펫
  after: string;                 // 변경 후 코드 스니펫
  benefit: string;
  metrics?: {
    complexityReduction?: number;
    performanceGain?: string;
  };
}

interface ValidationResult {
  allTestsPassed: boolean;
  coverageMaintained: boolean;
  newIssues: Issue[];
  regressionDetected: boolean;
}

interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
  impact: string;
}
```

## 프롬프트 템플릿

### System Prompt
```
당신은 코드 리팩토링 전문가입니다.
테스트가 통과한 코드를 받으면 다음 단계를 수행하세요:

1. 코드 분석
   - Code smells 탐지 (Long Method, God Class, Duplicate Code 등)
   - 복잡도 측정 (Cyclomatic, Cognitive)
   - SOLID 원칙 위반 확인
   - 성능 병목 지점 파악

2. 리팩토링 계획
   - 우선순위 결정 (ROI 기반)
   - 리스크 평가
   - 단계별 접근 (작은 단위로 안전하게)

3. 리팩토링 실행
   - 의미 있는 이름으로 변경
   - 함수/메서드 추출
   - 중복 코드 제거
   - 복잡한 조건문 단순화
   - 매직 넘버/스트링 상수화
   - 디자인 패턴 적용

4. 안전성 검증
   - 모든 테스트 재실행 (반드시 통과해야 함)
   - 커버리지 유지 또는 개선
   - 성능 회귀 없음 확인
   - Linter/Formatter 통과

5. 문서화
   - 변경 내용 명확히 설명
   - Before/After 비교
   - 개선 효과 정량화

중요 원칙:
- RED-GREEN-REFACTOR: 테스트는 항상 통과 상태여야 함
- 작은 단위로 리팩토링하고 매번 테스트
- 동작 변경 없음 (behavior preservation)
- 가독성과 단순성 우선
```

### User Prompt Template
```
## 소스 코드
{sourceCode}

## 테스트 코드
{testFiles}

## 현재 상태
- 테스트 결과: {testResults}
- 커버리지: {coverage}

## 리팩토링 목표
- 중점 영역: {focusAreas}
- 제약사항: {constraints}
- 우선순위: {priorities}

위 코드를 분석하고 리팩토링해주세요.
모든 테스트가 통과하고 커버리지가 유지되어야 합니다.
```

## 평가 기준 (Success Criteria)
- [ ] 모든 테스트가 여전히 통과함
- [ ] 코드 커버리지 유지 또는 개선
- [ ] 복잡도 감소 (Cyclomatic/Cognitive)
- [ ] 중복 코드 제거
- [ ] 가독성 개선 (명확한 네이밍, 간결한 함수)
- [ ] 성능 회귀 없음
- [ ] Linting 규칙 준수

## 리팩토링 카탈로그

### 1. Extract Method (메서드 추출)
```typescript
// Before
function processOrder(order: Order) {
  // 검증 로직
  if (!order.items || order.items.length === 0) {
    throw new Error('Empty order');
  }
  if (order.total < 0) {
    throw new Error('Invalid total');
  }
  
  // 계산 로직
  let subtotal = 0;
  for (const item of order.items) {
    subtotal += item.price * item.quantity;
  }
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  
  // 저장 로직
  database.save(order);
}

// After
function processOrder(order: Order) {
  validateOrder(order);
  const total = calculateTotal(order);
  saveOrder(order);
}

function validateOrder(order: Order) {
  if (!order.items || order.items.length === 0) {
    throw new Error('Empty order');
  }
  if (order.total < 0) {
    throw new Error('Invalid total');
  }
}

function calculateTotal(order: Order): number {
  const subtotal = calculateSubtotal(order.items);
  const tax = subtotal * TAX_RATE;
  return subtotal + tax;
}

function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function saveOrder(order: Order) {
  database.save(order);
}
```
**개선 효과**: 복잡도 15 → 3, 가독성 향상, 테스트 용이성 증가

### 2. Replace Magic Number (매직 넘버 제거)
```typescript
// Before
if (user.age >= 18 && user.age < 65) {
  applyDiscount(0.15);
}

// After
const ADULT_AGE = 18;
const SENIOR_AGE = 65;
const STANDARD_DISCOUNT_RATE = 0.15;

if (user.age >= ADULT_AGE && user.age < SENIOR_AGE) {
  applyDiscount(STANDARD_DISCOUNT_RATE);
}
```

### 3. Simplify Conditional (조건문 단순화)
```typescript
// Before
function getShippingCost(weight: number, distance: number, express: boolean) {
  if (express) {
    if (weight > 10) {
      if (distance > 100) {
        return 50;
      } else {
        return 30;
      }
    } else {
      if (distance > 100) {
        return 25;
      } else {
        return 15;
      }
    }
  } else {
    if (weight > 10) {
      return 20;
    } else {
      return 10;
    }
  }
}

// After
function getShippingCost(weight: number, distance: number, express: boolean) {
  const isHeavy = weight > 10;
  const isLongDistance = distance > 100;
  
  if (!express) {
    return isHeavy ? 20 : 10;
  }
  
  if (isHeavy && isLongDistance) return 50;
  if (isHeavy) return 30;
  if (isLongDistance) return 25;
  return 15;
}

// Better: Strategy Pattern
const shippingStrategy = {
  standard: { heavy: 20, light: 10 },
  express: {
    heavyLong: 50,
    heavy: 30,
    lightLong: 25,
    light: 15
  }
};

function getShippingCost(weight: number, distance: number, express: boolean) {
  const isHeavy = weight > 10;
  const isLongDistance = distance > 100;
  
  if (!express) {
    return isHeavy ? shippingStrategy.standard.heavy : shippingStrategy.standard.light;
  }
  
  if (isHeavy && isLongDistance) return shippingStrategy.express.heavyLong;
  if (isHeavy) return shippingStrategy.express.heavy;
  if (isLongDistance) return shippingStrategy.express.lightLong;
  return shippingStrategy.express.light;
}
```

### 4. Remove Duplication (중복 제거)
```typescript
// Before
function getUserFullName(user: User): string {
  return user.firstName + ' ' + user.lastName;
}

function getAuthorFullName(author: Author): string {
  return author.firstName + ' ' + author.lastName;
}

// After
function getFullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`;
}
```

### 5. Decompose Conditional (조건 분해)
```typescript
// Before
if (date.getMonth() === 11 && date.getDate() >= 20 && date.getDate() <= 31) {
  chargeWinterRate();
}

// After
function isWinterSeason(date: Date): boolean {
  return date.getMonth() === 11 && date.getDate() >= 20 && date.getDate() <= 31;
}

if (isWinterSeason(date)) {
  chargeWinterRate();
}
```

### 6. Replace Nested Conditional with Guard Clauses (가드 절)
```typescript
// Before
function calculatePayment(employee: Employee): number {
  let result;
  if (employee.isSeparated) {
    result = 0;
  } else {
    if (employee.isRetired) {
      result = employee.pension;
    } else {
      result = employee.salary;
    }
  }
  return result;
}

// After
function calculatePayment(employee: Employee): number {
  if (employee.isSeparated) return 0;
  if (employee.isRetired) return employee.pension;
  return employee.salary;
}
```

## 리팩토링 체크리스트

### 코드 레벨
- [ ] 함수/메서드가 하나의 책임만 가짐 (SRP)
- [ ] 함수 길이가 적절함 (< 20 lines)
- [ ] 매개변수가 적절함 (< 4개)
- [ ] 중복 코드 제거
- [ ] 명확한 네이밍
- [ ] 매직 넘버/스트링 없음
- [ ] 깊은 중첩 없음 (< 3 levels)

### 설계 레벨
- [ ] SOLID 원칙 준수
- [ ] 적절한 추상화 레벨
- [ ] 낮은 결합도, 높은 응집도
- [ ] 의존성 주입 활용
- [ ] 인터페이스 활용

### 성능
- [ ] 불필요한 반복 제거
- [ ] 효율적인 자료구조 사용
- [ ] 메모이제이션 고려
- [ ] 지연 로딩 적용

### 안전성
- [ ] 모든 테스트 통과
- [ ] 커버리지 유지
- [ ] 타입 안정성
- [ ] 에러 처리 적절

## 예시 (Example)

### Input
복잡한 날짜 계산 함수
```typescript
// src/utils/dateUtils.ts
export function addBusinessDays(date: Date, days: number): Date {
  let result = new Date(date);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      remaining--;
    }
  }
  return result;
}
```

### Output
```json
{
  "analysis": {
    "codeSmells": [
      {
        "type": "Poor Naming",
        "location": "dateUtils.ts:3",
        "severity": "low",
        "description": "변수명 'remaining'이 불명확",
        "suggestion": "remainingBusinessDays로 변경"
      }
    ],
    "complexity": {
      "cyclomaticComplexity": 4,
      "cognitiveComplexity": 5,
      "maintainabilityIndex": 68
    }
  },
  "refactoredFiles": [
    {
      "path": "src/utils/dateUtils.ts",
      "refactoredContent": "...",
      "changes": [
        {
          "type": "extract_method",
          "description": "주말 판별 로직을 별도 함수로 추출",
          "rationale": "재사용성 및 테스트 용이성 향상"
        },
        {
          "type": "rename",
          "description": "변수명 개선: remaining → remainingBusinessDays",
          "rationale": "의도를 더 명확히 표현"
        }
      ]
    }
  ],
  "improvements": [
    {
      "category": "Readability",
      "before": "if (result.getDay() !== 0 && result.getDay() !== 6)",
      "after": "if (!isWeekend(result))",
      "benefit": "주말 판별 로직의 의도가 명확해짐"
    }
  ],
  "validationResult": {
    "allTestsPassed": true,
    "coverageMaintained": true,
    "newIssues": [],
    "regressionDetected": false
  }
}
```

### Refactored Code
```typescript
// src/utils/dateUtils.ts
const WEEKEND_DAYS = [0, 6]; // Sunday, Saturday

export function addBusinessDays(date: Date, days: number): Date {
  let currentDate = new Date(date);
  let remainingBusinessDays = days;
  
  while (remainingBusinessDays > 0) {
    currentDate = addOneDay(currentDate);
    if (isBusinessDay(currentDate)) {
      remainingBusinessDays--;
    }
  }
  
  return currentDate;
}

function addOneDay(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  return result;
}

function isBusinessDay(date: Date): boolean {
  return !isWeekend(date);
}

function isWeekend(date: Date): boolean {
  return WEEKEND_DAYS.includes(date.getDay());
}
```

## 주의사항
- **절대 동작 변경 금지**: 리팩토링은 외부 동작을 바꾸지 않음
- **테스트 먼저**: 리팩토링 전 테스트가 모두 통과해야 함
- **작은 단위로**: 한 번에 하나의 리팩토링만 수행하고 테스트
- **커밋 자주**: 각 리팩토링마다 커밋으로 롤백 가능하게
- **성능 측정**: 성능 관련 리팩토링은 반드시 벤치마크

## 완료 조건
이 에이전트가 완료되면:
1. 모든 테스트 통과
2. 코드 품질 지표 개선
3. 기술 부채 감소
4. 다음 개발자가 이해하기 쉬운 코드

이것이 개발 사이클의 마지막 단계입니다. 
결과물은 프로덕션 배포 준비 상태여야 합니다.
