/**
 * GitHub Copilot 통합
 *
 * 에이전트 결과를 GitHub Copilot Chat에 자동으로 전달합니다.
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CopilotPromptOptions {
  featureAnalysis: string;
  testDesign: string;
  implementationPlan: string;
}

/**
 * GitHub Copilot Chat에 프롬프트 전달
 */
export async function sendToCopilotChat(options: CopilotPromptOptions): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('🤖 GitHub Copilot에 작업 전달 중...');
  console.log('='.repeat(60));

  // 1. 종합 프롬프트 생성
  const prompt = generateCopilotPrompt(options);

  // 2. 임시 파일에 저장
  const tempFilePath = await saveTempPromptFile(prompt);

  // 3. Copilot Chat 열기
  await openCopilotChat(tempFilePath, prompt);
}

/**
 * Copilot을 위한 종합 프롬프트 생성
 */
function generateCopilotPrompt(options: CopilotPromptOptions): string {
  return `# AI 에이전트가 분석한 작업 계획

다음은 AI 에이전트들이 분석하고 계획한 내용입니다. 이 계획에 따라 코드를 작성해주세요.

## 📋 1. 기능 분석 (Feature Selector)

${options.featureAnalysis}

---

## 🧪 2. 테스트 설계 (Test Designer)

${options.testDesign}

---

## 📝 3. 구현 계획 (Implementation Plan)

${options.implementationPlan}

---

## ✅ 작업 지시사항

위 분석과 설계를 바탕으로:

1. **테스트 코드를 먼저 작성**해주세요 (TDD 방식)
   - 설계된 테스트 케이스를 Vitest로 구현
   - Given-When-Then 주석 포함
   - 관련 파일: 분석 결과에 명시된 경로

2. **구현 코드를 작성**해주세요
   - 모든 테스트를 통과하도록 구현
   - 기존 코드 패턴 준수
   - TypeScript 타입 안전성 보장

3. **코드 품질 확인**
   - ESLint 통과
   - 기존 테스트 깨지지 않는지 확인

작업을 시작해도 될까요?`;
}

/**
 * 프롬프트를 임시 파일에 저장
 */
async function saveTempPromptFile(prompt: string): Promise<string> {
  const outputDir = path.resolve(process.cwd(), 'agents/output');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `copilot-prompt-${Date.now()}.md`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, prompt, 'utf-8');
  console.log(`\n📄 프롬프트 저장: ${filepath}`);

  return filepath;
}

/**
 * Copilot Chat 열기
 */
async function openCopilotChat(promptFilePath: string, prompt: string): Promise<void> {
  console.log('\n🚀 GitHub Copilot Chat 열기 시도...\n');

  try {
    // 방법 1: VS Code 명령어로 Copilot Chat 패널 열기
    await execAsync('code --command workbench.panel.chat.view.copilot.focus');
    console.log('✅ Copilot Chat 패널 열림');

    // 잠시 대기
    await sleep(1000);

    // 방법 2: 클립보드에 프롬프트 복사
    await copyToClipboard(prompt);
    console.log('✅ 프롬프트가 클립보드에 복사됨');

    console.log('\n' + '='.repeat(60));
    console.log('📋 다음 단계:');
    console.log('='.repeat(60));
    console.log('1. Copilot Chat 창이 자동으로 열렸습니다');
    console.log('2. Ctrl+V (Cmd+V)로 프롬프트를 붙여넣으세요');
    console.log('3. Enter를 눌러 Copilot에게 작업을 요청하세요');
    console.log('\n또는:');
    console.log(`4. 파일을 직접 열어보세요: ${promptFilePath}`);
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.log('❌ 자동 열기 실패:', error);
    console.warn('⚠️ VS Code 명령 실행 실패, 대체 방법 사용\n');

    // 대체 방법: 파일을 VS Code에서 열기
    try {
      await execAsync(`code "${promptFilePath}"`);
      console.log('✅ VS Code에서 프롬프트 파일 열림');
      console.log('\n📋 다음 단계:');
      console.log('1. 열린 파일의 내용을 복사하세요 (Ctrl+A, Ctrl+C)');
      console.log('2. Copilot Chat을 여세요 (Ctrl+Shift+I 또는 Cmd+Shift+I)');
      console.log('3. 복사한 내용을 붙여넣고 Enter를 누르세요\n');
    } catch (e) {
      console.log('❌ 자동 실행 실패\n', e);
      printManualInstructions(promptFilePath, prompt);
    }
  }
}

/**
 * 클립보드에 텍스트 복사
 */
async function copyToClipboard(text: string): Promise<void> {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      // macOS
      await execAsync(`echo "${text.replace(/"/g, '\\"')}" | pbcopy`);
    } else if (platform === 'win32') {
      // Windows
      await execAsync(`echo ${text} | clip`);
    } else {
      // Linux
      await execAsync(`echo "${text}" | xclip -selection clipboard`);
    }
  } catch (error) {
    console.log('❌ 클립보드 복사 실패:', error);
    throw new Error('클립보드 복사 실패');
  }
}

/**
 * 수동 실행 안내
 */
function printManualInstructions(promptFilePath: string, prompt: string): void {
  console.log('\n' + '='.repeat(60));
  console.log('📋 수동으로 Copilot에 전달하기');
  console.log('='.repeat(60));
  console.log('\n다음 내용을 복사해서 GitHub Copilot Chat에 붙여넣으세요:\n');
  console.log('─'.repeat(60));
  console.log(prompt);
  console.log('─'.repeat(60));
  console.log(`\n또는 파일을 직접 열어보세요: ${promptFilePath}\n`);
}

/**
 * 대기 함수
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
