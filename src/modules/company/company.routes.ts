// import { Router } from 'express'
// import companyController from './company.controller'
// import authenticate from '../../middlewares/authenticate'

// const router = Router()

// router.post('/', authenticate, companyController.createCompany)
// router.get('/', authenticate, companyController.listCompanies)
// router.get('/:companyId', authenticate, companyController.getCompanyById)
// router.patch('/:companyId', authenticate, companyController.updateCompany)
// router.delete('/:companyId', authenticate, companyController.deleteCompany)

// export default router



import { Router } from 'express'
import companyController from './company.controller'
import authenticate from '../../middlewares/authenticate'

const router = Router()

router.post('/', authenticate, companyController.createCompany)
router.get('/', authenticate, companyController.listCompanies)
router.get('/:companyId', authenticate, companyController.getCompanyById)
router.patch('/:companyId', authenticate, companyController.updateCompany)
router.delete('/:companyId', authenticate, companyController.deleteCompany)

// WhatsApp routes
router.post('/:companyId/whatsapp', authenticate, companyController.saveWhatsApp)
router.delete('/:companyId/whatsapp', authenticate, companyController.removeWhatsApp)

export default router
