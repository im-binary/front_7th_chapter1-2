/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from '@google/generative-ai';

export class LLMClient {
  private geminiClient: any;
  private temperature: number;
  private maxTokens: number;

  constructor(config: any = {}) {
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 8000;

    if (!config.geminiApiKey) {
      throw new Error('GOOGLE_AI_KEY가 설정되지 않았습니다.');
    }

    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.geminiClient = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', // 최신 무료 모델 시도
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens,
      },
    });
    console.log('✅ Gemini 클라이언트 초기화 완료 (gemini-2.5-flash)\n');
  }

  async generate(prompt: string): Promise<string> {
    console.log('🤖 Gemini 호출 중...');
    const result = await this.geminiClient.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  /**
   * Markdown 형식으로 응답을 받아 반환
   * JSON보다 안정적이고 LLM이 더 잘 생성함
   */
  async generateMarkdown(prompt: string): Promise<string> {
    const instruction =
      '\n\n중요: 구조화된 Markdown 형식으로 응답하세요. 명확한 제목(##)과 목록을 사용하세요.';
    const fullPrompt = prompt + instruction;
    const response = await this.generate(fullPrompt);
    return response.trim();
  }

  getProvider() {
    return 'gemini';
  }
}

export function createLLMClient(config?: any): LLMClient {
  console.log({ 'createLLMClient config': config });

  return new LLMClient({
    geminiApiKey: process.env.GOOGLE_AI_KEY,
    temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '8000'),
  });
}
