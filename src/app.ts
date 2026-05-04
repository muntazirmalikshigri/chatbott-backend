// import express, { Application } from 'express'
// import path from 'path'
// import router from './APIs'
// import moduleRouter from './modules'
// import errorHandler from './middlewares/errorHandler'
// import notFound from './handlers/notFound'
// import helmet from 'helmet'
// import cors from 'cors'
// import cookieParser from 'cookie-parser'
// import httpResponse from './handlers/httpResponse'

// const app: Application = express()

// //Middlewares
// app.use(helmet())
// app.use(cookieParser())
// // app.use(
// //     cors({
// //         methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PUT', 'PATCH'],
// //         origin: true,
// //         credentials: true
// //     })
// // )
// app.use(
//     cors({
//         methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PUT', 'PATCH'],
//         origin: 'http://localhost:3000',  // ← origin: true ki jagah yeh likho
//         credentials: true
//     })
// )
// app.use(express.json())
// app.use(express.urlencoded({ extended: true }))
// app.use(express.static(path.join(__dirname, '../', 'public')))

// // Root route
// app.get('/', (req, res) => {
//     httpResponse(res, req, 200, 'Server is running', {
//         service: 'base_server',
//         status: 'running',
//         endpoints: {
//             health: '/v1/health',
//             self: '/v1/self'
//         }
//     })
// })

// //Router
// // app.use('/v1', router)
// router(app)
// app.use('/v1', moduleRouter)

// //404 handler
// app.use(notFound)

// //Handlers as Middlewares
// app.use(errorHandler)

// export default app



import express, { Application } from 'express'
import path from 'path'
import router from './APIs'
import moduleRouter from './modules'
import errorHandler from './middlewares/errorHandler'
import notFound from './handlers/notFound'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import httpResponse from './handlers/httpResponse'
import widgetRoutes from './APIs/widget.routes'

const app: Application = express()

// Helmet — disable for widget.js so it loads cross-origin
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.use(cookieParser())

// CORS — dashboard uses credentials (cookie auth)
app.use(
    cors({
        methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PUT', 'PATCH'],
        origin: (origin, callback) => {
            // Allow dashboard origin with credentials
            // Allow widget requests from any origin (no credentials)
            callback(null, origin || '*')
        },
        credentials: true,
    })
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, '../', 'public')))

// Widget route — must be BEFORE other routes
app.use('/', widgetRoutes)

// Root route
app.get('/', (req, res) => {
    httpResponse(res, req, 200, 'Server is running', {
        service: 'base_server',
        status: 'running',
        widget: '/widget.js',
        endpoints: { health: '/v1/health', self: '/v1/self' }
    })
})

// Chat API — open CORS (widget users have no cookies)
app.use('/v1/chat', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
   if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    next()
})

// Routers
router(app)
app.use('/v1', moduleRouter)

// 404 handler
app.use(notFound)

// Error handler
app.use(errorHandler)

export default app