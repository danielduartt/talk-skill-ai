// Teste rápido da integração com Groq
import { groqService } from '../services/groqService';

// Função para testar a API do Groq
export const testGroqIntegration = async () => {
  try {
    console.log('🧪 Testando integração com Groq...');
    
    // Teste simples de avaliação
    const feedback = await groqService.evaluateAnswer(
      "Fale sobre sua experiência profissional",
      "Tenho 5 anos de experiência em desenvolvimento web, trabalhando principalmente com React e Node.js",
      "Desenvolvedor Frontend"
    );
    
    console.log('✅ Teste bem-sucedido!');
    console.log('📊 Feedback recebido:', feedback);
    return true;
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return false;
  }
};

// Executar teste automaticamente no desenvolvimento
if (import.meta.env.DEV) {
  console.log('🚀 Modo desenvolvimento detectado');
  console.log('💡 Para testar a IA, abra o console do navegador em http://localhost:8080');
  console.log('💡 E execute: window.testGroq()');
}

// Disponibilizar função globalmente para testes
if (typeof window !== 'undefined') {
  (window as any).testGroq = testGroqIntegration;
}