import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Volume2, 
  Mic, 
  MicOff, 
  Send, 
  ArrowLeft, 
  Clock,
  MessageCircle,
  CheckCircle,
  Home
} from "lucide-react";
import { InterviewConfig } from "./InterviewSetup";
import { useToast } from "@/hooks/use-toast";
import { groqService, type InterviewFeedback } from "@/services/groqService";

interface InterviewSessionProps {
  config: InterviewConfig;
  onBackToSetup: () => void;
}

interface Question {
  id: number;
  text: string;
  category: string;
}

interface Answer {
  questionId: number;
  text: string;
  feedback?: InterviewFeedback;
}

const InterviewSession = ({ config, onBackToSetup }: InterviewSessionProps) => {
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const totalQuestions = config.mode === 'quick' ? 5 : 10;
  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / Math.min(totalQuestions, questions.length)) * 100 : 0;

  // Carregar perguntas dinamicamente quando o componente monta
  useEffect(() => {
    const loadInitialQuestions = async () => {
      setIsLoadingQuestions(true);
      
      try {
        console.log('🎯 Carregando perguntas para:', config);
        const generatedQuestions = await groqService.generateQuestions(
          config.area,
          config.experience,
          totalQuestions
        );

        if (generatedQuestions.length > 0) {
          const questionsWithIds = generatedQuestions.map((text, index) => ({
            id: index + 1,
            text,
            category: index === 0 ? "Apresentação" : "Técnica"
          }));
          
          setQuestions(questionsWithIds);
          console.log('✅ Perguntas carregadas:', questionsWithIds);
        } else {
          // Fallback para perguntas padrão
          const fallbackQuestions: Question[] = [
            {
              id: 1,
              text: `Olá ${config.candidateName}! Fale-me um pouco sobre você e a sua experiência profissional em ${config.area}.`,
              category: "Apresentação Pessoal"
            },
            {
              id: 2,
              text: "Quais são as suas principais competências técnicas e como as aplicou em projetos anteriores?",
              category: "Competências Técnicas"
            },
            {
              id: 3,
              text: "Descreva uma situação desafiante que enfrentou no trabalho e como a resolveu.",
              category: "Resolução de Problemas"
            },
            {
              id: 4,
              text: "Porque está interessado nesta posição e na nossa empresa?",
              category: "Motivação"
            },
            {
              id: 5,
              text: "Onde se vê profissionalmente daqui a 5 anos?",
              category: "Objetivos Profissionais"
            }
          ];
          
          setQuestions(fallbackQuestions.slice(0, totalQuestions));
        }
      } catch (error) {
        console.error('❌ Erro ao carregar perguntas:', error);
        toast({
          title: "Erro ao carregar perguntas",
          description: "Usando perguntas padrão.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadInitialQuestions();
  }, [config, totalQuestions, toast]);

  // Limpar recognition quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Função para testar o microfone
  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microfone funcionando');
      
      toast({
        title: "Microfone OK",
        description: "O microfone está funcionando corretamente!",
      });
      
      // Parar o stream
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('❌ Erro no microfone:', error);
      
      let errorMessage = "Erro ao acessar o microfone.";
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = "Permissão de microfone negada. Ative o microfone nas configurações do navegador.";
            break;
          case 'NotFoundError':
            errorMessage = "Nenhum microfone encontrado. Conecte um microfone e tente novamente.";
            break;
          case 'NotReadableError':
            errorMessage = "Microfone está sendo usado por outro aplicativo.";
            break;
        }
      }
      
      toast({
        title: "Erro no microfone",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    }
  };

  const startSpeechRecognition = async () => {
    console.log('🎤 Tentando iniciar gravação de áudio...');
    
    // Verificar se o navegador suporta Speech Recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Funcionalidade não suportada",
        description: "O seu navegador não suporta reconhecimento de voz. Use o Chrome, Edge ou Safari.",
        variant: "destructive"
      });
      return;
    }

    // Testar o microfone primeiro
    const microphoneWorking = await testMicrophone();
    if (!microphoneWorking) {
      return;
    }

    // Verificar se já há um recognition ativo
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    try {
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR'; // Mudando para pt-BR que é mais comum
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        console.log('🎤 Gravação iniciada');
        setIsRecording(true);
        toast({
          title: "Gravação iniciada",
          description: "Pode começar a falar. A sua resposta será transcrita automaticamente.",
        });
      };

      recognition.onresult = (event) => {
        console.log('📝 Resultado recebido:', event);
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          console.log('✅ Transcrição final:', finalTranscript);
          setCurrentAnswer(prev => {
            const newAnswer = prev + finalTranscript + ' ';
            console.log('📝 Resposta atualizada:', newAnswer);
            return newAnswer;
          });
        }
      };

      recognition.onerror = (event) => {
        console.error('❌ Erro na gravação:', event.error);
        setIsRecording(false);
        
        let errorMessage = "Ocorreu um erro ao gravar.";
        switch (event.error) {
          case 'not-allowed':
            errorMessage = "Permissão de microfone negada. Ative o microfone e tente novamente.";
            break;
          case 'no-speech':
            errorMessage = "Nenhuma fala detectada. Tente falar mais próximo do microfone.";
            break;
          case 'audio-capture':
            errorMessage = "Erro ao capturar áudio. Verifique se o microfone está funcionando.";
            break;
          case 'network':
            errorMessage = "Erro de rede. Verifique sua conexão com a internet.";
            break;
        }
        
        toast({
          title: "Erro na gravação",
          description: errorMessage,
          variant: "destructive"
        });
      };

      recognition.onend = () => {
        console.log('🛑 Gravação finalizada');
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      
    } catch (error) {
      console.error('❌ Erro ao acessar microfone:', error);
      toast({
        title: "Erro de permissão",
        description: "Não foi possível acessar o microfone. Verifique as permissões do navegador.",
        variant: "destructive"
      });
    }
  };

  const stopSpeechRecognition = () => {
    console.log('🛑 Parando gravação...');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast({
        title: "Gravação parada",
        description: "Transcrição finalizada.",
      });
    }
  };

  const speakQuestion = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentQuestion.text);
      utterance.lang = 'pt-PT';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Funcionalidade não suportada",
        description: "O seu navegador não suporta síntese de voz.",
        variant: "destructive"
      });
    }
  };

  const submitAnswer = async () => {
    console.log('🚀 Tentando enviar resposta:', currentAnswer);
    
    if (!currentAnswer.trim()) {
      toast({
        title: "Resposta vazia",
        description: "Por favor, forneça uma resposta antes de continuar.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    console.log('⏳ Processando resposta...');

    try {
      // Usar o serviço do Groq para avaliar a resposta
      const feedback = await groqService.evaluateAnswer(
        currentQuestion.text,
        currentAnswer,
        config.area
      );

      const newAnswer: Answer = {
        questionId: currentQuestion.id,
        text: currentAnswer,
        feedback
      };

      setAnswers(prev => [...prev, newAnswer]);
      setShowFeedback(true);
      
      console.log('✅ Resposta processada com sucesso!');
      toast({
        title: "Resposta avaliada!",
        description: "Feedback gerado com sucesso pela IA.",
      });
    } catch (error) {
      console.error('❌ Erro ao avaliar resposta:', error);
      
      // Fallback para dados simulados em caso de erro
      const mockFeedback: InterviewFeedback = {
        score: Math.floor(Math.random() * 30) + 70,
        strengths: [
          "Resposta bem estruturada",
          "Exemplos concretos fornecidos",
          "Demonstra conhecimento técnico"
        ],
        improvements: [
          "Poderia ser mais específico em alguns pontos",
          "Adicionar mais detalhes sobre resultados obtidos"
        ],
        overall: "Avaliação offline - Verifique sua configuração da API key do Groq."
      };

      const newAnswer: Answer = {
        questionId: currentQuestion.id,
        text: currentAnswer,
        feedback: mockFeedback
      };

      setAnswers(prev => [...prev, newAnswer]);
      setShowFeedback(true);
      
      toast({
        title: "Modo offline",
        description: "Configure sua API key do Groq para avaliação completa.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const nextQuestion = async () => {
    setCurrentAnswer('');
    setShowFeedback(false);
    
    if (currentQuestionIndex < totalQuestions - 1 && currentQuestionIndex < questions.length - 1) {
      // Se ainda há perguntas na lista, vai para a próxima
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentQuestionIndex < totalQuestions - 1) {
      // Se chegou no fim das perguntas mas ainda não atingiu o limite, gera follow-up
      try {
        const lastAnswer = answers[answers.length - 1];
        if (lastAnswer) {
          console.log('🔄 Gerando pergunta de follow-up...');
          setIsProcessing(true);
          
          const followUpQuestion = await groqService.generateFollowUpQuestion(
            currentQuestion.text,
            lastAnswer.text,
            config.area
          );
          
          const newQuestion: Question = {
            id: questions.length + 1,
            text: followUpQuestion,
            category: "Follow-up"
          };
          
          setQuestions(prev => [...prev, newQuestion]);
          setCurrentQuestionIndex(prev => prev + 1);
          
          toast({
            title: "Nova pergunta gerada!",
            description: "Pergunta de follow-up baseada na sua resposta.",
          });
        }
      } catch (error) {
        console.error('❌ Erro ao gerar follow-up:', error);
        // Se não conseguir gerar follow-up, finaliza a entrevista
        setInterviewCompleted(true);
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Finaliza a entrevista
      setInterviewCompleted(true);
    }
  };

  const finishInterview = () => {
    // Voltar para a tela inicial
    onBackToSetup();
    toast({
      title: "Entrevista finalizada!",
      description: "Obrigado por participar. Boa sorte!",
    });
  };

  // Tela de carregamento
  if (isLoadingQuestions) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-lg font-semibold">Gerando perguntas personalizadas...</p>
              <p className="text-sm text-muted-foreground">
                A IA está criando perguntas específicas para {config.area}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de entrevista finalizada
  if (interviewCompleted) {
    const averageScore = answers.length > 0 
      ? Math.round(answers.reduce((sum, answer) => sum + (answer.feedback?.score || 0), 0) / answers.length)
      : 0;

    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Entrevista Finalizada!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">{averageScore}/100</div>
              <p className="text-muted-foreground">Pontuação média</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Resumo da entrevista:</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Candidato:</span> {config.candidateName}
                </div>
                <div>
                  <span className="font-medium">Área:</span> {config.area}
                </div>
                <div>
                  <span className="font-medium">Experiência:</span> {config.experience}
                </div>
                <div>
                  <span className="font-medium">Perguntas respondidas:</span> {answers.length}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={finishInterview} className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se não há pergunta atual, não renderiza nada
  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBackToSetup}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar à Configuração
          </Button>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {config.mode === 'quick' ? 'Prática Rápida' : 'Simulação Completa'}
            </Badge>
            <div className="text-sm text-muted-foreground">
              Pergunta {currentQuestionIndex + 1} de {Math.max(totalQuestions, questions.length)}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso da Entrevista</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Microfone Help */}
        {!isRecording && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Mic className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  💡 Dica: Use a gravação de voz
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Clique em "Gravar Resposta" para falar sua resposta. Funciona melhor no Chrome, Edge ou Safari.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Question Panel */}
          <Card className="shadow-interview">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Entrevistador
                </CardTitle>
                <Badge variant="outline">{currentQuestion.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-lg leading-relaxed">{currentQuestion.text}</p>
              </div>
              <Button onClick={speakQuestion} variant="outline" className="w-full">
                <Volume2 className="h-4 w-4 mr-2" />
                Ouvir Pergunta
              </Button>
            </CardContent>
          </Card>

          {/* Answer Panel */}
          <Card className="shadow-interview">
            <CardHeader>
              <CardTitle>A Sua Resposta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showFeedback ? (
                <>
                  <Textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Digite a sua resposta aqui ou use a gravação de voz..."
                    rows={8}
                    className="resize-none"
                  />
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={isRecording ? stopSpeechRecognition : startSpeechRecognition}
                      variant={isRecording ? "destructive" : "outline"}
                      className={`flex-1 ${isRecording ? 'animate-pulse' : ''}`}
                      disabled={isProcessing}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="h-4 w-4 mr-2" />
                          Parar Gravação
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-2" />
                          Gravar Resposta
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={submitAnswer}
                      disabled={!currentAnswer.trim() || isProcessing}
                      className="flex-1"
                    >
                      {isProcessing ? (
                        "Processando..."
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Resposta
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {isRecording && (
                    <div className="flex items-center justify-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                      <span className="text-sm text-red-600 dark:text-red-400">
                        Gravando... Fale agora
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="font-medium">Feedback Recebido</span>
                  </div>
                  
                  {answers[answers.length - 1]?.feedback && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span>Pontuação:</span>
                        <Badge variant="secondary">
                          {answers[answers.length - 1].feedback!.score}/100
                        </Badge>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="font-medium text-success mb-2">Pontos Fortes:</h4>
                        <ul className="text-sm space-y-1">
                          {answers[answers.length - 1].feedback!.strengths.map((strength, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-success">•</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-accent mb-2">Sugestões de Melhoria:</h4>
                        <ul className="text-sm space-y-1">
                          {answers[answers.length - 1].feedback!.improvements.map((improvement, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-accent">•</span>
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <p className="text-sm">{answers[answers.length - 1].feedback!.overall}</p>
                      </div>
                    </div>
                  )}
                  
                  <Button onClick={nextQuestion} className="w-full" disabled={isProcessing}>
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Gerando próxima pergunta...
                      </div>
                    ) : (
                      currentQuestionIndex < totalQuestions - 1 ? 'Próxima Pergunta' : 'Finalizar Entrevista'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InterviewSession;