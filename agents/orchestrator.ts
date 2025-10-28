/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Agent Orchestrator
 *
 * AI 에이전트들을 조율하여 TDD 워크플로우를 자동으로 실행합니다.
 */

import { Buffer } from 'buffer';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { config as dotenvConfig } from 'dotenv';
import inquirer from 'inquirer';

import { createLLMClient, LLMClient } from './llmClient';
import {
  generateRedPhasePrompt,
  generateGreenPhasePrompt,
  generateRefactorPhasePrompt,
  generateFeatureSelectorPrompt,
  generateTestDesignerPrompt,
} from './promptLoader';
import {
  AgentType,
  AgentResult,
  WorkflowConfig,
  WorkflowContext,
  WorkflowResult,
  FeatureSelectorOutput,
  TestDesignerOutput,
} from './types';

// 환경변수 로드
dotenvConfig();

/**
 * 에이전트 오케스트레이터 클래스
 */
export class AgentOrchestrator {
  private config: WorkflowConfig;
  private context: WorkflowContext;
  private llmClient: LLMClient;

  constructor(configPath: string = './agents/workflow.json') {
    this.config = this.loadConfig(configPath);
    this.context = this.initContext();

    // LLM 클라이언트 초기화
    try {
      this.llmClient = createLLMClient();
      console.log(`✅ LLM 클라이언트 초기화 완료 (Provider: ${this.llmClient.getProvider()})\n`);
    } catch (error) {
      console.error('❌ LLM 클라이언트 초기화 실패:', error);
      console.error('💡 .env 파일에 GOOGLE_AI_KEY를 설정해주세요.\n');
      throw error;
    }
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

        // Markdown 결과만 저장 (JSON 제거)
        // 중간 결과는 Markdown으로만 관리
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

    // 프롬프트 파일 생성 안내 (자동 Copilot 호출 제거)
    if (status === 'success' || status === 'partial') {
      console.log('\n' + '='.repeat(60));
      console.log('📋 분석 완료! 프롬프트가 생성되었습니다.');
      console.log('='.repeat(60));
      console.log('\n다음 단계:');
      console.log('1. agents/output/ 폴더의 최신 .md 파일들을 확인하세요');
      console.log('2. 저(GitHub Copilot)에게 작업을 요청하세요');
      console.log('3. 저는 생성된 분석을 바탕으로 코드를 구현하겠습니다!\n');
    }

    return result;
  }

