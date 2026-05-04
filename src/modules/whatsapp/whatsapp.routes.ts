import { Router } from 'express'
import whatsappController from './whatsapp.controller'
import authenticate from '../../middlewares/authenticate'

const router = Router()

// Start connection + generate QR
router.post('/:companyId/connect', authenticate, whatsappController.connect)

// Get QR code (poll every 2-3 seconds until connected)
router.get('/:companyId/qr', authenticate, whatsappController.getQR)

// Get connection status
router.get('/:companyId/status', authenticate, whatsappController.getStatus)

// Disconnect WhatsApp
router.delete('/:companyId/disconnect', authenticate, whatsappController.disconnect)

export default router