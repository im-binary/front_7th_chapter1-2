/**
 * Agent Orchestrator
 *
 * AI 에이전트들을 조율하여 TDD 워크플로우를 자동으로 실행합니다.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  AgentType,
  AgentStatus,
  AgentResult,
  WorkflowConfig,
  WorkflowContext,
  WorkflowResult,
  WorkflowError,
  FeatureSelectorOutput,
  TestDesignerOutput,
  TestWriterOutput,
  TestValidatorOutput,
  RefactoringOutput,
} from './types';

/**
 * 에이전트 오케스트레이터 클래스
 */
export class AgentOrchestrator {
  private config: WorkflowConfig;
  private context: WorkflowContext;

  constructor(configPath: string = './agents/workflow.json') {
    this.config = this.loadConfig(configPath);
    this.context = this.initContext();
  }

  /**
   * 워크플로우 설정 로드
   */
  private loadConfig(configPath: string): WorkflowConfig {
    const fullPath = path.resolve(process.cwd(), configPath);
    const configData = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(configData) as WorkflowConfig;
  }

  /**
   * 워크플로우 컨텍스트 초기화
   */
  private initContext(): WorkflowContext {
    return {
      workflowId: `workflow-${Date.now()}`,
      requirement: '',
      startTime: new Date(),
      results: new Map(),
      errors: [],
    };
  }

  /**
   * 워크플로우 실행
   */
  async execute(requirement: string): Promise<WorkflowResult> {
    console.log('🚀 Agent Orchestrator 시작');
    console.log(`📝 요구사항: ${requirement}\n`);

    this.context.requirement = requirement;
    const startTime = Date.now();

    const completedAgents: AgentType[] = [];
    const failedAgents: AgentType[] = [];

    // 활성화된 에이전트만 필터링
    const enabledAgents = this.config.agents.filter((agent) => agent.enabled);

    for (const agentConfig of enabledAgents) {
      const agentType = agentConfig.type;
      this.context.currentAgent = agentType;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`🤖 ${this.getAgentEmoji(agentType)} ${this.getAgentName(agentType)} 실행 중...`);
      console.log(`${'='.repeat(60)}`);

      try {
        const result = await this.executeAgent(agentType, agentConfig);

        if (result.status === 'completed') {
          completedAgents.push(agentType);
          this.context.results.set(agentType, result);
          console.log(`✅ ${this.getAgentName(agentType)} 완료 (${result.duration}ms)`);
        } else if (result.status === 'failed') {
          failedAgents.push(agentType);
          this.context.errors.push({
            agentType,
            error: result.error || 'Unknown error',
            timestamp: new Date(),
            recoverable: agentConfig.continueOnError || false,
          });

          if (!agentConfig.continueOnError && this.config.options.stopOnError) {
            console.log(`❌ ${this.getAgentName(agentType)} 실패 - 워크플로우 중단`);
            break;
          }

          console.log(`⚠️ ${this.getAgentName(agentType)} 실패 - 계속 진행`);
        }

        // 중간 결과 저장
        if (this.config.options.saveIntermediateResults) {
          await this.saveIntermediateResult(agentType, result);
        }
      } catch (error) {
        console.error(`💥 ${this.getAgentName(agentType)} 예외 발생:`, error);
        failedAgents.push(agentType);

        if (this.config.options.stopOnError) {
          break;
        }
      }
    }

    const duration = Date.now() - startTime;
    const status = this.determineWorkflowStatus(completedAgents, failedAgents);

    const result: WorkflowResult = {
      workflowId: this.context.workflowId,
      status,
      duration,
      completedAgents,
      failedAgents,
      results: Object.fromEntries(this.context.results) as Record<AgentType, AgentResult>,
      summary: this.generateSummary(completedAgents, failedAgents, duration),
    };

    this.printFinalReport(result);

