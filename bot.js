
/**
 * Chatbot Inteligente WhatsApp
 * Autor: Braga-devs
 * Instagram: braga-devs
 *
 * Funcionalidades:
 * - Inteligência para reconhecer mensagens similares
 * - Base de conhecimento extensiva
 * - Resposta em texto ou áudio (Google TTS)
 * - Modo ausente global
 * - Logs detalhados em tabela
 * - Mini biblioteca para facilitar criação de comandos/respostas
 * - Pergunta de reconexão ao iniciar
 *
 * Futuras atualizações:
 * - Envio de imagens
 * - Botões e menus interativos
 * - Automação avançada
 * - Aprendizado com base nas conversas
 */

const readline = require('readline')
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const googleTTS = require('google-tts-api')
const https = require('https')

/* ================= MINI BIBLIOTECA INTERNA ================= */
const Biblioteca = {
  comandos: {}, // comandos personalizados
  respostas: {}, // respostas adicionais

  // Registrar comando
  registrarComando: function(chave, funcao) {
    this.comandos[chave.toLowerCase()] = funcao
  },

  // Registrar resposta automática
  registrarResposta: function(chave, resposta) {
    this.respostas[chave.toLowerCase()] = resposta
  },

  // Verificar se mensagem é comando
  executarComando: async function(mensagem, sock, jid) {
    const cmd = mensagem.toLowerCase()
    if (this.comandos[cmd]) {
      await this.comandos[cmd](sock, jid, mensagem)
      return true
    }
    return false
  },

  // Obter resposta extra
  obterRespostaExtra: function(mensagem) {
    return this.respostas[mensagem.toLowerCase()] || null
  }
}

/* ================= CONFIGURAÇÕES GLOBAIS ================= */
let respostaEmAudio = true  // true = só áudio, false = texto
let ausente = true          // true = todas as mensagens recebem aviso de ausência
const mensagemAusente = 'Oi! No momento estou ocupado, mas estarei disponível a partir das 20:00. Assim que puder, te respondo. Desde já, agradeço a compreensão!';
const similaridadeMinima = 0.6

/* ================= BASE DE CONHECIMENTO ================= */
const baseConhecimento = [
  { chaves: ['oi', 'olá', 'ola', 'eae', 'fala'], resposta: 'Oi! Como posso te ajudar?' },
  { chaves: ['bom dia'], resposta: 'Bom dia! Que seu dia seja incrível ☀️' },
  { chaves: ['boa tarde'], resposta: 'Boa tarde! Em que posso ajudar?' },
  { chaves: ['boa noite'], resposta: 'Boa noite! Precisa de algo?' },
  { chaves: ['tudo bem', 'como vai', 'ta tudo bem'], resposta: 'Estou bem! E você?' },
  { chaves: ['quem é você', 'seu nome'], resposta: 'Sou um chatbot inteligente do WhatsApp criado por Braga-devs.' },
  { chaves: ['ajuda', 'socorro', 'o que você faz'], resposta: 'Posso responder suas perguntas automaticamente e te ajudar com informações básicas.' },
  { chaves: ['obrigado', 'valeu', 'brigado'], resposta: 'De nada! 😊 Sempre à disposição.' },
  { chaves: ['teste', 'teste bot'], resposta: 'Teste recebido com sucesso ✅' },
  { chaves: ['ping'], resposta: 'pong 🏓' },
  { chaves: ['legal', 'muito bom', 'ótimo', 'otimo'], resposta: 'Fico feliz que você gostou 😄' },
  { chaves: ['ruim', 'triste'], resposta: 'Poxa 😕 espero melhorar sua experiência.' },
  { chaves: ['kkk', 'haha', 'rs'], resposta: '😂😂😂' },
  { chaves: ['preço', 'quanto custa'], resposta: 'Para informações sobre preços, entre em contato com o administrador.' },
  { chaves: ['horário', 'horario'], resposta: 'Meu horário de atendimento é de 09:00 às 18:00.' },
  { chaves: ['bom trabalho'], resposta: 'Obrigado! Estamos sempre buscando melhorar.' },
  { chaves: ['problema', 'erro', 'bug'], resposta: 'Sinto muito pelo inconveniente. Pode detalhar melhor o problema?' },
  { chaves: ['oii', 'olaa'], resposta: 'Oi! Tudo bem? 😄' },
  { chaves: ['ajuda me', 'me ajuda'], resposta: 'Claro! Me diga como posso te ajudar.' },
  { chaves: ['obrigada', 'valeu demais'], resposta: 'De nada! 😉' },
  { chaves: ['oi bot'], resposta: 'Oi! Eu sou seu assistente virtual 🤖' },
  { chaves: ['bom', 'ótimo'], resposta: 'Que bom! 😄' },
  { chaves: ['não sei', 'nao sei'], resposta: 'Tudo bem, posso tentar te ajudar a descobrir 😄' },
  { chaves: ['eae tudo bem'], resposta: 'Tudo certo! E você? 😎' },
  { chaves: ['quero saber'], resposta: 'Me diga exatamente o que você quer saber 😉' },
  { chaves: ['ok', 'certo'], resposta: 'Perfeito! 👍' },
  { chaves: ['opa'], resposta: 'Opa! 👋' },
  { chaves: ['fala ai'], resposta: 'Fala aí! 😎' },
  { chaves: ['boa'], resposta: 'Que bom! 😄' },
  { chaves: ['ruim mesmo'], resposta: 'Que pena 😕 Espero melhorar sua experiência.' },
  { chaves: ['testando'], resposta: 'Recebi sua mensagem de teste ✅' },
  { chaves: ['bom diaaa'], resposta: 'Bom dia! Espero que seu dia seja incrível ☀️' },
  { chaves: ['boa tardeaa'], resposta: 'Boa tarde! Em que posso ajudar?' },
  { chaves: ['boa noiteee'], resposta: 'Boa noite! Precisa de algo?' }
]

