import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Clock, User, FileText, Play } from "lucide-react";
import heroImage from "@/assets/interview-hero.jpg";

interface InterviewSetupProps {
  onStartInterview: (config: InterviewConfig) => void;
}

export interface InterviewConfig {
  mode: 'quick' | 'complete';
  area: string;
  experience: string;
  jobDescription?: string;
  candidateName: string;
}

const InterviewSetup = ({ onStartInterview }: InterviewSetupProps) => {
  const [config, setConfig] = useState<InterviewConfig>({
    mode: 'quick',
    area: '',
    experience: '',
    candidateName: '',
    jobDescription: ''
  });

  const areas = [
    'Tecnologia da Informação',
    'Marketing Digital',
    'Recursos Humanos',
    'Vendas',
    'Finanças',
    'Design',
    'Engenharia',
    'Consultoria',
    'Gestão de Projetos',
    'Outro'
  ];

  const experienceLevels = [
    'Estagiário',
    'Júnior (0-2 anos)',
    'Pleno (3-5 anos)',
    'Sénior (6-10 anos)',
    'Especialista (10+ anos)'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (config.candidateName && config.area && config.experience) {
      onStartInterview(config);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative bg-gradient-hero overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Professional interview setting with business people"
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 py-16 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simulador de Entrevista
          </h1>
          <p className="text-xl md:text-2xl opacity-90 mb-8">
            Treine, pratique e melhore as suas competências de entrevista com feedback personalizado de IA
          </p>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="max-w-2xl mx-auto p-4 -mt-8 relative z-10">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Configure a Sua Simulação
            </CardTitle>
            <CardDescription>
              Personalize a sua experiência de treino com base no seu perfil profissional
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome do Candidato */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome do Candidato
                </Label>
                <Input
                  id="name"
                  value={config.candidateName}
                  onChange={(e) => setConfig({ ...config, candidateName: e.target.value })}
                  placeholder="Digite o seu nome..."
                  required
                />
              </div>

              {/* Modo de Treino */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Modo de Treino
                </Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={config.mode === 'quick' ? 'default' : 'outline'}
                    onClick={() => setConfig({ ...config, mode: 'quick' })}
                    className="flex-1"
                  >
                    <div className="text-center">
                      <div className="font-medium">Prática Rápida</div>
                      <div className="text-xs opacity-80">5-7 perguntas</div>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={config.mode === 'complete' ? 'default' : 'outline'}
                    onClick={() => setConfig({ ...config, mode: 'complete' })}
                    className="flex-1"
                  >
                    <div className="text-center">
                      <div className="font-medium">Simulação Completa</div>
                      <div className="text-xs opacity-80">15-20 perguntas</div>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Área de Atuação */}
              <div className="space-y-2">
                <Label htmlFor="area">Área de Atuação</Label>
                <Select value={config.area} onValueChange={(value) => setConfig({ ...config, area: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a sua área..." />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nível de Experiência */}
              <div className="space-y-2">
                <Label htmlFor="experience">Nível de Experiência</Label>
                <Select value={config.experience} onValueChange={(value) => setConfig({ ...config, experience: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o seu nível..." />
                  </SelectTrigger>
                  <SelectContent>
                    {experienceLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Descrição da Vaga (Opcional) */}
              <div className="space-y-2">
                <Label htmlFor="jobDescription" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Descrição da Vaga
                  <Badge variant="secondary" className="text-xs">Opcional</Badge>
                </Label>
                <Textarea
                  id="jobDescription"
                  value={config.jobDescription}
                  onChange={(e) => setConfig({ ...config, jobDescription: e.target.value })}
                  placeholder="Cole aqui a descrição da vaga para uma simulação totalmente customizada..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Cole a descrição de uma vaga específica para receber perguntas mais direcionadas
                </p>
              </div>

              {/* Botão de Início */}
              <Button 
                type="submit" 
                className="w-full shadow-button hover:shadow-lg transition-all"
                size="lg"
                disabled={!config.candidateName || !config.area || !config.experience}
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar Simulação
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InterviewSetup;