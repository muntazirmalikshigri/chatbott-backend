import p from 'pino'
import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    proto,
    WASocket,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import * as fs from 'fs'
import * as path from 'path'
import * as QRCode from 'qrcode'
import whatsappSessionModel from './whatsapp-session.model'
import agentService from '../agent/agent.service'
import ragService from '../chat/rag.service'
import { generateChatCompletion } from '../../shared/utils/ai-client'
import logger from '../../handlers/logger'



const baileysLogger = p({ level: 'silent' })
const activeSockets = new Map<string, WASocket>()
const qrCodes = new Map<string, string>()
const connectionStatus = new Map<string, 'connecting' | 'connected' | 'disconnected'>()

const SESSION_DIR = path.join(process.cwd(), 'whatsapp-sessions')
if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true })

const getSessionPath = (companyId: string) => path.join(SESSION_DIR, companyId)

const handleIncomingMessage = async (companyId: string, sock: WASocket, message: proto.IWebMessageInfo) => {
    try {
       const from = message.key?.remoteJid
        if (!from) return
        if (from.includes('@g.us') || from === 'status@broadcast') return

        const text = message.message?.conversation
            || message.message?.extendedTextMessage?.text
            || ''
        if (!text.trim()) return

        logger.info('WhatsApp message received', { meta: { companyId, from, message: text.slice(0, 100) } })

        const agents = await agentService.getAgentsByCompany(companyId)
        const agent = agents[0]
        if (!agent) return

        let ragContext
        try {
            ragContext = await ragService.buildContext(agent._id.toString(), text, 5)
        } catch {
            ragContext = { chunks: [], contextText: 'No relevant knowledge found.', sources: [] }
        }

        const messages = ragService.buildMessages(agent, text, ragContext.contextText, [])

        let replyText = ''
        try {
            const aiResponse = await generateChatCompletion(messages)
            replyText = aiResponse.content
        } catch {
            replyText = 'Sorry, I am unable to answer right now. Please try again later.'
        }

        await sock.sendMessage(from, { text: replyText })
        logger.info('WhatsApp reply sent', { meta: { companyId, to: from } })
    } catch (error) {
        logger.error('Error handling WhatsApp message', {
            meta: { companyId, error: error instanceof Error ? error.message : String(error) }
        })
    }
}

const connectCompany = async (companyId: string): Promise<void> => {
    try {
        const currentStatus = connectionStatus.get(companyId)
        if (currentStatus === 'connecting' || currentStatus === 'connected') return

        connectionStatus.set(companyId, 'connecting')
        qrCodes.delete(companyId)

        const sessionPath = getSessionPath(companyId)
        if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true })

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
        const { version } = await fetchLatestBaileysVersion()

    

    // const sock = makeWASocket({
    //   version,
    //   auth: {
    //     creds: state.creds,
    //     keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
    // },
    //   printQRInTerminal: false,  // deprecated warning hatao
    //   logger: baileysLogger,     // custom logger ki jagah baileysLogger
    //   generateHighQualityLinkPreview: false,
    // })

    // printQRInTerminal: false karo
    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
      },
      printQRInTerminal: false,  // ← false karo
      logger: baileysLogger,
      generateHighQualityLinkPreview: false,
   })

        activeSockets.set(companyId, sock)

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update

            if (qr) {
                const qrBase64 = await QRCode.toDataURL(qr)
                qrCodes.set(companyId, qrBase64)
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut

                connectionStatus.set(companyId, 'disconnected')
                activeSockets.delete(companyId)

                await whatsappSessionModel.findOneAndUpdate(
                    { companyId },
                    { isConnected: false },
                    { upsert: true }
                )

                if (shouldReconnect) {
                    setTimeout(() => void connectCompany(companyId), 5000)
                } else {
                    qrCodes.delete(companyId)
                    const sp = getSessionPath(companyId)
                    if (fs.existsSync(sp)) fs.rmSync(sp, { recursive: true })
                }
            }

            if (connection === 'open') {
                connectionStatus.set(companyId, 'connected')
                qrCodes.delete(companyId)

                const phoneNumber = sock.user?.id?.split(':')[0] ?? null

                await whatsappSessionModel.findOneAndUpdate(
                    { companyId },
                    { isConnected: true, phoneNumber, connectedAt: new Date() },
                    { upsert: true }
                )

                logger.info('WhatsApp connected', { meta: { companyId, phoneNumber } })
            }
        })

        sock.ev.on('creds.update', saveCreds)

        sock.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
            if (type !== 'notify') return
            for (const message of msgs) {
                if (!message.key.fromMe) {
                    await handleIncomingMessage(companyId, sock, message)
                }
            }
        })
    } catch (error) {
        connectionStatus.set(companyId, 'disconnected')
        logger.error('WhatsApp connection error', {
            meta: { companyId, error: error instanceof Error ? error.message : String(error) }
        })
    }
}

const disconnectCompany = async (companyId: string): Promise<void> => {
    const sock = activeSockets.get(companyId)
    if (sock) {
        await sock.logout()
        activeSockets.delete(companyId)
    }

    qrCodes.delete(companyId)
    connectionStatus.set(companyId, 'disconnected')

    const sessionPath = getSessionPath(companyId)
    if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true })

    await whatsappSessionModel.findOneAndUpdate(
        { companyId },
        { isConnected: false, phoneNumber: null, connectedAt: null },
        { upsert: true }
    )
}

const restoreAllSessions = async (): Promise<void> => {
    try {
        const sessions = await whatsappSessionModel.find({ isConnected: true }).lean()
        for (const session of sessions) {
            const companyId = session.companyId.toString()
            const sessionPath = getSessionPath(companyId)
            if (fs.existsSync(sessionPath)) void connectCompany(companyId)
        }
    } catch (error) {
        logger.error('Failed to restore WhatsApp sessions', {
            meta: { error: error instanceof Error ? error.message : String(error) }
        })
    }
}

export default {
    connectCompany,
    disconnectCompany,
    getQRCode: (companyId: string) => qrCodes.get(companyId) ?? null,
    getStatus: (companyId: string) => connectionStatus.get(companyId) ?? 'disconnected',
    getSessionInfo: (companyId: string) => whatsappSessionModel.findOne({ companyId }).lean(),
    restoreAllSessions,
}