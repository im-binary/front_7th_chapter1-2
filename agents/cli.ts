#!/usr/bin/env node
/**
 * Agent Orchestrator CLI
 *
 * 커맨드라인에서 에이전트 워크플로우를 실행하는 CLI 도구
 */

import { runWorkflow } from './orchestrator';

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
    const result = await runWorkflow(requirement);

    // 종료 코드 설정
    process.exit(result.status === 'success' ? 0 : 1);
  } catch (error) {
    console.error('💥 워크플로우 실행 중 오류 발생:', error);
    process.exit(1);
  }
}

/**
 * 도움말 출력
 */
function printHelp() {
  console.log(`
🤖 Agent Orchestrator CLI

사용법:
  pnpm agent:run [options]

옵션:
  -r, --requirement <text>    개발할 기능 요구사항
  -h, --help                  도움말 표시
  -v, --version               버전 표시

예시:
  # 기본 사용
  pnpm agent:run -r "일정 제목에 '[추가합니다]' 접두사 추가"

  # 복잡한 요구사항
  pnpm agent:run --requirement "반복 일정 기능 추가: 일간/주간/월간 반복 지원"

워크플로우 단계:
  1️⃣ Feature Selector - 요구사항 분석 및 기능 명세
  2️⃣ Test Designer   - 테스트 케이스 설계
  3️⃣ Test Writer     - 테스트 코드 작성 (RED)
  4️⃣ Test Validator  - 구현 및 검증 (GREEN)
  5️⃣ Refactoring     - 코드 품질 개선 (REFACTOR)

자세한 내용: https://github.com/your-repo/agents
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
