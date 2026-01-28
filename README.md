## WhatsApp Chatbot Inteligente

Bot em Node.js para automação de atendimento via WhatsApp. Ideal para lojas e sistemas que precisam de respostas automáticas e interações básicas.

🚀 Instalação e Uso

Instale com ```npm install @whiskeysockets/baileys google-tts-api pino```. Execute ```node bot.js``` e escaneie o QR Code no WhatsApp.

📁 Estrutura
``
· bot.js - Código principal
· auth/ - Autenticação automática (gerado após primeira execução)
``
⚙️ Controles Principais

· `respostaEmAudio - true/false para respostas em áudio`
· `ausente - true/false para modo ausente`
· `mensagemAusente - Mensagem quando ausente`
· `similaridadeMinima - Sensibilidade do reconhecimento (0-1)`

**🧠 Funcionamento**

O bot usa similaridade de texto para entender mensagens e responde conforme base de conhecimento. Suporta comandos personalizados via mini-biblioteca interna e logs em tempo real.

Projeto para portfólio e automações simples.
