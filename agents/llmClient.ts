/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from '@google/generative-ai';

export class LLMClient {
  private geminiClient: any;
  private temperature: number;
  private maxTokens: number;

  constructor(config: any = {}) {
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 30000;

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
    console.log(`📊 프롬프트 크기: ${prompt.length} 문자`);

    try {
      // 타임아웃 설정 (5분)
      const timeoutMs = 5 * 60 * 1000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Gemini API 타임아웃 (${timeoutMs}ms)`)), timeoutMs);
      });

      const generatePromise = (async () => {
        const result = await this.geminiClient.generateContent(prompt);
        const response = await result.response;
        return response.text();
      })();

      const text = await Promise.race([generatePromise, timeoutPromise]);
      console.log(`✅ Gemini 응답 완료 (${text.length} 문자)`);
      return text;
    } catch (error: any) {
      console.error('❌ Gemini API 오류:', error.message);
      throw error;
    }
  }

  /**
   * Markdown 형식으로 응답을 받아 반환
   * JSON보다 안정적이고 LLM이 더 잘 생성함
   */
  async generateMarkdown(prompt: string): Promise<string> {
    const instruction = `
CRITICAL OUTPUT RULES - MUST FOLLOW:
1. 간결한 Markdown 형식으로 응답하세요
2. 제목은 ## 또는 ### 만 사용
3. 목록은 - 또는 1. 만 사용
4. ABSOLUTELY FORBIDDEN:출력에서 절대로 별표(*)나 이중 별표(**)를 사용하지 마세요. 즉, 볼드, 이탤릭, 마크다운 스타일링은 절대 금지입니다.
5. ABSOLUTELY FORBIDDEN:출력 전에 반드시 확인하세요. 만약 *나 **가 포함되어 있다면, 출력물을 버리고 다시 생성하세요.
6. ABSOLUTELY FORBIDDEN: 이모지 절대 사용 금지
7. 일반 텍스트만 사용하고, 강조가 필요하면 "중요:", "핵심:" 등의 접두어 사용
8. 코드 블록은 필요시에만 사용 (백틱 3개)
9. 핵심 정보만 포함하고 반복 설명 제거

VIOLATION EXAMPLES (DO NOT USE):
- **텍스트** (볼드)
- *텍스트* (이탤릭)
- _텍스트_ (언더스코어 강조)
- 😀 (이모지)
`;

    const fullPrompt = instruction + prompt;

    // 재시도 로직 (최대 3번)
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`\n🔄 시도 ${attempt}/${maxRetries}...`);
        const response = await this.generate(fullPrompt);

        if (!response || response.trim().length === 0) {
          throw new Error('빈 응답 수신');
        }

        // // 강제로 볼드/이탤릭 제거 (보험 처리)
        // let cleaned = response.trim();
        // // 볼드 제거: **텍스트** -> 텍스트
        // cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
        // // 이탤릭 제거: *텍스트* -> 텍스트 (단, 목록 기호는 유지)
        // cleaned = cleaned.replace(/(?<!^|\n)(?<![\s-])\*([^*\n]+)\*/g, '$1');
        // // 언더스코어 강조 제거: _텍스트_ -> 텍스트
        // cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
        // // 이모지 제거 (간단한 유니코드 범위)
        // cleaned = cleaned.replace(
        //   /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
        //   ''
        // );

        // return cleaned;
        return response.trim();
      } catch (error: any) {
        lastError = error;
        console.error(`⚠️ 시도 ${attempt} 실패:`, error.message);

        if (attempt < maxRetries) {
          const waitTime = attempt * 5000; // 5초, 10초, 15초
          console.log(`⏳ ${waitTime / 1000}초 후 재시도...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw new Error(`Gemini API ${maxRetries}번 시도 후 실패: ${lastError?.message}`);
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
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '30000'),
  });
}