/* ================= FUNÇÕES DE INTELIGÊNCIA ================= */
function calcularDistanciaLevenshtein(a, b) {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matriz = []
  for (let i = 0; i <= b.length; i++) matriz[i] = [i]
  for (let j = 0; j <= a.length; j++) matriz[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) matriz[i][j] = matriz[i - 1][j - 1]
      else matriz[i][j] = Math.min(matriz[i - 1][j - 1] + 1, matriz[i][j - 1] + 1, matriz[i - 1][j] + 1)
    }
  }
  return matriz[b.length][a.length]
}

function calcularSimilaridade(a, b) {
  return 1 - calcularDistanciaLevenshtein(a, b) / Math.max(a.length, b.length)
}

function gerarResposta(texto) {
  let melhor = { score: 0, resposta: null }

  for (const item of baseConhecimento) {
    for (const chave of item.chaves) {
      const score = calcularSimilaridade(texto, chave)
      if (score > melhor.score) {
        melhor = { score, resposta: item.resposta }
      }
    }
  }

  if (melhor.score >= similaridadeMinima) return melhor.resposta
  return `Você quis dizer: "${melhor.resposta || 'não entendi'}"?`
}

/* ================= FUNÇÕES DE ÁUDIO ================= */
function baixarAudio(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const data = []
      res.on('data', chunk => data.push(chunk))
      res.on('end', () => resolve(Buffer.concat(data)))
    }).on('error', reject)
  })
}

async function enviarAudio(sock, jid, texto) {
  const url = googleTTS.getAudioUrl(texto, { lang: 'pt', slow: false, host: 'https://translate.google.com' })
  const bufferAudio = await baixarAudio(url)
  await sock.sendMessage(jid, { audio: bufferAudio, mimetype: 'audio/mp4', ptt: true })
}

/* ================= FUNÇÃO DE LOG ================= */
function logMensagem(usuario, mensagem, resposta, modo) {
  const agora = new Date()
  console.table({
    'Horário': agora.toLocaleString(),
    'De': usuario,
    'Mensagem Recebida': mensagem,
    'Resposta Enviada': resposta,
    'Modo': modo
  })
}

/* ================= FUNÇÃO PARA PERGUNTAR AO USUÁRIO ================= */
async function perguntarUsuario(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(prompt, ans => { rl.close(); resolve(ans.trim()) }))
}

/* ================= BOT ================= */
async function iniciarBot() {

  console.log('🤖 Chatbot Inteligente Braga-devs')
  console.log('📌 Créditos: Braga-devs | Instagram: braga-devs')
  console.log('---------------------------------------------')

  // Pergunta se deseja reconectar ou continuar
  const resposta = await perguntarUsuario('Deseja reconectar com outro número? (s/n): ')
  if (resposta.toLowerCase() === 's') console.log('🔄 Reconectando com novo número...')

  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }), browser: ['Bot Braga-devs', 'Chrome', '1.0'] })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log('✅ Bot conectado e pronto!')
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code !== DisconnectReason.loggedOut) iniciarBot()
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg?.message || msg.key.fromMe) return

    const jid = msg.key.remoteJid
    if (jid.endsWith('@g.us')) return

    const texto = msg.message.conversation || msg.message.extendedTextMessage?.text
    if (!texto) return

    const textoLimpo = texto.toLowerCase().trim()
    let respostaBot = ''

    // ================= MODO AUSENTE =================
    if (ausente) {
      respostaBot = mensagemAusente
      if (respostaEmAudio) await enviarAudio(sock, jid, respostaBot)
      else await sock.sendMessage(jid, { text: respostaBot })
      logMensagem(jid, texto, respostaBot, respostaEmAudio ? 'Áudio' : 'Texto')
      return
    }

    // ================= VERIFICAR COMANDOS DA MINI BIBLIOTECA =================
    const executouComando = await Biblioteca.executarComando(textoLimpo, sock, jid)
    if (executouComando) return

    // ================= VERIFICAR RESPOSTAS EXTRAS DA MINI BIBLIOTECA =================
    const respostaExtra = Biblioteca.obterRespostaExtra(textoLimpo)
    if (respostaExtra) {
      respostaBot = respostaExtra
      if (respostaEmAudio) await enviarAudio(sock, jid, respostaBot)
      else await sock.sendMessage(jid, { text: respostaBot })
      logMensagem(jid, texto, respostaBot, respostaEmAudio ? 'Áudio' : 'Texto')
      return
    }

    // ================= RESPOSTA NORMAL =================
    respostaBot = gerarResposta(textoLimpo)
    if (respostaEmAudio) await enviarAudio(sock, jid, respostaBot)
    else await sock.sendMessage(jid, { text: respostaBot })

    logMensagem(jid, texto, respostaBot, respostaEmAudio ? 'Áudio' : 'Texto')
  })
}

/* ================= INICIAR BOT ================= */
iniciarBot()