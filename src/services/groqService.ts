interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

interface InterviewFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  overall: string;
}

class GroqService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_GROQ_API_KEY;
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.groq.com/openai/v1';
    
    if (!this.apiKey) {
      console.warn('VITE_GROQ_API_KEY não encontrada. Usando modo simulação.');
    }
  }

  private async makeRequest(messages: GroqMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API Key do Groq não configurada');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', // Modelo mais recente baseado na documentação
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Resposta da API:', errorData);
        throw new Error(`Erro na API: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const data: GroqResponse = await response.json();
      console.log('Resposta da API recebida:', data);
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Erro ao chamar a API do Groq:', error);
      throw error;
    }
  }

  async evaluateAnswer(question: string, answer: string, jobRole: string): Promise<InterviewFeedback> {
    console.log('🔍 Iniciando avaliação:', { question, answer, jobRole });
    
    const systemPrompt = `Você é um especialista em recursos humanos e recrutamento técnico. 
    Sua tarefa é avaliar respostas de entrevistas de emprego para a posição de ${jobRole}.
    
    Analise a resposta fornecida e retorne um JSON válido com a seguinte estrutura exata:
    {
      "score": número de 0 a 100,
      "strengths": ["ponto forte 1", "ponto forte 2"],
      "improvements": ["melhoria 1", "melhoria 2"],
      "overall": "feedback geral em uma frase"
    }
    
    IMPORTANTE: Retorne APENAS o JSON, sem texto adicional antes ou depois.`;

    const userPrompt = `Pergunta da entrevista: "${question}"
    
    Resposta do candidato: "${answer}"
    
    Avalie esta resposta e forneça feedback em JSON.`;

    try {
      const messages: GroqMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      console.log('📤 Enviando mensagens para Groq:', messages);
      const response = await this.makeRequest(messages);
      console.log('📥 Resposta bruta da API:', response);
      
      // Tentar parsear a resposta JSON
      try {
        // Limpar a resposta removendo possível texto extra
        const cleanResponse = response.trim();
        const jsonStart = cleanResponse.indexOf('{');
        const jsonEnd = cleanResponse.lastIndexOf('}') + 1;
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonString = cleanResponse.substring(jsonStart, jsonEnd);
          console.log('🔧 JSON extraído:', jsonString);
          
          const feedback = JSON.parse(jsonString);
          console.log('✅ Feedback parseado:', feedback);
          
          return {
            score: feedback.score || 70,
            strengths: Array.isArray(feedback.strengths) ? feedback.strengths : ["Resposta fornecida"],
            improvements: Array.isArray(feedback.improvements) ? feedback.improvements : ["Continue praticando"],
            overall: feedback.overall || "Feedback gerado pela IA"
          };
        }
      } catch (parseError) {
        console.error('❌ Erro ao parsear resposta da IA:', parseError);
        console.log('📄 Resposta que causou erro:', response);
      }
      
      // Fallback se não conseguir parsear o JSON
      return {
        score: 75,
        strengths: ["Resposta analisada pela IA"],
        improvements: ["Continue desenvolvendo suas habilidades"],
        overall: response.length > 200 ? response.substring(0, 200) + "..." : response
      };
      
    } catch (error) {
      console.error('❌ Erro ao avaliar resposta:', error);
      // Fallback para modo offline/erro
      return {
        score: Math.floor(Math.random() * 30) + 70,
        strengths: [
          "Resposta bem estruturada",
          "Demonstra conhecimento na área"
        ],
        improvements: [
          "Poderia ser mais específico",
          "Adicionar exemplos práticos"
        ],
        overall: `Erro na avaliação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  async generateQuestions(jobRole: string, experienceLevel: string, count: number = 5): Promise<string[]> {
    const systemPrompt = `Você é um especialista em recrutamento técnico. 
    Gere ${count} perguntas de entrevista relevantes para a posição de ${jobRole} 
    com nível de experiência ${experienceLevel}.
    
    Retorne apenas um array JSON de strings com as perguntas, sem explicações adicionais.
    
    Exemplo de formato de resposta:
    [
      "Pergunta 1 aqui",
      "Pergunta 2 aqui"
    ]`;

    const userPrompt = `Gere ${count} perguntas de entrevista para ${jobRole} (nível ${experienceLevel}).`;

    try {
      const messages: GroqMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const response = await this.makeRequest(messages);
      
      try {
        const questions = JSON.parse(response);
        return Array.isArray(questions) ? questions : [];
      } catch (parseError) {
        console.error('Erro ao parsear perguntas:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Erro ao gerar perguntas:', error);
      return [];
    }
  }
}

export const groqService = new GroqService();
export type { InterviewFeedback };