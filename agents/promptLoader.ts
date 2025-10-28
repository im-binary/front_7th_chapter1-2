/**
 * Prompt Loader Utility
 *
 * 프롬프트 템플릿을 파일에서 로드하고 변수를 치환하는 유틸리티
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES 모듈에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PromptVariables {
  [key: string]: string;
}

/**
 * 프롬프트 파일 로드 및 변수 치환
 */
export function loadPrompt(promptFile: string, variables: PromptVariables = {}): string {
  const promptPath = path.resolve(__dirname, 'prompts', promptFile);

  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }

  let content = fs.readFileSync(promptPath, 'utf-8');

  // 변수 치환 {{variable}} -> value
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, value);
  });

  return content;
}

/**
 * TDD RED 단계 프롬프트 생성
 */
export function generateRedPhasePrompt(variables: {
  requirement: string;
  featureSpec: string;
  testDesign: string;
}): string {
  return loadPrompt('red-phase.md', variables);
}

/**
 * TDD GREEN 단계 프롬프트 생성
 */
export function generateGreenPhasePrompt(variables: {
  requirement: string;
  featureSpec: string;
  testCode: string;
}): string {
  return loadPrompt('green-phase.md', variables);
}

/**
 * TDD REFACTOR 단계 프롬프트 생성
 */
export function generateRefactorPhasePrompt(variables: {
  requirement: string;
  featureSpec: string;
  currentCode: string;
  testCode: string;
}): string {
  return loadPrompt('refactor-phase.md', variables);
}

/**
 * 기능 명세서 프롬프트 생성
 */
export function generateFeatureSelectorPrompt(
  requirement: string,
  projectStructure: string,
  relatedCode: string
): string {
  const template = loadPrompt('feature-selector.md');
  return template
    .replace(/\{\{requirement\}\}/g, requirement)
    .replace(/\{\{projectStructure\}\}/g, projectStructure)
    .replace(/\{\{relatedCode\}\}/g, relatedCode);
}

/**
 * 테스트 디자이너 프롬프트 생성
 */
export function generateTestDesignerPrompt(
  requirement: string,
  featureSelectorMarkdown: string
): string {
  const template = loadPrompt('test-designer.md');
  return template
    .replace(/\{\{requirement\}\}/g, requirement)
    .replace(/\{\{featureSelectorMarkdown\}\}/g, featureSelectorMarkdown);
}

/**
 * Agent 프롬프트 로드 (기존 에이전트용)
 */
export function loadAgentPrompt(agentName: string, variables: PromptVariables = {}): string {
  const agentFile = `${agentName}.md`;
  const agentPath = path.resolve(__dirname, agentFile);

  if (!fs.existsSync(agentPath)) {
    throw new Error(`Agent file not found: ${agentPath}`);
  }

  let content = fs.readFileSync(agentPath, 'utf-8');

  // System Prompt 섹션 추출
  const systemPromptMatch = content.match(/### System Prompt\s*```([\s\S]*?)```/);
  if (systemPromptMatch) {
    content = systemPromptMatch[1].trim();
  }

  // 변수 치환
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g');
    content = content.replace(regex, value);
  });

  return content;
}
