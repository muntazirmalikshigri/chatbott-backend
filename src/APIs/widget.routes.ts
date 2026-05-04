// import { Router, Request, Response } from 'express'
// import * as path from 'path'
// import * as fs from 'fs'

// const router = Router()

// // GET /widget.js — serve embeddable chat widget
// router.get('/widget.js', (req: Request, res: Response): void => {
//     const widgetPath = path.join(process.cwd(), 'public', 'widget.js')

//     if (!fs.existsSync(widgetPath)) {
//         res.status(404).send('// Widget not found')
//         return
//     }

//     res.setHeader('Content-Type', 'application/javascript')
//     res.setHeader('Cache-Control', 'public, max-age=3600')
//     res.setHeader('Access-Control-Allow-Origin', '*')
//     res.sendFile(widgetPath)
// })

// export default router



import { Router, Request, Response } from 'express'
import * as path from 'path'
import * as fs from 'fs'

const router = Router()

// GET /widget.js — serve embeddable chat widget
router.get('/widget.js', (_req: Request, res: Response): void => {
    const widgetPath = path.join(process.cwd(), 'public', 'widget.js')

    if (!fs.existsSync(widgetPath)) {
        res.status(404).send('// Widget not found')
        return
    }

    res.setHeader('Content-Type', 'application/javascript')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.sendFile(widgetPath)
})

export default router