    return result;
  }

  /**
   * 개별 에이전트 실행
   */
  private async executeAgent(
    agentType: AgentType,
    config: { timeout?: number; retries?: number }
  ): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // 이전 에이전트의 결과를 현재 에이전트의 입력으로 사용
      const previousResults = this.getPreviousResults(agentType);

      let data: unknown;

      switch (agentType) {
        case 'feature-selector':
          data = await this.runFeatureSelector(this.context.requirement);
          break;

        case 'test-designer':
          data = await this.runTestDesigner(previousResults['feature-selector']);
          break;

        case 'test-writer':
          data = await this.runTestWriter(previousResults['test-designer']);
          break;

        case 'test-validator':
          data = await this.runTestValidator(previousResults['test-writer']);
          break;

        case 'refactoring':
          data = await this.runRefactoring(previousResults['test-validator']);
          break;

        default:
          throw new Error(`Unknown agent type: ${agentType}`);
      }

      return {
        agentType,
        status: 'completed',
        data,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        agentType,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 이전 에이전트 결과 가져오기
   */
  private getPreviousResults(currentAgent: AgentType): Record<string, unknown> {
    const results: Record<string, unknown> = {};

    for (const [agentType, result] of this.context.results.entries()) {
      if (result.status === 'completed' && result.data) {
        results[agentType] = result.data;
      }
    }

    return results;
  }

  /**
   * Feature Selector 실행
   */
  private async runFeatureSelector(requirement: string): Promise<FeatureSelectorOutput> {
    console.log('📋 요구사항 분석 중...');

    // 실제 구현에서는 LLM API 호출
    // 현재는 시뮬레이션
    return {
      features: [
        {
          id: 'F001',
          name: '예시 기능',
          description: requirement,
          priority: 'high',
          estimatedComplexity: 'simple',
          acceptanceCriteria: ['구현 완료', '테스트 통과'],
        },
      ],
      dependencies: [],
      recommendation: '순차적으로 구현',
    };
  }

  /**
   * Test Designer 실행
   */
  private async runTestDesigner(featureOutput: unknown): Promise<TestDesignerOutput> {
    console.log('🧪 테스트 케이스 설계 중...');

    return {
      testStrategy: {
        approach: 'TDD 방식',
        focusAreas: ['핵심 로직'],
        riskAreas: ['엣지 케이스'],
        estimatedCoverage: 90,
      },
      testCases: [],
      testPyramid: {
        unit: 5,
        integration: 2,
        e2e: 1,
        rationale: '단위 테스트 중심',
      },
    };
  }

  /**
   * Test Writer 실행
   */
  private async runTestWriter(testDesignOutput: unknown): Promise<TestWriterOutput> {
    console.log('📝 테스트 코드 작성 중...');

    return {
      testFiles: [],
      implementationGuidelines: [],
      readinessCheck: {
        allTestsWritten: true,
        syntaxValid: true,
        importsCorrect: true,
        readyForImplementation: true,
        issues: [],
      },
    };
  }

  /**
   * Test Validator 실행
   */
  private async runTestValidator(testWriterOutput: unknown): Promise<TestValidatorOutput> {
    console.log('🟢 구현 및 테스트 검증 중...');

    return {
      implementationFiles: [],
      testResults: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        passRate: 100,
        failedTests: [],
        successfulTests: [],
      },
      coverage: {
        overall: {
          lines: 90,
          branches: 85,
          functions: 100,
          statements: 90,
        },
        byFile: [],
        uncoveredAreas: [],
      },
      greenStatus: {
        allTestsPassed: true,
        coverageMetTarget: true,
        targetCoverage: 85,
        actualCoverage: 90,
        readyForRefactoring: true,
        blockers: [],
      },
      nextSteps: ['리팩토링 진행'],
    };
  }

  /**
   * Refactoring 실행
   */
  private async runRefactoring(testValidatorOutput: unknown): Promise<RefactoringOutput> {
    console.log('🔵 코드 리팩토링 중...');

    return {
      analysis: {
        codeSmells: [],
        complexity: {
          cyclomaticComplexity: 2,
          cognitiveComplexity: 3,
          linesOfCode: 50,
        },
        duplications: [],
        securityIssues: [],
        performanceBottlenecks: [],
      },
      refactoredFiles: [],
      improvements: [],
      validationResult: {
        allTestsPassed: true,
        coverageMaintained: true,
        newIssues: [],
        regressionDetected: false,
      },
      recommendations: [],
    };
  }

  /**
   * 중간 결과 저장
   */
  private async saveIntermediateResult(agentType: AgentType, result: AgentResult): Promise<void> {
    const outputDir = this.config.options.outputDir || './agents/output';
    const fullPath = path.resolve(process.cwd(), outputDir);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    const filename = `${this.context.workflowId}_${agentType}_${Date.now()}.json`;
    const filepath = path.join(fullPath, filename);

    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
  }

  /**
   * 워크플로우 상태 결정
   */
  private determineWorkflowStatus(
    completed: AgentType[],
    failed: AgentType[]
  ): 'success' | 'partial' | 'failed' {
    if (failed.length === 0) {
      return 'success';
    }

    if (completed.length > 0) {
      return 'partial';
    }

    return 'failed';
  }

  /**
   * 요약 생성
   */
  private generateSummary(completed: AgentType[], failed: AgentType[], duration: number): string {
    const total = completed.length + failed.length;
    const successRate = ((completed.length / total) * 100).toFixed(1);

    return `
워크플로우 완료: ${completed.length}/${total} 에이전트 성공 (${successRate}%)
소요 시간: ${(duration / 1000).toFixed(2)}초
완료: ${completed.map((a) => this.getAgentName(a)).join(', ')}
${failed.length > 0 ? `실패: ${failed.map((a) => this.getAgentName(a)).join(', ')}` : ''}
    `.trim();
  }

  /**
   * 최종 리포트 출력
   */
  private printFinalReport(result: WorkflowResult): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 최종 리포트');
    console.log(`${'='.repeat(60)}`);
    console.log(`워크플로우 ID: ${result.workflowId}`);
    console.log(`상태: ${this.getStatusEmoji(result.status)} ${result.status.toUpperCase()}`);
    console.log(`\n${result.summary}`);
    console.log(`${'='.repeat(60)}\n`);
  }

  /**
   * 에이전트 이름 가져오기
   */
  private getAgentName(agentType: AgentType): string {
    const names: Record<AgentType, string> = {
      'feature-selector': 'Feature Selector',
      'test-designer': 'Test Designer',
      'test-writer': 'Test Writer',
      'test-validator': 'Test Validator',
      refactoring: 'Refactoring',
    };
    return names[agentType];
  }

  /**
   * 에이전트 이모지 가져오기
   */
  private getAgentEmoji(agentType: AgentType): string {
    const emojis: Record<AgentType, string> = {
      'feature-selector': '🎯',
      'test-designer': '🧪',
      'test-writer': '📝',
      'test-validator': '🟢',
      refactoring: '🔵',
    };
    return emojis[agentType];
  }

  /**
   * 상태 이모지 가져오기
   */
  private getStatusEmoji(status: string): string {
    const emojis: Record<string, string> = {
      success: '✅',
      partial: '⚠️',
      failed: '❌',
    };
    return emojis[status] || '❓';
  }
}

/**
 * 간편 실행 함수
 */
export async function runWorkflow(requirement: string): Promise<WorkflowResult> {
  const orchestrator = new AgentOrchestrator();
  return await orchestrator.execute(requirement);
}
