/**
 * Agent Orchestrator Type Definitions
 *
 * AI 에이전트 오케스트레이션 시스템의 타입 정의
 */

/**
 * 에이전트 타입
 */
export type AgentType =
  | 'feature-selector'
  | 'test-designer'
  | 'test-writer'
  | 'test-validator'
  | 'refactoring';

/**
 * 에이전트 실행 상태
 */
export type AgentStatus =
  | 'pending' // 대기 중
  | 'running' // 실행 중
  | 'completed' // 완료
  | 'failed' // 실패
  | 'skipped'; // 건너뜀

/**
 * 에이전트 실행 결과
 */
export interface AgentResult<T = unknown> {
  agentType: AgentType;
  status: AgentStatus;
  data?: T;
  error?: string;
  duration: number; // ms
  timestamp: Date;
}

/**
 * Feature Selector 출력
 */
export interface FeatureSelectorOutput {
  features: Feature[];
  dependencies: Dependency[];
  recommendation: string;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
  acceptanceCriteria: string[];
  implementationLocation?: string;
  affectedFiles?: string[];
}

export interface Dependency {
  featureId: string;
  dependsOn: string[];
  reason: string;
}

/**
 * Test Designer 출력
 */
export interface TestDesignerOutput {
  testStrategy: TestStrategy;
  testCases: TestCase[];
  testPyramid: TestPyramid;
}

export interface TestStrategy {
  approach: string;
  focusAreas: string[];
  riskAreas: string[];
  estimatedCoverage: number;
}

export interface TestCase {
  id: string;
  featureId: string;
  type: 'unit' | 'integration' | 'e2e';
  description: string;
  given: string;
  when: string;
  then: string;
  priority: 'must' | 'should' | 'nice-to-have';
  edgeCases: EdgeCase[];
}

export interface EdgeCase {
  scenario: string;
  expectedBehavior: string;
}

export interface TestPyramid {
  unit: number;
  integration: number;
  e2e: number;
  rationale: string;
}

export interface TestFile {
  path: string;
  content: string;
  testCount: number;
  dependencies: string[];
  coveredScenarios?: string[];
}

export interface ReadinessCheck {
  allTestsWritten: boolean;
  syntaxValid: boolean;
  importsCorrect: boolean;
  readyForImplementation: boolean;
  issues: Issue[];
}

export interface Issue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  testId?: string;
  suggestion: string;
}

export interface ImplementationFile {
  path: string;
  content: string;
  implementedFunctions: string[];
  complexity: ComplexityMetrics;
}

export interface TestExecutionResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  passRate: number;
  failedTests: FailedTest[];
  successfulTests: SuccessfulTest[];
}

export interface FailedTest {
  testId: string;
  testName: string;
  error: string;
  stackTrace: string;
  attemptCount: number;
  suggestion: string;
}

export interface SuccessfulTest {
  testId: string;
  testName: string;
  duration: number;
}

export interface CoverageReport {
  overall: CoverageMetrics;
  byFile: FileCoverage[];
  uncoveredAreas: UncoveredArea[];
}

export interface CoverageMetrics {
  lines: number;
  branches: number;
  functions: number;
  statements: number;
}

export interface FileCoverage {
  path: string;
  metrics: CoverageMetrics;
  uncoveredLines: number[];
}

export interface UncoveredArea {
  file: string;
  lines: number[];
  reason: string;
  needsTest: boolean;
}

export interface GreenStatus {
  allTestsPassed: boolean;
  coverageMetTarget: boolean;
  targetCoverage: number;
  actualCoverage: number;
  readyForRefactoring: boolean;
  blockers: string[];
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
}

/**
 * Refactoring 출력
 */
export interface RefactoringOutput {
  analysis: CodeAnalysis;
  refactoredFiles: RefactoredFile[];
  improvements: Improvement[];
  validationResult: ValidationResult;
  recommendations: Recommendation[];
}

export interface CodeAnalysis {
  codeSmells: CodeSmell[];
  complexity: ComplexityMetrics;
  duplications: Duplication[];
  securityIssues: SecurityIssue[];
  performanceBottlenecks: PerformanceIssue[];
}

export interface CodeSmell {
  type: string;
  location: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
}

export interface Duplication {
  file1: string;
  file2: string;
  lines: number;
  suggestion: string;
}

export interface SecurityIssue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: string;
  description: string;
  fix: string;
}

export interface PerformanceIssue {
  type: string;
  location: string;
  impact: 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface RefactoredFile {
  path: string;
  originalContent: string;
  refactoredContent: string;
  changes: Change[];
}

export interface Change {
  type: 'extract_method' | 'rename' | 'remove_duplication' | 'simplify' | 'optimize';
  description: string;
  linesChanged: number[];
  rationale: string;
}

export interface Improvement {
  category: string;
  before: string;
  after: string;
  benefit: string;
  metrics?: {
    complexityReduction?: number;
    performanceGain?: string;
  };
}

export interface ValidationResult {
  allTestsPassed: boolean;
  coverageMaintained: boolean;
  newIssues: Issue[];
  regressionDetected: boolean;
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'small' | 'medium' | 'large';
  impact: string;
}

/**
 * 워크플로우 설정
 */
export interface WorkflowConfig {
  name: string;
  description: string;
  agents: AgentConfig[];
  options: WorkflowOptions;
}

export interface AgentConfig {
  type: AgentType;
  enabled: boolean;
  timeout?: number; // ms
  retries?: number;
  continueOnError?: boolean;
}

export interface WorkflowOptions {
  parallel?: boolean;
  stopOnError?: boolean;
  saveIntermediateResults?: boolean;
  outputDir?: string;
}

/**
 * 워크플로우 실행 컨텍스트
 */
export interface WorkflowContext {
  workflowId: string;
  requirement: string;
  startTime: Date;
  currentAgent?: AgentType;
  results: Map<AgentType, AgentResult>;
  errors: WorkflowError[];
}

export interface WorkflowError {
  agentType: AgentType;
  error: string;
  timestamp: Date;
  recoverable: boolean;
}

/**
 * 워크플로우 최종 결과
 */
export interface WorkflowResult {
  workflowId: string;
  status: 'success' | 'partial' | 'failed';
  duration: number;
  completedAgents: AgentType[];
  failedAgents: AgentType[];
  results: Record<AgentType, AgentResult>;
  summary: string;
}
