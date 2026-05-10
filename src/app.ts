


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
// import widgetRoutes from './APIs/widget.routes'

// const app: Application = express()

// // Helmet — disable for widget.js so it loads cross-origin
// app.use(helmet({
//     crossOriginResourcePolicy: { policy: 'cross-origin' },
// }))

// app.use(cookieParser())

// // CORS — dashboard uses credentials (cookie auth)
// app.use(
//     cors({
//         methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'HEAD', 'PUT', 'PATCH'],
//         origin: (origin, callback) => {
//             // Allow dashboard origin with credentials
//             // Allow widget requests from any origin (no credentials)
//             callback(null, origin || '*')
//         },
//         credentials: true,
//     })
// )

// app.use(express.json())
// app.use(express.urlencoded({ extended: true }))
// app.use(express.static(path.join(__dirname, '../', 'public')))

// // Widget route — must be BEFORE other routes
// app.use('/', widgetRoutes)

// // Root route
// app.get('/', (req, res) => {
//     httpResponse(res, req, 200, 'Server is running', {
//         service: 'base_server',
//         status: 'running',
//         widget: '/widget.js',
//         endpoints: { health: '/v1/health', self: '/v1/self' }
//     })
// })

// // ✅ ADDED: Fix for frontend GET /v1 call
// app.get('/v1', (req, res) => {
//     httpResponse(res, req, 200, 'API v1 is running', {
//         endpoints: { 
//             health: '/v1/health', 
//             self: '/v1/self', 
//             login: '/v1/login',
//             register: '/v1/register'
//         }
//     })
// })

// // Chat API — open CORS (widget users have no cookies)
// app.use('/v1/chat', (req, res, next) => {
//     const origin = req.headers.origin || '*'
//     res.setHeader('Access-Control-Allow-Origin', origin)
//     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
//     res.setHeader('Access-Control-Allow-Credentials', 'true')
//     if (req.method === 'OPTIONS') { res.status(200).end(); return; }
//     next()
// })

// // Routers
// router(app)
// app.use('/v1', moduleRouter)

// // 404 handler
// app.use(notFound)

// // Error handler
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

// ✅ FIXED CORS - Allow all origins for testing
const allowedOrigins = [
    'https://chatbot-frontent.vercel.app',
    'https://chatbot-frontent-*.vercel.app',
    'http://localhost:3000',
    'http://localhost:5000'
]

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true)
        
        // Check if origin matches any allowed pattern
        const isAllowed = allowedOrigins.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace('*', '.*'))
                return regex.test(origin)
            }
            return pattern === origin
        })
        
        if (isAllowed) {
            callback(null, true)
        } else {
            console.log('CORS blocked origin:', origin)
            callback(null, true) // ✅ Temporarily allow all for testing
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
}))

// ✅ Handle preflight requests
app.options('*', cors())

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

// ✅ ADDED: Fix for frontend GET /v1 call
app.get('/v1', (req, res) => {
    httpResponse(res, req, 200, 'API v1 is running', {
        endpoints: { 
            health: '/v1/health', 
            self: '/v1/self', 
            login: '/v1/login',
            register: '/v1/register'
        }
    })
})

// Chat API — open CORS (widget users have no cookies)
app.use('/v1/chat', (req, res, next) => {
    const origin = req.headers.origin || '*'
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
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