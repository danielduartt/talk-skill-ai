import { useState, useRef } from "react";
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
  CheckCircle
} from "lucide-react";
import { InterviewConfig } from "./InterviewSetup";
import { useToast } from "@/hooks/use-toast";

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
  feedback?: {
    score: number;
    strengths: string[];
    improvements: string[];
    overall: string;
  };
}

const InterviewSession = ({ config, onBackToSetup }: InterviewSessionProps) => {
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Perguntas de exemplo (em produção virão da API)
  const sampleQuestions: Question[] = [
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

  const totalQuestions = config.mode === 'quick' ? 5 : 15;
  const currentQuestion = sampleQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const startSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-PT';

      recognition.onstart = () => {
        setIsRecording(true);
        toast({
          title: "Gravação iniciada",
          description: "Pode começar a falar. A sua resposta será transcrita automaticamente.",
        });
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setCurrentAnswer(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        toast({
          title: "Erro na gravação",
          description: "Ocorreu um erro ao gravar. Tente novamente ou use o input de texto.",
          variant: "destructive"
        });
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } else {
      toast({
        title: "Funcionalidade não suportada",
        description: "O seu navegador não suporta reconhecimento de voz. Use o input de texto.",
        variant: "destructive"
      });
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
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
    if (!currentAnswer.trim()) {
      toast({
        title: "Resposta vazia",
        description: "Por favor, forneça uma resposta antes de continuar.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    // Simular processamento da API (em produção será uma chamada real)
    setTimeout(() => {
      const mockFeedback = {
        score: Math.floor(Math.random() * 30) + 70, // 70-100
        strengths: [
          "Resposta bem estruturada",
          "Exemplos concretos fornecidos",
          "Demonstra conhecimento técnico"
        ],
        improvements: [
          "Poderia ser mais específico em alguns pontos",
          "Adicionar mais detalhes sobre resultados obtidos"
        ],
        overall: "Boa resposta geral. Demonstra experiência relevante e comunicação clara."
      };

      const newAnswer: Answer = {
        questionId: currentQuestion.id,
        text: currentAnswer,
        feedback: mockFeedback
      };

      setAnswers(prev => [...prev, newAnswer]);
      setShowFeedback(true);
      setIsProcessing(false);
    }, 2000);
  };

  const nextQuestion = () => {
    setCurrentAnswer('');
    setShowFeedback(false);
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

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
              Pergunta {currentQuestionIndex + 1} de {totalQuestions}
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
                      className="flex-1"
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
                  
                  <Button onClick={nextQuestion} className="w-full">
                    {currentQuestionIndex < totalQuestions - 1 ? 'Próxima Pergunta' : 'Finalizar Entrevista'}
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