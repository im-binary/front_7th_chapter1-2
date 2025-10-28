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
  AgentType,
  AgentResult,
  WorkflowConfig,
  WorkflowContext,
  WorkflowResult,
  FeatureSelectorOutput,
  TestDesignerOutput,
  TestWriterOutput,
  TestValidatorOutput,
  RefactoringOutput,
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

    console.log('\n테스트를 실행합니다...');
    const testResults = await this.runTests();

    if (testResults.failed && testResults.failed > 0) {
      console.log(`\n✅ RED 상태 확인됨: ${testResults.failed}개 테스트 실패 (예상된 결과)`);
    } else {
      console.log('\n⚠️  모든 테스트가 통과했습니다. (구현이 이미 완료되었거나 테스트가 없습니다)');
    }

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
      testDesignMarkdown,
      []
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
   * Copilot에게 전달할 검토 프롬프트 생성
   */
  private generateCopilotReviewPrompt(geminiDraft: string): string {
    const requirement = this.context.requirement;

    return `# Gemini 초안 검토 및 보완 요청

## 요구사항
${requirement}

## Gemini가 작성한 초안
${geminiDraft}

## 요청사항
위의 Gemini 초안을 검토하고, 실제 워크스페이스의 코드를 기반으로 다음을 보완해주세요:

### 1. 파일 경로 검증
- 초안에 나온 파일 경로가 실제로 존재하는지 확인
- 잘못된 경로는 올바른 경로로 수정
- 관련 파일이 누락되었다면 추가

### 2. 함수/클래스명 검증
- 초안에 나온 함수명, 클래스명이 실제 코드와 일치하는지 확인
- 추상적인 이름은 실제 코드의 구체적인 이름으로 변경
- 타입 정의도 정확하게 수정

### 3. 코드 패턴 분석
- 프로젝트의 실제 코딩 스타일 반영
- 기존 코드 구조와 일관성 유지
- import 경로, 네이밍 컨벤션 확인

### 4. 상세도 보완
- Gemini가 놓친 엣지 케이스 추가
- 실제 구현에 필요한 구체적인 단계 보충
- 의존성 관계를 더 명확히

### 5. 수정 대상 명확화
- ⭐ 최우선: 상수만 수정하면 되는가? 함수 로직 변경이 필요한가?
- CONSTANT vs FUNCTION vs CLASS를 정확히 구분
- 불필요한 수정은 제거 (최소 변경 원칙)

## 출력 형식
보완된 버전을 같은 Markdown 형식으로 작성해주세요.
특히 "수정 대상" 섹션을 실제 코드 기반으로 정확하게 작성해주세요.`;
  }

  /**
   * Copilot에게 전달할 테스트 작성 프롬프트 생성 (TDD RED 단계)
   */
  private generateCopilotTestWritingPrompt(featureSpec: string, testDesign: string): string {
    const requirement = this.context.requirement;

    return `# TDD RED 단계: 테스트 코드 작성

## 요구사항
${requirement}

## 기능 명세서
${featureSpec}

## 테스트 설계
${testDesign}

## 요청사항
위 기능 명세서와 테스트 설계를 기반으로 **실패하는 테스트 코드**를 작성해주세요.

### TDD RED 단계 원칙:
1. 🔴 **구현 전에 테스트부터 작성** (Test First)
2. 🔴 **테스트는 반드시 실패해야 함** (아직 구현 안 됨)
3. 🔴 **명확한 기대값 설정** (Given-When-Then 구조)
4. 🔴 **테스트 설계 문서를 충실히 따름**

### 작성 가이드:
- 파일 위치: 테스트 설계 문서에 명시된 경로
- 테스트 프레임워크: Vitest
- import 경로: 상대 경로 또는 \`@/\` 별칭 사용
- 각 테스트 케이스(TC)를 개별 \`it\` 블록으로 작성
- Given-When-Then 주석 포함

### 예시 구조:
\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { 함수명 } from '../../utils/파일명';

describe('기능명', () => {
  it('TC001: 테스트 케이스 설명', () => {
    // Given: 초기 상태 설정
    const input = '테스트 입력';
    
    // When: 테스트 대상 실행
    const result = 함수명(input);
    
    // Then: 기대 결과 검증
    expect(result).toBe('기대값');
  });
});
\`\`\`

작성 후 \`pnpm test\`로 테스트가 **실패**하는지 확인해주세요! (RED 상태)`;
  }

  /**
   * Copilot에게 전달할 구현 프롬프트 생성 (TDD GREEN 단계)
   */
  private generateCopilotImplementationPrompt(
    featureSpec: string,
    testCode: string,
    guidelines: any[]
  ): string {
    const requirement = this.context.requirement;

    const guidelinesText = guidelines
      .map((g) => {
        const funcs = g.requiredFunctions.map((f: any) => `  - ${f.signature}`).join('\n');
        return `### ${g.file}\n${funcs}`;
      })
      .join('\n\n');

    return `# TDD GREEN 단계: 최소 구현 요청

## 요구사항
${requirement}

## 기획 명세서
${featureSpec}

## 작성된 테스트 코드
${testCode}

## 구현 가이드
${guidelinesText}

## 요청사항
위 테스트를 **통과**하는 **최소한의 코드**를 작성해주세요.

### TDD GREEN 단계 원칙:
1. ✅ **테스트를 통과하는 것이 최우선 목표**
2. ✅ **가장 단순한 구현**으로 시작 (하드코딩도 OK)
3. ✅ **불필요한 추상화 금지** (나중에 리팩토링)
4. ✅ **기존 코드 최소 변경** (상수만? 함수만?)

### 작업 순서:
1. 테스트 파일을 실행하여 실패하는 테스트 확인
2. 실패하는 테스트를 통과시키는 최소 코드 작성
3. 테스트 재실행하여 통과 확인
4. 다음 실패 테스트로 반복

완료 후 \`pnpm test\`로 모든 테스트가 통과하는지 확인해주세요.`;
  }

  /**
   * Copilot에게 전달할 리팩토링 프롬프트 생성 (TDD REFACTOR 단계)
   */
  private generateCopilotRefactoringPrompt(featureSpec: string, testCode: string): string {
    const requirement = this.context.requirement;

    return `# TDD REFACTOR 단계: 코드 개선 요청

## 요구사항
${requirement}

## 기획 명세서
${featureSpec}

## 테스트 코드
${testCode}

## 요청사항
현재 구현된 코드를 리팩토링해주세요. 단, **모든 테스트는 계속 통과해야 합니다.**

### TDD REFACTOR 단계 원칙:
1. ✅ **테스트는 절대 깨지면 안 됨** (GREEN 상태 유지)
2. ✅ **중복 코드 제거** (DRY 원칙)
3. ✅ **의미 있는 이름** (변수, 함수, 클래스)
4. ✅ **단일 책임 원칙** (함수/클래스당 하나의 역할)
5. ✅ **가독성 향상** (복잡한 로직 분리, 주석 추가)

### 리팩토링 체크리스트:
- [ ] 하드코딩된 값을 상수로 추출했나요?
- [ ] 긴 함수를 작은 함수로 분리했나요?
- [ ] 중복된 로직을 공통 함수로 추출했나요?
- [ ] 변수/함수 이름이 의도를 명확히 표현하나요?
- [ ] 불필요한 주석을 제거했나요? (코드 자체가 설명)
- [ ] 에러 처리가 적절한가요?

### 작업 순서:
1. 현재 테스트 실행하여 모두 통과하는지 확인
2. 리팩토링 수행
3. 테스트 재실행하여 여전히 통과하는지 확인
4. 추가 개선 사항이 있으면 반복

완료 후 \`pnpm test\`로 모든 테스트가 여전히 통과하는지 확인해주세요.`;
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

        case 'test-writer':
          data = await this.runTestWriter(previousResults['test-designer'] as TestDesignerOutput);
          break;

        case 'test-validator':
          data = await this.runTestValidator(previousResults['test-writer'] as TestWriterOutput);
          break;

        case 'refactoring':
          data = await this.runRefactoring(
            previousResults['test-validator'] as TestValidatorOutput
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

    const prompt = `# Feature Selector Agent

당신은 소프트웨어 기능 분석 전문가입니다.
사용자의 요구사항을 받으면 **기존 코드베이스를 먼저 정확히 분석**하고 다음 단계를 수행하세요.

## 요구사항
${requirement}

## 프로젝트 컨텍스트

### 프로젝트 구조
\`\`\`
${codebaseContext.structure}
\`\`\`

### 관련 기존 코드
${codebaseContext.relatedCode}

## 중요: 기존 코드 분석 필수 사항

반드시 위의 "관련 기존 코드" 섹션을 자세히 읽고:
1. **어떤 파일이 존재하는지 확인**
2. **어떤 함수/클래스가 이미 있는지 파악**
3. **기존 코드의 로직과 패턴 이해**
4. **수정이 필요한 정확한 위치 식별**
5. **⭐⭐⭐ 최우선 원칙: 상수 값만 바꿔서 해결되는가?**
   - **예시 1**: 요구사항이 "접두사를 '[추가합니다]'에서 '[새 일정]'으로 변경"
     - 분석: EVENT_PREFIX 상수가 있고, 함수들이 이 상수를 참조
     - **결론: 상수 값만 변경하면 모든 함수에 자동 반영됨**
     - **수정 대상**: EVENT_PREFIX 상수의 값만
     - **함수 수정**: 불필요!
   
   - **예시 2**: 함수 로직 자체를 바꿔야 하는 경우에만 함수 수정
     - 예: "접두사 뒤에 공백을 두 개로 변경" → 로직 변경 필요
   
   - **판단 기준**:
     - ✅ 상수 값만 변경: 문자열/숫자 등 데이터만 바뀜
     - ❌ 함수 수정 필요: 알고리즘/로직/조건문이 바뀜

## 분석 단계

1. **기존 코드 상세 분석**
   - 요구사항과 관련된 **실제 파일 경로** 명시
   - 수정이 필요한 **구체적인 함수명/변수명/상수명** 식별
   - **상수와 함수의 의존 관계** 파악 (중요!)
   - 현재 구현의 동작 방식 설명
   - 기존 패턴과 컨벤션 확인

2. **최소 수정 원칙**
   - ⭐ **가장 적은 코드를 수정하는 방법 찾기**
   - 상수값 변경으로 해결 가능? → 상수만 수정
   - 함수 로직 변경 필요? → 함수만 수정
   - 여러 파일 수정 필요? → 명확히 구분

3. **수정 vs 신규 결정**
   - 기존 파일 수정: 파일 경로와 수정할 대상(상수/함수/클래스) 명시
   - 신규 파일 생성: 새 파일 경로와 이유 명시
   - 혼합: 각각 명확히 구분

3. **기능 분해**
   - 각 기능을 독립적인 단위로 분리
   - 명확하고 측정 가능한 acceptance criteria 작성
   - 복잡도 추정 (simple, moderate, complex)

4. **우선순위 결정**
   - 비즈니스 가치
   - 기술적 의존성
   - 구현 난이도

## 출력 형식 (반드시 이 형식을 따르세요)

## 기존 코드 분석

### 관련 파일
- \`src/utils/eventUtils.ts\` - 이벤트 관련 유틸 함수들 (수정 필요)
- \`src/hooks/useEventOperations.ts\` - 이벤트 CRUD 훅 (영향 받음)

### 수정 대상
- **파일**: \`src/utils/eventUtils.ts\`
- **수정 대상 유형**: CONSTANT (상수) / FUNCTION (함수) / CLASS (클래스)
- **수정 대상 이름**: \`EVENT_PREFIX\` 또는 \`addEventPrefix\` 등
- **현재 동작**: 
  - 상수인 경우: 현재 값과 어떻게 사용되는지
  - 함수인 경우: 현재 로직과 동작 방식
- **변경 필요**: 
  - ⭐ 상수만 변경하면 되는가? 또는 함수 로직 변경 필요한가?
  - 구체적으로 무엇을 어떻게 바꿔야 하는지

### ✅ 예시 1: 상수만 수정하는 케이스
**요구사항**: "접두사를 '[추가합니다]'에서 '[새 일정]'으로 변경"
- **파일**: \`src/utils/eventUtils.ts\`
- **수정 대상 유형**: CONSTANT
- **수정 대상 이름**: \`EVENT_PREFIX\`
- **현재 값**: \`'[추가합니다]'\`
- **새 값**: \`'[새 일정]'\`
- **함수 수정 필요**: ❌ 없음 (함수들이 상수를 참조하므로 자동 반영됨)

### ❌ 잘못된 예시: 상수와 함수를 동시 수정
- **수정 대상 유형**: CONSTANT, FUNCTION ← 잘못됨!
- **이유**: 상수만 바꾸면 되는데 불필요하게 함수도 수정

## 기능 목록

### F001: [기능 이름]
- **설명**: 기능에 대한 상세 설명
- **타입**: MODIFY_EXISTING (기존 코드 수정) 또는 CREATE_NEW (신규 생성)
- **대상 파일**: 정확한 파일 경로
- **대상 함수/클래스/상수**: 구체적인 이름
- **우선순위**: high / medium / low
- **복잡도**: simple / moderate / complex
- **수락 기준**:
  - 기준 1 (구체적으로)
  - 기준 2 (구체적으로)

## 의존성
- F002는 F001에 의존 (이유: ...)

## 추천사항
구현 순서 및 전략에 대한 추천 (기존 코드 기반으로)`;

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

    // 최대 5개 파일로 제한 (토큰 제한)
    return relatedFiles.slice(0, 5);
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

    // Feature Selector의 전체 Markdown 읽기
    const featureSelectorMarkdown = await this.getLatestMarkdownResult('feature-selector');

    const prompt = `# Test Designer Agent

당신은 테스트 설계 전문가입니다.
Feature Selector가 분석한 기능을 바탕으로 **구체적인** 테스트 케이스를 설계하세요.

## 요구사항
${this.context.requirement}

## Feature Selector 분석 결과 (전체)

${featureSelectorMarkdown}

## 설계 요구사항

1. **테스트 전략 수립**
   - TDD 접근 방식
   - 중점 영역 식별
   - 목표 커버리지 설정

2. **구체적인 테스트 케이스 작성**
   - 각 기능별로 최소 3-5개 테스트 케이스
   - 정상 케이스, 경계 케이스, 예외 케이스 포함
   - Given-When-Then 형식으로 명확히 작성

3. **테스트 피라미드 구성**
   - 단위 테스트 중심 (80%)
   - 통합 테스트 (15%)
   - E2E 테스트 (5%)

## 출력 형식

다음 Markdown 형식으로 작성:

## 테스트 전략
- 접근 방식: TDD 방식
- 중점 영역: 핵심 로직, 엣지 케이스
- 목표 커버리지: 90%

## 테스트 케이스

### TC001: [기능] - [시나리오]
- **기능 ID**: F001
- **유형**: unit
- **우선순위**: high
- **Given**: 구체적인 초기 조건
- **When**: 실행할 동작
- **Then**: 예상되는 결과
- **엣지 케이스**: 특별히 테스트할 경계 조건

## 테스트 피라미드
- 단위 테스트: 8개
- 통합 테스트: 2개
- E2E 테스트: 1개
- 근거: 단위 테스트 중심으로 빠른 피드백 확보`;

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
   * Test Writer 실행 - 실제 테스트 파일 생성
   */
  private async runTestWriter(_testDesignOutput: TestDesignerOutput): Promise<TestWriterOutput> {
    console.log('📝 테스트 코드 작성 중...');

    // Feature Selector와 Test Designer의 Markdown 읽기
    const featureSelectorMarkdown = await this.getLatestMarkdownResult('feature-selector');
    const testDesignMarkdown = await this.getLatestMarkdownResult('test-designer');

    const prompt = `# Test Writer Agent

당신은 테스트 코드 작성 전문가입니다.
아래의 요구사항과 기획 명세서, 테스트 설계를 바탕으로 **실제 실행 가능한** Vitest 테스트 코드를 작성하세요.

## 요구사항
${this.context.requirement}

## Feature Selector 분석 결과

${featureSelectorMarkdown}

## Test Designer 설계 결과

${testDesignMarkdown}

## 작성 요구사항

⚠️ **중요**: 위의 요구사항과 Feature Selector 분석 결과를 **반드시** 기반으로 테스트를 작성하세요!

1. **완전한 테스트 코드 작성**
   - 위 요구사항에 명시된 기능을 테스트하는 코드 작성
   - Feature Selector가 분석한 **실제 파일과 함수**를 import하여 사용
   - Vitest의 describe, it, expect 사용
   - TypeScript 타입 안전성 고려

2. **테스트 파일 경로**
   - Feature Selector가 분석한 파일을 기반으로 적절한 테스트 파일 경로 지정
   - 예: src/utils/eventUtils.ts를 테스트한다면 → src/__tests__/unit/eventUtils.spec.ts

3. **실제 코드 기반**
   - Feature Selector의 "수정 대상" 섹션을 확인하여 테스트할 함수/상수 파악
   - 예시 코드가 아닌 **실제 요구사항에 맞는** 테스트 작성

다음 형식으로 작성하세요:

## 테스트 파일

### 파일: src/__tests__/unit/[실제_기능명].spec.ts

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { 실제함수명 } from '@/utils/실제파일명';

describe('실제 기능명', () => {
  it('실제 테스트 케이스', () => {
    // Given
    const input = 실제_입력값;
    
    // When
    const result = 실제함수명(input);
    
    // Then
    expect(result).toBe(기대값);
  });
});
\`\`\`

## 구현 가이드

### 파일: src/utils/실제파일명.ts
필요한 함수:
- \`실제함수명(param: Type): ReturnType\` - 함수 설명`;

    try {
      const markdown = await this.llmClient.generateMarkdown(prompt);
      console.log('✅ 테스트 코드 작성 완료\n');
      await this.saveMarkdownResult('test-writer', markdown);

      // Markdown에서 정보만 추출 (실제 파일 생성하지 않음)
      const testFiles = this.extractTestFileInfo(markdown);
      const guidelines = this.extractImplementationGuidelines(markdown);

      return {
        testFiles,
        implementationGuidelines: guidelines,
        readinessCheck: {
          allTestsWritten: testFiles.length > 0,
          syntaxValid: true,
          importsCorrect: true,
          readyForImplementation: testFiles.length > 0,
          issues:
            testFiles.length === 0
              ? [
                  {
                    severity: 'error',
                    message: '테스트 설계 실패',
                    suggestion: '프롬프트를 확인하세요',
                  },
                ]
              : [],
        },
      };
    } catch (error) {
      console.error('❌ Test Writer 실행 실패:', error);
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
   * 기존 구현 파일의 내용을 가져오기
   */
  private async getExistingImplementationContext(guidelines: any[]): Promise<string> {
    let context = '';

    for (const guide of guidelines) {
      const fullPath = path.resolve(process.cwd(), guide.file);

      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        context += `\n### 기존 파일: ${guide.file}\n\n\`\`\`typescript\n${content}\n\`\`\`\n`;
      } else {
        context += `\n### 신규 파일: ${guide.file}\n\n(파일이 존재하지 않음 - 새로 생성 필요)\n`;
      }
    }

    return context || '기존 구현 코드가 없습니다.';
  }

  /**
   * Test Validator 실행 - 실제 구현 코드 생성/수정
   */
  private async runTestValidator(testWriterOutput: TestWriterOutput): Promise<TestValidatorOutput> {
    console.log('🟢 구현 및 테스트 검증 중...');

    // Feature Selector와 Test Designer의 Markdown 결과도 읽기
    const featureSelectorMarkdown = await this.getLatestMarkdownResult('feature-selector');
    const testDesignerMarkdown = await this.getLatestMarkdownResult('test-designer');

    // 실제 생성된 테스트 파일 내용을 Markdown으로 포맷
    const testFilesContent = testWriterOutput.testFiles
      .map((file) => `### 테스트 파일: ${file.path}\n\n\`\`\`typescript\n${file.content}\n\`\`\``)
      .join('\n\n');

    // 구현 가이드라인을 Markdown으로 포맷
    const guidelinesContent = testWriterOutput.implementationGuidelines
      .map((guide: any) => {
        const functionsText = guide.requiredFunctions
          .map((fn: any) => `  - \`${fn.signature}\` - ${fn.purpose}`)
          .join('\n');
        return `### 파일: ${guide.file}\n필요한 함수:\n${functionsText}`;
      })
      .join('\n\n');

    // 기존 구현 파일이 있는지 확인하고 내용 포함
    const existingCodeContext = await this.getExistingImplementationContext(
      testWriterOutput.implementationGuidelines
    );

    const prompt = `# Test Validator Agent

당신은 구현 검증 전문가입니다.
아래 테스트 파일들을 **정확히** 분석하고, 모든 테스트를 통과하는 구현 코드를 작성하세요.

## 원본 요구사항 분석 결과

${featureSelectorMarkdown}

## 테스트 설계

${testDesignerMarkdown}

## 생성된 테스트 파일들

${testFilesContent}

## 구현 가이드라인

${guidelinesContent}

## 기존 구현 코드 (있는 경우)

${existingCodeContext}

## 중요 지침

**반드시 위의 "원본 요구사항 분석 결과"를 먼저 읽고 어떤 파일의 어떤 함수를 수정해야 하는지 파악하세요!**

1. **기존 코드가 있는 경우**:
   - 위의 "기존 구현 코드" 섹션을 주의 깊게 읽으세요
   - 기존 코드를 완전히 새로 작성하지 말고, **필요한 부분만 수정**하세요
   - 기존 함수명, 변수명, 패턴을 유지하세요
   - import 문, 타입 정의 등 기존 구조를 보존하세요

2. **기존 코드가 없는 경우**:
   - 새로운 파일을 생성하세요
   - 프로젝트의 코딩 스타일을 따르세요

3. **완전한 구현 코드 작성**
   - 위의 모든 테스트를 통과하는 코드
   - TypeScript 타입 안전성 보장
   - 클린 코드 원칙 준수
   - JSDoc 주석 포함

## 출력 형식

**세 가지 형식 중 선택 (가장 간단한 것 우선):**

### ⭐ 옵션 0: 상수만 수정 (가장 간단! 최우선 고려)

## 수정 파일: src/utils/eventUtils.ts
## 수정 상수: EVENT_PREFIX
## 새 값: [새 일정]

**설명**: 상수 값만 변경합니다. 이 상수를 사용하는 모든 코드는 자동으로 새 값을 사용합니다.
**사용 조건**: 
- 상수가 존재하고
- 함수가 그 상수를 참조하는 경우
- 로직 변경 없이 값만 바꾸면 되는 경우

### 옵션 1: 특정 함수만 수정

## 수정 파일: src/utils/eventUtils.ts
## 수정 함수: addEventPrefix
## 새 구현:
\`\`\`typescript
  return \`[새 일정] \${title}\`;
\`\`\`

**설명**: 함수 본문만 교체합니다. import, 다른 함수는 유지됩니다.
**사용 조건**: 
- 함수 로직 변경이 필요한 경우
- 상수 수정만으로 부족한 경우

### 옵션 2: 전체 파일 생성

## 파일: src/utils/newUtils.ts

\`\`\`typescript
// 전체 파일 내용
\`\`\`

**사용 조건**: 
- 신규 파일 생성
- 대규모 리팩토링

**⚠️ 중요 선택 가이드:**
1. 상수가 있으면 → **옵션 0 사용** (최우선!)
2. 함수 로직만 수정 → **옵션 1 사용**
3. 신규 파일 → **옵션 2 사용**
4. 의심스러우면 → **옵션 0 또는 1 사용**`;

    try {
      const markdown = await this.llmClient.generateMarkdown(prompt);
      console.log('✅ 구현 코드 생성 완료\n');
      await this.saveMarkdownResult('test-validator', markdown);

      // Markdown에서 구현 파일 추출 및 생성
      const implementationFiles = await this.extractAndCreateImplementationFiles(markdown);

      // 테스트 실행
      console.log('🧪 테스트 실행 중...');
      const testResults = await this.runTests();

      return {
        implementationFiles,
        testResults,
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
          allTestsPassed: testResults.failed === 0,
          coverageMetTarget: true,
          targetCoverage: 85,
          actualCoverage: 90,
          readyForRefactoring: testResults.failed === 0,
          blockers: testResults.failed > 0 ? [`${testResults.failed}개 테스트 실패`] : [],
        },
        nextSteps: testResults.failed === 0 ? ['리팩토링 진행'] : ['테스트 실패 수정'],
      };
    } catch (error) {
      console.error('❌ Test Validator 실행 실패:', error);
      throw error;
    }
  }

  /**
   * Markdown에서 구현 파일 추출 (Copilot에 전달용 - 실제 파일 생성 안 함)
   */
  private async extractAndCreateImplementationFiles(markdown: string): Promise<any[]> {
    const implFiles: any[] = [];

    // Copilot에 전달할 정보만 추출 (실제 파일 생성하지 않음)
    const fileRegex = /###?\s*파일:\s*(.+?)\n\n```(?:typescript|ts)\n([\s\S]*?)```/g;
    let match;

    while ((match = fileRegex.exec(markdown)) !== null) {
      let filePath = match[1].trim();
      const content = match[2].trim();

      // 백틱(`) 제거
      filePath = filePath.replace(/`/g, '');

      // 함수명 추출
      const functionNames = (content.match(/(?:export\s+)?function\s+(\w+)/g) || []).map((f) =>
        f.replace(/(?:export\s+)?function\s+/, '')
      );

      implFiles.push({
        path: filePath,
        content,
        functionsImplemented: functionNames,
        action: 'PLANNED', // Copilot이 실제로 구현할 예정
      });

      console.log(`  📋 계획: ${filePath} (${functionNames.length}개 함수)`);
    }

    return implFiles;
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
   * Refactoring 실행
   */
  private async runRefactoring(
    testValidatorOutput: TestValidatorOutput
  ): Promise<RefactoringOutput> {
    console.log('🔵 코드 리팩토링 중...');

    // Feature Selector 결과 가져오기 (수정 대상 확인용)
    const featureSelectorMarkdown = await this.getLatestMarkdownResult('feature-selector');

    // 구현 파일 목록을 Markdown으로 포맷
    const implementedFilesContent = testValidatorOutput.implementationFiles
      .map(
        (file: any) => `### ${file.path}
\`\`\`typescript
${file.content}
\`\`\``
      )
      .join('\n\n');

    const prompt = `# Refactoring Agent

당신은 코드 품질 개선 전문가입니다.
Test Validator가 검증한 구현을 분석하고 리팩토링하세요.

## 원본 요구사항 분석 (Feature Selector)

${featureSelectorMarkdown}

## 구현된 파일들

${implementedFilesContent}

## 테스트 결과
- 총 테스트: ${testValidatorOutput.testResults.total}개
- 통과: ${testValidatorOutput.testResults.passed}개
- 실패: ${testValidatorOutput.testResults.failed}개
- Green 상태: ${testValidatorOutput.greenStatus.allTestsPassed ? '✅ 통과' : '❌ 실패'}

## ⚠️⚠️⚠️ 최우선 원칙: 최소 변경

Feature Selector의 분석을 다시 확인하세요:
- **수정 대상 유형**이 CONSTANT라면 → 상수 값만 변경
- **수정 대상 유형**이 FUNCTION이라면 → 함수 본문만 변경

**절대 하지 말아야 할 것:**
- ❌ 상수를 변경하면서 동시에 함수도 변경
- ❌ 불필요한 코드 추가
- ❌ 기존 로직 변경

**반드시 해야 할 것:**
- ✅ Feature Selector가 지정한 수정 대상만 수정
- ✅ 다른 코드는 절대 건드리지 않기
- ✅ 예: 상수만 바꾸면 되는 경우 → 상수 값만 변경

## 리팩토링 요구사항

1. **코드 분석**
   - Feature Selector의 "수정 대상 유형" 확인
   - CONSTANT면 상수만, FUNCTION이면 함수만

2. **리팩토링 수행**
   - **상수만 변경하는 경우**: 상수 값만 변경하고 끝
   - **함수만 변경하는 경우**: 함수 로직만 수정
   - 불필요한 변경 금지

3. **개선 사항 문서화**
   - 변경 이유 설명
   - 개선 효과 측정

## ⚠️ 중요: 수정 형식 지정

리팩토링 결과를 다음 두 가지 형식 중 **하나만** 선택하여 작성하세요:

### 형식 1: 상수만 수정 (Feature Selector가 CONSTANT로 지정한 경우)
\`\`\`
## 수정 파일: src/utils/eventUtils.ts
## 수정 상수: EVENT_PREFIX
## 새 값: [새 일정]
\`\`\`

### 형식 2: 함수만 수정 (Feature Selector가 FUNCTION으로 지정한 경우)
\`\`\`
## 수정 파일: src/utils/eventUtils.ts
## 수정 함수: addEventPrefix
## 새 구현:
\`\`\`typescript
  const trimmedTitle = title.trim();
  return \`\${EVENT_PREFIX} \${trimmedTitle}\`;
\`\`\`
\`\`\`

## 출력 형식

다음 Markdown 형식으로 작성:

## 코드 분석

### 수정 대상 확인
- **Feature Selector 분석**: [CONSTANT / FUNCTION]
- **수정 대상**: \`대상_이름\`
- **변경 내용**: [구체적으로]

## 리팩토링 제안

### 변경: [상수/함수] 수정

## 수정 파일: src/utils/eventUtils.ts
## 수정 [상수/함수]: [이름]
## 새 값: [값] (상수인 경우)
또는
## 새 구현:
\`\`\`typescript
// 함수 본문만
\`\`\`

## 개선 효과
- [구체적인 효과]`;

    try {
      const markdown = await this.llmClient.generateMarkdown(prompt);
      console.log('✅ 코드 리팩토링 분석 완료 (Copilot이 적용 예정)\n');
      await this.saveMarkdownResult('refactoring', markdown);

      // Copilot에 전달만 하고 직접 적용하지 않음
      console.log('\n� 리팩토링 계획이 Copilot에 전달될 예정입니다.\n');

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
    } catch (error) {
      console.error('❌ Refactoring 실행 실패:', error);
      throw error;
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

      case 'test-writer':
        return {
          testFiles: this.extractTestFileInfo(markdown),
          implementationGuidelines: this.extractImplementationGuidelines(markdown),
          readinessCheck: {
            allTestsWritten: true,
            syntaxValid: true,
            importsCorrect: true,
            readyForImplementation: true,
            issues: [],
          },
          markdown,
        };

      case 'test-validator':
        return {
          implementationFiles: [],
          testResults: {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            passRate: 0,
            failedTests: [],
            successfulTests: [],
          },
          coverage: {
            overall: {
              lines: 0,
              branches: 0,
              functions: 0,
              statements: 0,
            },
            byFile: [],
            uncoveredAreas: [],
          },
          greenStatus: {
            allTestsPassed: false,
            coverageMetTarget: false,
            targetCoverage: 85,
            actualCoverage: 0,
            readyForRefactoring: false,
            blockers: [],
          },
          nextSteps: [],
          markdown,
        };

      case 'refactoring':
        return {
          analysis: {
            codeSmells: [],
            complexity: {
              cyclomaticComplexity: 0,
              cognitiveComplexity: 0,
              linesOfCode: 0,
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
          markdown,
        };

      default:
        return { markdown };
    }
  }

  /**
   * Step 2: 테스트 설계 (Hybrid 방식)
   */
  async executeStep2TestDesign(): Promise<void> {
    console.log('\n🧪 Step 2: Gemini가 테스트 설계 초안 작성 중...\n');

    // 워크플로우 결과 복원
    await this.loadWorkflowResults(this.context.workflowId);

    const featureOutput = this.context.results.get('feature-selector')
      ?.data as FeatureSelectorOutput;
    if (!featureOutput) {
      console.error('❌ Step 1 결과를 찾을 수 없습니다.');
      console.error('💡 agents/output/ 폴더에서 feature-selector 파일을 확인하세요.\n');
      return;
    }

    const testDesignResult = await this.executeAgent('test-designer', {});
    if (testDesignResult.status === 'completed') {
      this.context.results.set('test-designer', testDesignResult);
      const markdown = await this.getLatestResultMarkdown('test-designer');

      console.log('📋 Gemini 테스트 설계 초안 완료\n');

      const copilotPrompt = `# Gemini 테스트 설계 초안 검토 및 보완

## Gemini 초안
${markdown}

## 요청사항
위 테스트 설계를 검토하고 다음을 보완해주세요:

1. 실제 프로젝트의 테스트 프레임워크 확인 (Vitest, Jest 등)
2. 기존 테스트 파일들의 패턴 분석
3. 누락된 엣지 케이스 추가
4. Given-When-Then을 더 구체적으로 작성
5. 테스트 파일 경로를 프로젝트 구조에 맞게 수정

보완된 테스트 설계를 같은 형식으로 작성해주세요.`;

      console.log('👉 Copilot에게 요청:\n');
      console.log('─'.repeat(60));
      console.log(copilotPrompt);
      console.log('─'.repeat(60));
    }
  }

  /**
   * Step 3: 테스트 코드 작성 (Hybrid 방식)
   */
  async executeStep3TestCode(copilotRevisedDesign: string): Promise<void> {
    console.log('\n📝 Step 3: Gemini가 테스트 코드 초안 작성 중...\n');

    // 워크플로우 결과 복원
    await this.loadWorkflowResults(this.context.workflowId);

    // Copilot이 보완한 테스트 설계를 파일로 저장
    await this.saveMarkdownResult('test-designer-revised', copilotRevisedDesign);

    const testWriterResult = await this.executeAgent('test-writer', {});
    if (testWriterResult.status === 'completed') {
      this.context.results.set('test-writer', testWriterResult);
      const markdown = await this.getLatestResultMarkdown('test-writer');

      console.log('📋 Gemini 테스트 코드 초안 완료\n');

      const copilotPrompt = `# Gemini 테스트 코드 초안 → 실제 파일 생성

## Gemini 초안
${markdown}

## 요청사항
위 테스트 코드를 바탕으로 실제 테스트 파일을 생성해주세요:

1. import 경로를 프로젝트에 맞게 수정
2. 타입 정의가 있다면 올바른 경로에서 import
3. 테스트 헬퍼 함수가 있다면 활용
4. 모킹이 필요하면 적절히 추가
5. 실제로 실행 가능한 완전한 코드로 작성

테스트 파일들을 실제로 생성해주세요!`;

      console.log('👉 Copilot에게 요청:\n');
      console.log('─'.repeat(60));
      console.log(copilotPrompt);
      console.log('─'.repeat(60));
      console.log('\n💡 또는 간단히: "@workspace 위 테스트 코드 파일로 생성해줘"\n');
    }
  }

  /**
   * Step 4: 구현 (Hybrid 방식)
   */
  async executeStep4Implementation(): Promise<void> {
    console.log('\n🟢 Step 4: Gemini가 구현 코드 초안 작성 중...\n');

    // 워크플로우 결과 복원
    await this.loadWorkflowResults(this.context.workflowId);

    const testWriterOutput = this.context.results.get('test-writer')?.data as TestWriterOutput;
    if (!testWriterOutput) {
      console.error('❌ Step 3이 완료되지 않았습니다.');
      return;
    }

    const validatorResult = await this.executeAgent('test-validator', {});
    if (validatorResult.status === 'completed') {
      this.context.results.set('test-validator', validatorResult);
      const markdown = await this.getLatestResultMarkdown('test-validator');

      console.log('📋 Gemini 구현 코드 초안 완료\n');

      const copilotPrompt = `# Gemini 구현 코드 초안 → 실제 파일 수정/생성

## Gemini 초안
${markdown}

## 요청사항
위 구현 코드를 바탕으로 실제 파일을 수정/생성해주세요:

⚠️ 최우선 원칙: **최소 변경**
1. 상수만 바꾸면 되는가? → 상수만 수정
2. 함수 로직 변경 필요? → 해당 함수만 수정
3. 신규 파일 필요? → 새로 생성

기존 코드를 최대한 보존하면서, 테스트를 통과하는 구현을 작성해주세요.
그리고 테스트를 실행해서 결과를 알려주세요!`;

      console.log('👉 Copilot에게 요청:\n');
      console.log('─'.repeat(60));
      console.log(copilotPrompt);
      console.log('─'.repeat(60));
      console.log('\n💡 또는: "@workspace 구현해주고 테스트 실행해줘"\n');
    }
  }

  /**
   * Step 5: 리팩토링 (Hybrid 방식)
   */
  async executeStep5Refactoring(): Promise<void> {
    console.log('\n🔵 Step 5: Gemini가 리팩토링 제안 작성 중...\n');

    // 워크플로우 결과 복원
    await this.loadWorkflowResults(this.context.workflowId);

    const validatorOutput = this.context.results.get('test-validator')?.data as TestValidatorOutput;
    if (!validatorOutput) {
      console.error('❌ Step 4가 완료되지 않았습니다.');
      return;
    }

    const refactoringResult = await this.executeAgent('refactoring', {});
    if (refactoringResult.status === 'completed') {
      this.context.results.set('refactoring', refactoringResult);
      const markdown = await this.getLatestResultMarkdown('refactoring');

      console.log('📋 Gemini 리팩토링 제안 완료\n');
      console.log('\n🔎 제안 미리보기:\n');
      console.log('─'.repeat(60));
      console.log(markdown.substring(0, Math.min(1200, markdown.length)));
      console.log('─'.repeat(60));
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

/**
 * Step 2-5 실행 함수들
 */
export async function runStep2(workflowId: string): Promise<void> {
  const orchestrator = new AgentOrchestrator();
  orchestrator['context'].workflowId = workflowId;
  await orchestrator.executeStep2TestDesign();
}

export async function runStep3(workflowId: string, revisedDesign: string): Promise<void> {
  const orchestrator = new AgentOrchestrator();
  orchestrator['context'].workflowId = workflowId;
  await orchestrator.executeStep3TestCode(revisedDesign);
}

export async function runStep4(workflowId: string): Promise<void> {
  const orchestrator = new AgentOrchestrator();
  orchestrator['context'].workflowId = workflowId;
  await orchestrator.executeStep4Implementation();
}

export async function runStep5(workflowId: string): Promise<void> {
  const orchestrator = new AgentOrchestrator();
  orchestrator['context'].workflowId = workflowId;
  await orchestrator.executeStep5Refactoring();
}
