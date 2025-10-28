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
  pnpm agent:run -r "일정 삭제 시 확인 다이얼로그 추가"

🎯 대화형 TDD 워크플로우:

  Step 1: [Gemini] 기능 명세서 작성
    → 실행: pnpm agent:run -r "요구사항"
    → 확인: agents/output/ 폴더의 .md 파일
    → 승인: GitHub Copilot에게 "명세서 검토해줘" 요청

  Step 2: [Gemini] 테스트 케이스 설계 (RED)
    → 승인: "OK, 테스트 설계해줘"
    
  Step 3: [Copilot] 테스트 코드 작성
    → 요청: "테스트 코드 작성해줘"
    → 확인: 생성된 테스트 파일
    → 승인: "OK, 다음"
    
  Step 4: [Copilot] 구현 코드 작성 (GREEN)
    → 요청: "구현 코드 작성해줘"
    → 확인: 테스트 통과 확인
    → 승인: "OK, 다음"
    
  Step 5: [Copilot] 리팩토링 (REFACTOR)
    → 요청: "코드 리팩토링해줘"
    → 확인: 최종 코드 품질
    → 완료! ✅

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