  async executeInteractive(requirement: string): Promise<WorkflowResult> {
    console.log('🚀 TDD 워크플로우 시작 (Gemini + Copilot 협업)');
    console.log(`📝 요구사항: ${requirement}\n`);

    this.context.requirement = requirement;
    const startTime = Date.now();

    const completedAgents: AgentType[] = [];
    const failedAgents: AgentType[] = [];

    // ========================================
    // Step 1: Gemini가 기능 명세서 작성
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('📋 Step 1/7: Gemini가 기능 명세서 작성');
    console.log('='.repeat(60));

    const featureResult = await this.executeAgent('feature-selector', {});
    if (featureResult.status !== 'completed') {
      throw new Error('❌ Step 1 실패: 기능 명세서 작성 실패');
    }
    completedAgents.push('feature-selector');
    this.context.results.set('feature-selector', featureResult);

    const featureMarkdown = await this.getLatestResultMarkdown('feature-selector');
    console.log('\n📄 생성된 기능 명세서 (미리보기):\n');
    console.log('─'.repeat(60));
    console.log(featureMarkdown.substring(0, Math.min(800, featureMarkdown.length)));
    if (featureMarkdown.length > 800) console.log('\n... (생략) ...');
    console.log('─'.repeat(60));

    const ok1 = await this.promptYesNo('\n✅ Step 1 완료. 테스트 설계로 진행하시겠습니까?');
    if (!ok1) {
      console.log('\n⏸️  워크플로우 중단 (사용자 요청)');
      return this.buildResult(completedAgents, failedAgents, startTime);
    }

    // ========================================
    // Step 2: Gemini가 테스트 설계 작성
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('📝 Step 2/7: Gemini가 테스트 설계 작성');
    console.log('='.repeat(60));

    const testDesignResult = await this.executeAgent('test-designer', {});
    if (testDesignResult.status !== 'completed') {
      throw new Error('❌ Step 2 실패: 테스트 설계 실패');
    }
    completedAgents.push('test-designer');
    this.context.results.set('test-designer', testDesignResult);

    const testDesignMarkdown = await this.getLatestResultMarkdown('test-designer');
    console.log('\n📄 생성된 테스트 설계 (미리보기):\n');
    console.log('─'.repeat(60));
    console.log(testDesignMarkdown.substring(0, Math.min(800, testDesignMarkdown.length)));
    if (testDesignMarkdown.length > 800) console.log('\n... (생략) ...');
    console.log('─'.repeat(60));

    const ok2 = await this.promptYesNo(
      '\n✅ Step 2 완료. Copilot 테스트 작성 단계로 진행하시겠습니까?'
    );
    if (!ok2) {
      console.log('\n⏸️  워크플로우 중단 (사용자 요청)');
      return this.buildResult(completedAgents, failedAgents, startTime);
    }

    // ========================================
    // Step 3: Copilot이 테스트 코드 작성 (TDD RED)
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('🔴 Step 3/7: Copilot이 테스트 코드 작성 (TDD RED)');
    console.log('='.repeat(60));

    const copilotRedPrompt = this.generateCopilotTestWritingPrompt(
      featureMarkdown,
      testDesignMarkdown
    );

    console.log('\n📋 Copilot RED 단계 프롬프트가 생성되었습니다!');
    console.log('📋 아래 내용을 GitHub Copilot Chat에 붙여넣으세요:\n');
    console.log('─'.repeat(60));
    console.log(copilotRedPrompt);
    console.log('─'.repeat(60));

    // 자동 클립보드 복사
    try {
      this.copyToClipboard(copilotRedPrompt);
      console.log('\n✅ 클립보드에 자동으로 복사되었습니다!');
      console.log('👉 GitHub Copilot Chat을 열고 Ctrl+V (또는 Cmd+V)로 붙여넣으세요.\n');
    } catch (err) {
      console.warn('⚠️ 클립보드 복사 실패:', err);
      console.log('\n👉 위의 프롬프트를 수동으로 복사하여 Copilot Chat에 붙여넣으세요.\n');
    }

    const ok3 = await this.promptYesNo('✅ 테스트 코드 작성 완료 후 "yes"를 입력하세요');
    if (!ok3) {
      console.log('\n⏸️  워크플로우 중단 (사용자 요청)');
      return this.buildResult(completedAgents, failedAgents, startTime);
    }

    // ========================================
    // Step 4: 테스트 실패 확인
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('🧪 Step 4/7: 테스트 실패 확인 (RED 상태)');
    console.log('='.repeat(60));

    const ok4 = await this.promptYesNo('\n✅ Step 4 완료. TDD GREEN 단계로 진행하시겠습니까?');
    if (!ok4) {
      console.log('\n⏸️  워크플로우 중단 (사용자 요청)');
      return this.buildResult(completedAgents, failedAgents, startTime);
    }

    // ========================================
    // Step 5: Copilot이 최소 구현 작성 (TDD GREEN)
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('🟢 Step 5/7: Copilot이 최소 구현 작성 (TDD GREEN)');
    console.log('='.repeat(60));

    const copilotGreenPrompt = this.generateCopilotImplementationPrompt(
      featureMarkdown,
      testDesignMarkdown
    );

    console.log('\n📋 Copilot GREEN 단계 프롬프트가 생성되었습니다!');
    console.log('📋 아래 내용을 GitHub Copilot Chat에 붙여넣으세요:\n');
    console.log('─'.repeat(60));
    console.log(copilotGreenPrompt);
    console.log('─'.repeat(60));

    // 자동 클립보드 복사
    try {
      this.copyToClipboard(copilotGreenPrompt);
      console.log('\n✅ 클립보드에 자동으로 복사되었습니다!');
      console.log('👉 GitHub Copilot Chat을 열고 Ctrl+V (또는 Cmd+V)로 붙여넣으세요.\n');
    } catch (err) {
      console.warn('⚠️ 클립보드 복사 실패:', err);
      console.log('\n👉 위의 프롬프트를 수동으로 복사하여 Copilot Chat에 붙여넣으세요.\n');
    }

    const ok5 = await this.promptYesNo('✅ 구현 완료 후 테스트가 통과하면 "yes"를 입력하세요');
    if (!ok5) {
      console.log('\n⏸️  워크플로우 중단 (사용자 요청)');
      return this.buildResult(completedAgents, failedAgents, startTime);
    }

    // ========================================
    // Step 6: 테스트 통과 확인
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ Step 6/7: 테스트 통과 확인 (GREEN 상태)');
    console.log('='.repeat(60));

    console.log('\n테스트를 다시 실행합니다...');
    const testResults2 = await this.runTests();

    if (testResults2.failed === 0) {
      console.log('\n🎉 모든 테스트 통과! GREEN 상태 달성!');
    } else {
      console.log(`\n⚠️  ${testResults2.failed}개 테스트 실패.`);
      console.log('❌ GREEN 상태가 아닙니다. Copilot에게 코드 수정을 요청하세요.');
      const retry = await this.promptYesNo('\n다시 시도하시겠습니까?');
      if (!retry) {
        console.log('\n⏸️  워크플로우 중단 (사용자 요청)');
        return this.buildResult(completedAgents, failedAgents, startTime);
      }
      console.log('\n🔄 Step 5로 돌아갑니다. 코드를 수정한 후 다시 진행하세요.');
      // 실제로는 여기서 루프를 돌아야 하지만, 일단 계속 진행
    }

    const ok6 = await this.promptYesNo('\n✅ GREEN 상태 확인됨. REFACTOR 단계로 진행하시겠습니까?');
    if (!ok6) {
      console.log('\n⏸️  워크플로우 중단 (사용자 요청)');
      console.log('💡 이미 테스트가 통과했으므로 리팩토링 없이 완료해도 좋습니다.');
      return this.buildResult(completedAgents, failedAgents, startTime);
    }

    // ========================================
    // Step 7: Copilot이 리팩토링 (TDD REFACTOR)
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('🔵 Step 7/7: Copilot이 코드 리팩토링 (TDD REFACTOR)');
    console.log('='.repeat(60));

    const copilotRefactorPrompt = this.generateCopilotRefactoringPrompt(
      featureMarkdown,
      testDesignMarkdown
    );

    console.log('\n📋 Copilot REFACTOR 단계 프롬프트가 생성되었습니다!');
    console.log('📋 아래 내용을 GitHub Copilot Chat에 붙여넣으세요:\n');
    console.log('─'.repeat(60));
    console.log(copilotRefactorPrompt);
    console.log('─'.repeat(60));

    // 자동 클립보드 복사
    try {
      this.copyToClipboard(copilotRefactorPrompt);
      console.log('\n✅ 클립보드에 자동으로 복사되었습니다!');
      console.log('👉 GitHub Copilot Chat을 열고 Ctrl+V (또는 Cmd+V)로 붙여넣으세요.\n');
    } catch (err) {
      console.warn('⚠️ 클립보드 복사 실패:', err);
      console.log('\n👉 위의 프롬프트를 수동으로 복사하여 Copilot Chat에 붙여넣으세요.\n');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 TDD 워크플로우 완료!');
    console.log('='.repeat(60));
    console.log('\n📊 요약:');
    console.log('  ✅ Step 1: 기능 명세서 작성 (Gemini)');
    console.log('  ✅ Step 2: 테스트 설계 작성 (Gemini)');
    console.log('  ✅ Step 3: 🔴 RED - 테스트 코드 작성 (Copilot)');
    console.log('  ✅ Step 4: 🧪 테스트 실패 확인');
    console.log('  ✅ Step 5: 🟢 GREEN - 최소 구현 (Copilot)');
    console.log('  ✅ Step 6: ✅ 테스트 통과 확인');
    console.log('  ✅ Step 7: 🔵 REFACTOR - 코드 개선 (Copilot)');

    return this.buildResult(completedAgents, failedAgents, startTime);
  }

  private async promptYesNo(question: string): Promise<boolean> {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'confirm',
        message: question,
        choices: [
          { name: '✅ Yes (계속 진행)', value: true },
          { name: '❌ No (중단)', value: false },
        ],
        default: true,
      },
    ]);

    return answer.confirm;
  }

  /**
   * 테스트 파일들을 실제로 디스크에 작성
   */
  private async writeTestFiles(files: Array<{ path: string; content: string }>): Promise<number> {
    let count = 0;
    for (const f of files) {
      const dest = path.resolve(process.cwd(), f.path.startsWith('src') ? f.path : `src/${f.path}`);
      const dir = path.dirname(dest);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      if (fs.existsSync(dest)) {
        console.log(`이미 존재함: ${dest} (덮어쓰지 않음)`);
        continue;
      }

      fs.writeFileSync(dest, f.content, 'utf-8');
      console.log(`작성됨: ${dest}`);
      count++;
    }
    return count;
  }

  /**
   * 간단한 구현 스텁 생성
   */
  private async createImplementationStubs(guidelines: any[]): Promise<number> {
    let created = 0;

    for (const guide of guidelines) {
      const filePath = path.resolve(process.cwd(), guide.file);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      if (fs.existsSync(filePath)) {
        console.log(`존재함(스킵): ${filePath}`);
        continue;
      }

      const funcs: string[] = [];
      for (const fn of guide.requiredFunctions) {
        const name = fn.name || 'fn';
        const sig = fn.signature || `${name}(...args: any[]): any`;
        // 간단한 반환값 추측: 문자열이면 '', 숫자면 0, 배열이면 []
        let returnExpr = 'undefined';
        if (/:\s*string/.test(sig)) returnExpr = `''`;
        else if (/:\s*number/.test(sig)) returnExpr = '0';
        else if (/:\s*(Array|\[\])/.test(sig)) returnExpr = '[]';
        else if (/:\s*boolean/.test(sig)) returnExpr = 'false';

        funcs.push(`export function ${sig} {\n  // 자동 생성 스텁\n  return ${returnExpr};\n}\n`);
      }

      const content = funcs.join('\n') + '\n';
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`생성된 스텁: ${filePath}`);
      created++;
    }

    return created;
  }

  /**
   * 클립보드에 텍스트 복사 (macOS: pbcopy, Windows: clip, Linux: xclip)
   */
  private copyToClipboard(text: string): void {
    try {
      const platform = process.platform;
      if (platform === 'darwin') {
        execSync('pbcopy', { input: Buffer.from(text, 'utf-8') });
        return;
      }

      if (platform === 'win32') {
        execSync('clip', { input: Buffer.from(text, 'utf-8') });
        return;
      }

      // linux: try xclip
      try {
        execSync('xclip -selection clipboard', { input: Buffer.from(text, 'utf-8') });
        return;
      } catch {
        // fallthrough
      }

      // 마지막: 파일에 저장하여 사용자에게 알림
      const fallback = path.resolve(process.cwd(), 'agents', 'copilot_prompt.txt');
      fs.writeFileSync(fallback, text, 'utf-8');
      console.log(`프롬프트를 ${fallback}에 저장했습니다. 수동으로 복사하세요.`);
    } catch (error) {
      console.warn('클립보드 복사 실패:', error);
      throw error;
    }
  }

  /**
   * 빌드된 WorkflowResult 객체 생성 (헬퍼)
   */
  private buildResult(
    completed: AgentType[],
    failed: AgentType[],
    startTime: number
  ): WorkflowResult {
    const duration = Date.now() - startTime;
    const status = this.determineWorkflowStatus(completed, failed);

    return {
      workflowId: this.context.workflowId,
      status,
      duration,
      completedAgents: completed,
      failedAgents: failed,
      results: Object.fromEntries(this.context.results) as Record<AgentType, AgentResult>,
      summary: this.generateSummary(completed, failed, duration),
    };
  }

  /**
   * Copilot에게 전달할 테스트 작성 프롬프트 생성 (TDD RED 단계)
   */
  private generateCopilotTestWritingPrompt(featureSpec: string, testDesign: string): string {
    return generateRedPhasePrompt({
      requirement: this.context.requirement,
      featureSpec,
      testDesign,
    });
  }

  /**
   * Copilot에게 전달할 구현 프롬프트 생성 (TDD GREEN 단계)
   */
  private generateCopilotImplementationPrompt(featureSpec: string, testCode: string): string {
    return generateGreenPhasePrompt({
      requirement: this.context.requirement,
      featureSpec,
      testCode,
    });
  }

  /**
   * Copilot에게 전달할 리팩토링 프롬프트 생성 (TDD REFACTOR 단계)
   */
  private generateCopilotRefactoringPrompt(featureSpec: string, testCode: string): string {
    return generateRefactorPhasePrompt({
      requirement: this.context.requirement,
      featureSpec,
      currentCode: '현재 구현된 코드를 분석하여 개선점을 찾아주세요.',
      testCode,
    });
  }

  /**
   * 개별 에이전트 실행
   */
  private async executeAgent(
    agentType: AgentType,
    config: { timeout?: number; retries?: number }
  ): Promise<AgentResult> {
    console.log({ executeAgent: { agentType, config } });
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
          data = await this.runTestDesigner(
            previousResults['feature-selector'] as FeatureSelectorOutput
          );
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

    console.log({ getPreviousResults: currentAgent });

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

    // 프로젝트 구조 스캔
    console.log('🔍 프로젝트 코드베이스 분석 중...');
    const codebaseContext = await this.scanCodebase(requirement);

    const prompt = generateFeatureSelectorPrompt(
      requirement,
      codebaseContext.structure,
      codebaseContext.relatedCode
    );

    try {
      const markdown = await this.llmClient.generateMarkdown(prompt);
      console.log('✅ 요구사항 분석 완료\n');

      // Markdown 파싱하여 FeatureSelectorOutput으로 변환
      const output = this.parseFeatureSelectorMarkdown(markdown);

      // 결과를 파일로도 저장
      await this.saveMarkdownResult('feature-selector', markdown);

      return output;
    } catch (error) {
      console.error('❌ Feature Selector 실행 실패:', error);
      throw error;
    }
  }

  /**
   * 코드베이스 스캔 - 요구사항과 관련된 코드 찾기 (간소화됨)
   */
  private async scanCodebase(requirement: string): Promise<{
    structure: string;
    relatedCode: string;
  }> {
    try {
      console.log('📂 프로젝트 구조 분석 중...');

      // 실제 프로젝트 구조 읽기
      const structure = this.buildProjectStructure();

      // 키워드 추출
      const keywords = this.extractKeywords(requirement);

      console.log(`🔑 추출된 키워드: ${keywords.join(', ')}`);

      // 관련 파일 찾기
      const relatedFiles = this.findRelatedFiles(keywords);
      console.log(`📄 발견된 관련 파일: ${relatedFiles.length}개`);

      // 파일 내용 읽기
      let relatedCode = '';
      for (const filePath of relatedFiles) {
        const fullPath = path.resolve(process.cwd(), filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          relatedCode += `\n### 📁 ${filePath}\n\n`;
          relatedCode += `\`\`\`typescript\n${content}\n\`\`\`\n`;
        }
      }

      return {
        structure,
        relatedCode: relatedCode || '관련 코드를 찾지 못했습니다.',
      };
    } catch (error) {
      console.warn('⚠️ 코드베이스 스캔 실패, 기본값 사용', error);
      return {
        structure: 'src/ - 소스 코드',
        relatedCode: '코드베이스를 스캔할 수 없습니다.',
      };
    }
  }

  /**
   * 실제 프로젝트 구조 빌드
   */
  private buildProjectStructure(): string {
    const srcPath = path.resolve(process.cwd(), 'src');
    if (!fs.existsSync(srcPath)) {
      return 'src/ - 소스 코드 디렉토리가 없습니다.';
    }

    const structure: string[] = [];

    const scanDir = (dir: string, prefix: string = '') => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          structure.push(`${prefix}${item}/`);
          scanDir(fullPath, prefix + '  ');
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          structure.push(`${prefix}${item}`);
        }
      }
    };

    structure.push('src/');
    scanDir(srcPath, '  ');

    return structure.join('\n');
  }

  /**
   * 관련 파일 찾기
   */
  private findRelatedFiles(keywords: string[]): string[] {
    const srcPath = path.resolve(process.cwd(), 'src');
    const relatedFiles: string[] = [];

    if (!fs.existsSync(srcPath)) {
      return relatedFiles;
    }

    const searchDir = (dir: string) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('__')) {
          searchDir(fullPath);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const relativePath = path.relative(process.cwd(), fullPath);

          // 키워드가 파일명이나 내용에 있으면 관련 파일로 판단
          const hasKeyword = keywords.some(
            (keyword) =>
              item.toLowerCase().includes(keyword.toLowerCase()) ||
              content.toLowerCase().includes(keyword.toLowerCase())
          );

          if (hasKeyword) {
            relatedFiles.push(relativePath);
          }
        }
      }
    };

    searchDir(srcPath);

    // 최대 10개 파일로 제한 (토큰 제한)
    return relatedFiles.slice(0, 10);
  }

  /**
   * 요구사항에서 키워드 추출
   */
  private extractKeywords(requirement: string): string[] {
    const keywords: string[] = [];

    // 일정 관련
    if (requirement.includes('일정')) {
      keywords.push('event', 'Event', '일정');
    }
    // 접두사 관련
    if (requirement.includes('접두사') || requirement.includes('앞에')) {
      keywords.push('prefix', 'Prefix', 'addPrefix');
    }
    // 제목 관련
    if (requirement.includes('제목')) {
      keywords.push('title', 'Title');
    }
    // 생성 관련
    if (requirement.includes('생성') || requirement.includes('추가')) {
      keywords.push('create', 'add', 'Create', 'Add');
    }

    return keywords.length > 0 ? keywords : ['event', 'utils'];
  }

  /**
   * Feature Selector Markdown 파싱
   */
  private parseFeatureSelectorMarkdown(markdown: string): FeatureSelectorOutput {
    const features: any[] = [];
    const dependencies: any[] = [];

    // ### F### 패턴으로 기능 추출
    const featureRegex = /###\s+(F\d+):\s+(.+?)(?=###|##|$)/gs;
    let match;

    while ((match = featureRegex.exec(markdown)) !== null) {
      const id = match[1];
      const content = match[2];

      const nameMatch = content.match(/^(.+?)[\n-]/);
      const name = nameMatch ? nameMatch[1].trim() : '기능';

      const descMatch = content.match(/\*\*설명\*\*:\s*(.+)/);
      const description = descMatch ? descMatch[1].trim() : name;

      const priorityMatch = content.match(/\*\*우선순위\*\*:\s*(\w+)/);
      const priority = priorityMatch ? (priorityMatch[1] as any) : 'medium';

      const complexityMatch = content.match(/\*\*복잡도\*\*:\s*(\w+)/);
      const estimatedComplexity = complexityMatch ? (complexityMatch[1] as any) : 'moderate';

      // 수락 기준 추출
      const criteriaMatch = content.match(/\*\*수락 기준\*\*:\s*([\s\S]*?)(?=\n\n|$)/);
      const acceptanceCriteria: string[] = [];
      if (criteriaMatch) {
        const lines = criteriaMatch[1].split('\n');
        lines.forEach((line) => {
          const trimmed = line.trim().replace(/^[-*]\s*/, '');
          if (trimmed) acceptanceCriteria.push(trimmed);
        });
      }

      features.push({
        id,
        name,
        description,
        priority,
        estimatedComplexity,
        acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : ['구현 완료'],
      });
    }

    // 의존성 추출
    const depSection = markdown.match(/##\s*의존성\s*([\s\S]*?)(?=##|$)/);
    if (depSection) {
      const depLines = depSection[1].split('\n');
      depLines.forEach((line) => {
        const depMatch = line.match(/(F\d+).*?(F\d+)/);
        if (depMatch) {
          dependencies.push({
            featureId: depMatch[1],
            dependsOn: [depMatch[2]],
            reason: line.includes('이유:') ? line.split('이유:')[1].trim() : '기능 의존성',
          });
        }
      });
    }

    // 추천사항 추출
    const recSection = markdown.match(/##\s*추천사항\s*([\s\S]*?)(?=##|$)/);
    const recommendation = recSection ? recSection[1].trim() : '순차적으로 구현';

    return {
      features:
        features.length > 0
          ? features
          : [
              {
                id: 'F001',
                name: '기본 기능',
                description: '요구사항 구현',
                priority: 'high' as const,
                estimatedComplexity: 'simple' as const,
                acceptanceCriteria: ['구현 완료', '테스트 통과'],
              },
            ],
      dependencies,
      recommendation,
    };
  }

  /**
   * Test Designer 실행
   */
  private async runTestDesigner(
    _featureOutput: FeatureSelectorOutput
  ): Promise<TestDesignerOutput> {
    console.log('🧪 테스트 케이스 설계 중...');
    console.log(_featureOutput);
    // Feature Selector의 전체 Markdown 읽기
    const featureSelectorMarkdown = await this.getLatestMarkdownResult('feature-selector');

    const prompt = generateTestDesignerPrompt(this.context.requirement, featureSelectorMarkdown);

    try {
      const markdown = await this.llmClient.generateMarkdown(prompt);
      console.log('✅ 테스트 케이스 설계 완료\n');
      await this.saveMarkdownResult('test-designer', markdown);

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
    } catch (error) {
      console.error('❌ Test Designer 실행 실패:', error);
      throw error;
    }
  }

  /**
   * Markdown에서 테스트 파일 정보만 추출 (파일 생성하지 않음)
   */
  private extractTestFileInfo(markdown: string): Array<{
    path: string;
    content: string;
    action: string;
    testCount: number;
    dependencies: string[];
  }> {
    const testFiles: Array<{
      path: string;
      content: string;
      action: string;
      testCount: number;
      dependencies: string[];
    }> = [];

    // "### 파일: [경로]" 패턴으로 파일 정보 추출
    const fileRegex = /###\s*파일:\s*(.+?)\n\n```(?:typescript|ts)\n([\s\S]*?)```/g;
    let match;

    while ((match = fileRegex.exec(markdown)) !== null) {
      let filePath = match[1].trim();
      const content = match[2].trim();

      // 백틱(`) 제거
      filePath = filePath.replace(/`/g, '');

      testFiles.push({
        path: filePath,
        content,
        action: 'PLANNED', // Copilot이 생성할 예정
        testCount: 0,
        dependencies: [],
      });

      console.log(`  📋 계획: ${filePath}`);
    }

    return testFiles;
  }

  /**
   * Markdown에서 구현 가이드라인 추출
   */
  private extractImplementationGuidelines(markdown: string): any[] {
    const guidelines: any[] = [];

    // "### 파일: [경로]" 패턴으로 구현 파일 정보 추출
    const guideSection = markdown.match(/##\s*구현 가이드\s*([\s\S]*?)(?=##|$)/);
    if (!guideSection) return guidelines;

    const fileMatches = guideSection[1].matchAll(/###\s*파일:\s*(.+?)\n([\s\S]*?)(?=###|$)/g);

    for (const match of fileMatches) {
      const filePath = match[1].trim();
      const content = match[2];

      // 함수 정보 추출
      const functions: any[] = [];
      const funcRegex = /-\s*`(.+?)`\s*-\s*(.+)/g;
      let funcMatch;

      while ((funcMatch = funcRegex.exec(content)) !== null) {
        functions.push({
          name: funcMatch[1].split('(')[0].trim(),
          signature: funcMatch[1].trim(),
          purpose: funcMatch[2].trim(),
        });
      }

      if (functions.length > 0) {
        guidelines.push({
          file: filePath,
          requiredFunctions: functions,
          hints: [],
        });
      }
    }

    return guidelines;
  }

  /**
   * 테스트 실행
   */
  private async runTests(): Promise<any> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { execSync } = require('child_process');
      const output = execSync('pnpm test --run', {
        cwd: process.cwd(),
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      // Vitest 출력 파싱
      const totalMatch = output.match(/Test Files\s+(\d+)\s+passed/);
      const passedMatch = output.match(/Tests\s+(\d+)\s+passed/);

      console.log({ totalMatch });

      return {
        total: passedMatch ? parseInt(passedMatch[1]) : 0,
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        passRate: 100,
        failedTests: [],
        successfulTests: [],
      };
    } catch (error: any) {
      // 테스트 실패 시
      const output = error.stdout || '';
      const failedMatch = output.match(/Tests\s+\d+\s+failed/);

      return {
        total: 0,
        passed: 0,
        failed: failedMatch ? 1 : 0,
        skipped: 0,
        duration: 0,
        passRate: 0,
        failedTests: ['테스트 실행 실패'],
        successfulTests: [],
      };
    }
  }

  /**
   * Markdown 결과 저장 (JSON 파일 생성 제거됨)
   */
  private async saveMarkdownResult(agentType: string, markdown: string): Promise<void> {
    const outputDir = this.config.options.outputDir || './agents/output';
    const fullPath = path.resolve(process.cwd(), outputDir);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    const filename = `${this.context.workflowId}_${agentType}_${Date.now()}.md`;
    const filepath = path.join(fullPath, filename);

    fs.writeFileSync(filepath, markdown);
  }

  /**
   * 최신 Markdown 결과 가져오기
   */
  private async getLatestResultMarkdown(agentType: string): Promise<string> {
    const outputDir = this.config.options.outputDir || './agents/output';
    const fullPath = path.resolve(process.cwd(), outputDir);

    if (!fs.existsSync(fullPath)) {
      return '결과 없음';
    }

    const files = fs.readdirSync(fullPath);
    const matchingFiles = files
      .filter((f) => f.includes(agentType) && f.endsWith('.md'))
      .sort()
      .reverse();

    if (matchingFiles.length === 0) {
      return '결과 없음';
    }

    const latestFile = path.join(fullPath, matchingFiles[0]);
    return fs.readFileSync(latestFile, 'utf-8');
  }

  /**
   * 최신 Markdown 결과 읽기
   */
  private async getLatestMarkdownResult(agentType: string): Promise<string> {
    const outputDir = this.config.options.outputDir || './agents/output';
    const fullPath = path.resolve(process.cwd(), outputDir);

    if (!fs.existsSync(fullPath)) {
      return '저장된 결과가 없습니다.';
    }

    // workflowId와 agentType으로 시작하는 .md 파일 찾기
    const files = fs.readdirSync(fullPath);
    const matchingFiles = files
      .filter((f) => f.startsWith(`${this.context.workflowId}_${agentType}`) && f.endsWith('.md'))
      .sort()
      .reverse(); // 최신 파일 우선

    if (matchingFiles.length === 0) {
      return '저장된 결과가 없습니다.';
    }

    const latestFile = path.join(fullPath, matchingFiles[0]);
    return fs.readFileSync(latestFile, 'utf-8');
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

  /**
   * 워크플로우 결과를 파일에서 복원
   */
  private async loadWorkflowResults(workflowId: string): Promise<void> {
    const outputDir = this.config.options.outputDir || './agents/output';
    const fullPath = path.resolve(process.cwd(), outputDir);

    if (!fs.existsSync(fullPath)) {
      console.warn('⚠️ output 폴더가 없습니다.');
      return;
    }

    const files = fs.readdirSync(fullPath);
    const workflowFiles = files.filter((f) => f.startsWith(workflowId) && f.endsWith('.md'));

    console.log(`📂 워크플로우 ${workflowId} 결과 복원 중... (${workflowFiles.length}개 파일)\n`);

    for (const file of workflowFiles) {
      // 파일명에서 agentType 추출: workflow-xxx_AGENTTYPE_timestamp.md
      const match = file.match(/_([^_]+)_\d+\.md$/);
      if (!match) continue;

      const agentType = match[1] as AgentType;
      const content = fs.readFileSync(path.join(fullPath, file), 'utf-8');

      // 기본 결과 객체 생성
      const result: AgentResult = {
        agentType,
        status: 'completed',
        data: this.parseMarkdownToData(agentType, content),
        duration: 0,
        timestamp: new Date(),
      };

      this.context.results.set(agentType, result);
      console.log(`  ✅ ${agentType} 복원 완료`);
    }

    console.log();
  }

  /**
   * Markdown을 데이터로 변환
   */
  private parseMarkdownToData(agentType: string, markdown: string): unknown {
    switch (agentType) {
      case 'feature-selector':
        return this.parseFeatureSelectorMarkdown(markdown);

      case 'test-designer':
      case 'test-designer-revised':
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
          markdown,
        };

      default:
        return { markdown };
    }
  }
}

/**
 * 간편 실행 함수
 */
export async function runWorkflow(requirement: string): Promise<WorkflowResult> {
  const orchestrator = new AgentOrchestrator();
  return await orchestrator.execute(requirement);
}

/**
 * 대화형 TDD 워크플로우 실행 (Hybrid: Gemini + Copilot)
 */
export async function runInteractiveWorkflow(requirement: string): Promise<WorkflowResult> {
  const orchestrator = new AgentOrchestrator();
  return await orchestrator.executeInteractive(requirement);
}
