#!/usr/bin/env node
/**
 * Agent Orchestrator CLI (Interactive TDD Mode)
 *
 * 커맨드라인에서 대화형 TDD 워크플로우를 실행하는 CLI 도구
 */

import * as readline from 'readline';

import { runInteractiveWorkflow } from './orchestrator';

/**
 * CLI 실행
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    printVersion();
    process.exit(0);
  }

  // 요구사항 추출
  const requirementIndex = args.indexOf('--requirement') + 1 || args.indexOf('-r') + 1;

  if (!requirementIndex || !args[requirementIndex]) {
    console.error('❌ 오류: 요구사항을 입력해주세요.');
    console.error('예시: pnpm agent:run -r "일정 제목에 접두사 추가"');
    process.exit(1);
  }

  const requirement = args[requirementIndex];

  try {
    console.log('\n🎯 대화형 TDD 모드로 시작합니다...\n');
    const result = await runInteractiveWorkflow(requirement);

    // 종료 코드 설정
    process.exit(result.status === 'success' ? 0 : 1);
  } catch (error) {
    console.error('💥 워크플로우 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

/**
 * 사용자 입력 대기
 */
export async function waitForUserConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\n${message} (yes/no): `, (answer) => {
      rl.close();
      const confirmed = answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
      resolve(confirmed);
    });
  });
}

/**
 * 도움말 출력
 */
function printHelp() {
  console.log(`
🤖 AI Orchestration System (TDD Mode)

사용법:
  pnpm agent:run [options]

옵션:
  -r, --requirement <text>    개발할 기능 요구사항
  -h, --help                  도움말 표시
  -v, --version               버전 표시

예시:
  pnpm agent:run -r "일정 제목에 추가되는 접두사 제거"

🎯 실제 TDD 워크플로우 (통합 방식):

  Step 1: [Gemini] 기능 명세서 작성
    → 실행: pnpm agent:run -r "요구사항"
    → 확인: agents/output/ 폴더의 명세서 파일
    
  Step 2: [Gemini] 테스트 케이스 설계
    → agents/output/ 폴더의 테스트 설계 파일 확인

  Step 3: [Copilot] TDD RED 단계 - 실패하는 테스트 작성
    → Copilot에게 명세서와 테스트 설계를 첨부하여 요청
    → 요청 예시: "# TDD RED 단계: 테스트 코드 작성
                   (명세서 내용 첨부)
                   실패하는 테스트 코드를 작성해주세요"
    → 확인: 테스트가 실패하는지 확인 (pnpm test)
    
  Step 4: [Copilot] TDD GREEN 단계 - 최소 구현
    → 요청: "# TDD GREEN 단계: 최소 구현 요청
              (명세서 및 테스트 코드 내용 포함)
              테스트를 통과하는 최소한의 코드를 작성해주세요"
    → 확인: 모든 테스트가 통과하는지 확인 (pnpm test)
    
  Step 5: [Copilot] TDD REFACTOR 단계 - 코드 개선
    → 요청: "# TDD REFACTOR 단계: 코드 개선 요청
              (명세서 포함)
              테스트를 유지하면서 코드를 리팩토링해주세요"
    → 확인: 리팩토링 후에도 모든 테스트 통과 확인
    → 완료! ✅

💡 팁:
  - 각 단계마다 Copilot과 대화하면서 진행하세요
  - 명세서를 항상 첨부하여 컨텍스트를 유지하세요
  - 테스트 실행 결과를 확인하며 진행하세요
  - 필요시 추가 리팩토링이나 개선을 요청하세요

  `);
}

/**
 * 버전 출력
 */
function printVersion() {
  console.log('Agent Orchestrator v1.0.0');
}

// CLI 실행 (ES 모듈 방식)
// import.meta.url을 사용하여 현재 파일이 직접 실행되었는지 확인
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
