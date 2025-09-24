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
    
    const systemPrompt = `Você é um especialista em recursos humanos e recrutamento técnico especializado em ${jobRole}.

Analise a resposta da entrevista e forneça uma avaliação justa e realista.

CRITÉRIOS DE PONTUAÇÃO:
- 90-100: Resposta excepcional, completa, com exemplos específicos e demonstra expertise
- 80-89: Resposta muito boa, bem estruturada, com alguns exemplos
- 70-79: Resposta adequada, cobre o básico, mas pode ser mais específica
- 60-69: Resposta parcial, falta detalhes ou exemplos
- 50-59: Resposta superficial, demonstra conhecimento limitado
- 40-49: Resposta inadequada, muitas lacunas
- 30-39: Resposta fraca, não demonstra conhecimento necessário
- 0-29: Resposta muito inadequada ou irrelevante

Seja rigoroso mas justo na avaliação. Considere:
- Clareza e estrutura da resposta
- Conhecimento técnico demonstrado  
- Exemplos práticos fornecidos
- Relevância para a posição
- Comunicação efetiva
- Profundidade da resposta

IMPORTANTE: Varie a pontuação de acordo com a qualidade real da resposta. Não use sempre a mesma pontuação.

Retorne APENAS um JSON válido sem explicações adicionais:
{
  "score": [número inteiro de 0-100 baseado rigorosamente nos critérios],
  "strengths": ["força específica 1", "força específica 2"],
  "improvements": ["melhoria específica 1", "melhoria específica 2"],  
  "overall": "comentário objetivo sobre a resposta"
}`;

    const userPrompt = `POSIÇÃO: ${jobRole}

PERGUNTA: "${question}"

RESPOSTA DO CANDIDATO: "${answer}"

Avalie esta resposta seguindo os critérios estabelecidos e retorne o JSON com a pontuação apropriada.`;

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
        let cleanResponse = response.trim();
        
        // Remover possíveis markdown code blocks
        cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Encontrar o JSON
        const jsonStart = cleanResponse.indexOf('{');
        const jsonEnd = cleanResponse.lastIndexOf('}') + 1;
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonString = cleanResponse.substring(jsonStart, jsonEnd);
          console.log('🔧 JSON extraído:', jsonString);
          
          const feedback = JSON.parse(jsonString);
          console.log('✅ Feedback parseado:', feedback);
          
          // Validar se o score é um número válido
          const score = typeof feedback.score === 'number' && feedback.score >= 0 && feedback.score <= 100 
            ? feedback.score 
            : this.calculateFallbackScore(answer);
          
          return {
            score,
            strengths: Array.isArray(feedback.strengths) && feedback.strengths.length > 0 
              ? feedback.strengths 
              : ["Resposta fornecida pelo candidato"],
            improvements: Array.isArray(feedback.improvements) && feedback.improvements.length > 0 
              ? feedback.improvements 
              : ["Continue desenvolvendo suas habilidades"],
            overall: typeof feedback.overall === 'string' && feedback.overall.length > 10
              ? feedback.overall 
              : "Feedback gerado pela IA"
          };
        }
      } catch (parseError) {
        console.error('❌ Erro ao parsear resposta da IA:', parseError);
        console.log('📄 Resposta que causou erro:', response);
      }
      
      // Fallback inteligente se não conseguir parsear o JSON
      const fallbackScore = this.calculateFallbackScore(answer);
      return {
        score: fallbackScore,
        strengths: ["Resposta analisada pela IA"],
        improvements: ["Continue desenvolvendo suas habilidades"],
        overall: response.length > 200 ? response.substring(0, 200) + "..." : response
      };
      
    } catch (error) {
      console.error('❌ Erro ao avaliar resposta:', error);
      // Fallback inteligente para modo offline/erro
      const fallbackScore = this.calculateFallbackScore(answer);
      
      return {
        score: fallbackScore,
        strengths: [
          fallbackScore > 70 ? "Resposta bem estruturada" : "Resposta fornecida",
          fallbackScore > 60 ? "Demonstra conhecimento na área" : "Tentou responder à pergunta"
        ],
        improvements: [
          fallbackScore < 70 ? "Adicionar mais detalhes específicos" : "Poderia ser mais específico em alguns pontos",
          fallbackScore < 60 ? "Incluir exemplos práticos da experiência" : "Expandir com exemplos adicionais"
        ],
        overall: fallbackScore > 70 
          ? "Resposta adequada, mas avaliação limitada - verifique sua API key do Groq" 
          : "Resposta pode ser melhorada - verifique sua API key do Groq para feedback completo"
      };
    }
  }

  async generateQuestions(jobRole: string, experienceLevel: string, count: number = 5): Promise<string[]> {
    console.log('🎯 Gerando perguntas para:', { jobRole, experienceLevel, count });
    
    const systemPrompt = `Você é um especialista em recrutamento técnico. 
    Gere ${count} perguntas de entrevista relevantes e variadas para a posição de ${jobRole} 
    com nível de experiência ${experienceLevel}.
    
    As perguntas devem ser:
    - Específicas para a área de ${jobRole}
    - Adequadas ao nível ${experienceLevel}
    - Variadas (técnicas, comportamentais, situacionais)
    - Em português brasileiro
    - Uma pergunta de apresentação inicial
    
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
      console.log('📥 Perguntas recebidas:', response);
      
      try {
        // Limpar a resposta removendo possível texto extra
        const cleanResponse = response.trim();
        const jsonStart = cleanResponse.indexOf('[');
        const jsonEnd = cleanResponse.lastIndexOf(']') + 1;
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          const jsonString = cleanResponse.substring(jsonStart, jsonEnd);
          const questions = JSON.parse(jsonString);
          
          if (Array.isArray(questions) && questions.length > 0) {
            console.log('✅ Perguntas geradas:', questions);
            return questions;
          }
        }
      } catch (parseError) {
        console.error('❌ Erro ao parsear perguntas:', parseError);
      }
      
      // Fallback para perguntas padrão
      return this.getFallbackQuestions(jobRole);
    } catch (error) {
      console.error('❌ Erro ao gerar perguntas:', error);
      return this.getFallbackQuestions(jobRole);
    }
  }

  async generateFollowUpQuestion(previousQuestion: string, candidateAnswer: string, jobRole: string): Promise<string> {
    console.log('🔄 Gerando pergunta de follow-up para:', { previousQuestion, candidateAnswer });
    
    const systemPrompt = `Você é um entrevistador experiente para a posição de ${jobRole}.
    
    Com base na pergunta anterior e na resposta do candidato, gere uma pergunta de follow-up inteligente que:
    - Aprofunde aspectos interessantes da resposta
    - Peça exemplos específicos se necessário
    - Explore competências técnicas ou comportamentais relevantes
    - Seja natural e conversacional
    
    Retorne apenas a pergunta de follow-up, sem explicações adicionais.`;

    const userPrompt = `Pergunta anterior: "${previousQuestion}"
    
    Resposta do candidato: "${candidateAnswer}"
    
    Gere uma pergunta de follow-up relevante.`;

    try {
      const messages: GroqMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const response = await this.makeRequest(messages);
      const followUpQuestion = response.trim().replace(/^["']|["']$/g, ''); // Remove aspas se houver
      
      console.log('✅ Follow-up gerado:', followUpQuestion);
      return followUpQuestion;
    } catch (error) {
      console.error('❌ Erro ao gerar follow-up:', error);
      return "Pode dar um exemplo específico de uma situação onde aplicou essa experiência?";
    }
  }

  private calculateFallbackScore(answer: string): number {
    if (!answer || answer.trim().length === 0) {
      return 20; // Resposta vazia
    }
    
    const wordCount = answer.trim().split(/\s+/).length;
    const hasExamples = /exemplo|experiência|projeto|trabalh|desenvolv|implement|criei|fiz|usei/i.test(answer);
    const hasTechnicalTerms = /tecnologia|framework|linguagem|ferramenta|metodologia|processo/i.test(answer);
    const isWellStructured = answer.includes('.') && wordCount > 20;
    
    let score = 40; // Base score
    
    // Pontuação baseada no comprimento
    if (wordCount > 100) score += 15;
    else if (wordCount > 50) score += 10;
    else if (wordCount > 20) score += 5;
    
    // Pontuação baseada no conteúdo
    if (hasExamples) score += 15;
    if (hasTechnicalTerms) score += 10;
    if (isWellStructured) score += 10;
    
    // Garantir que está no range correto
    return Math.min(Math.max(score, 25), 85);
  }

  private getFallbackQuestions(jobRole: string): string[] {
    const fallbackQuestions = {
      'Desenvolvedor Frontend': [
        "Fale sobre sua experiência com desenvolvimento frontend e as tecnologias que domina.",
        "Como você aborda a responsividade e acessibilidade em seus projetos?",
        "Descreva um desafio técnico complexo que enfrentou recentemente e como resolveu.",
        "Como você mantém seus conhecimentos atualizados na área de frontend?",
        "Fale sobre sua experiência com ferramentas de versionamento e trabalho em equipe."
      ],
      'Desenvolvedor Backend': [
        "Descreva sua experiência com desenvolvimento backend e as tecnologias que utiliza.",
        "Como você projeta e implementa APIs REST eficientes?",
        "Fale sobre sua experiência com bancos de dados e otimização de queries.",
        "Como você lida com segurança e autenticação em aplicações backend?",
        "Descreva um projeto onde implementou uma solução escalável."
      ]
    };

    return fallbackQuestions[jobRole as keyof typeof fallbackQuestions] || [
      `Fale sobre sua experiência profissional na área de ${jobRole}.`,
      "Quais são suas principais competências técnicas?",
      "Descreva um desafio que enfrentou e como o resolveu.",
      "Como você se mantém atualizado na sua área?",
      "Onde se vê profissionalmente nos próximos anos?"
    ];
  }
}

export const groqService = new GroqService();
export type { InterviewFeedback };