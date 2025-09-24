import { useState } from "react";
import InterviewSetup, { InterviewConfig } from "@/components/InterviewSetup";
import InterviewSession from "@/components/InterviewSession";

type AppState = 'setup' | 'interview' | 'results';

const Index = () => {
  const [appState, setAppState] = useState<AppState>('setup');
  const [interviewConfig, setInterviewConfig] = useState<InterviewConfig | null>(null);

  const handleStartInterview = (config: InterviewConfig) => {
    setInterviewConfig(config);
    setAppState('interview');
  };

  const handleBackToSetup = () => {
    setAppState('setup');
    setInterviewConfig(null);
  };

  return (
    <div className="min-h-screen">
      {appState === 'setup' && (
        <InterviewSetup onStartInterview={handleStartInterview} />
      )}
      
      {appState === 'interview' && interviewConfig && (
        <InterviewSession 
          config={interviewConfig} 
          onBackToSetup={handleBackToSetup}
        />
      )}
    </div>
  );
};

export default Index;
