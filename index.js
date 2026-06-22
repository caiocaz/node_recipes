import express from 'express'
import { engine } from 'express-handlebars'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import FileStore from 'session-file-store'
const FileStoreInit = FileStore(session)
import flash from 'connect-flash'
import path from 'path'
import os from 'os'
import multer from 'multer'
import conn from './db/conn.js'
import recipeRoutes from './routes/recipeRoutes.js'
import shoppingListRoutes from './routes/shoppingListRoutes.js'
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import 'dotenv/config'

const app = express()

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/img/recipes')
  },
  filename: (req, file, cb) => {
    const uniqueName = `recipe-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Apenas imagens são permitidas (JPEG, PNG, WebP, GIF)'))
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
})

app.engine('handlebars', engine({
  helpers: {
    eq: (value1, value2) => value1 === value2
  }
}))
app.set('view engine', 'handlebars')
app.set('views', './views')

app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())

app.use((req, res, next) => {
  req.upload = upload
  next()
})

app.use(session({
  name: 'session',
  secret: 'mysecret',
  resave: false,
  saveUninitialized: false,
  store: new FileStoreInit({
    logFn: function() {},
    path: path.join(os.tmpdir(), 'sessions')
  }),
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 3600000,
    expires: new Date(Date.now() + 3600000),
    httpOnly: true,
    sameSite: 'lax'
  }
}))

app.use(flash())

app.use((req, res, next) => {
  const flashMessages = req.flash()
  res.locals.messages = flashMessages
  res.locals.session = req.session

  if (req.session.userId) {
    res.locals.user = {
      id: req.session.userId,
      name: req.session.userName
    }
  }
  next()
})

app.use('/recipes', recipeRoutes)
app.use('/', shoppingListRoutes)
app.use('/', authRoutes)
app.use('/', userRoutes)
app.get('/', (req, res) => res.redirect('/recipes'))

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 80
conn.sync({ alter: true }).then(() => {
  app.listen(port, () => {
    console.log(`Servidor de receitas rodando na porta ${port}`)
  })
}).catch(err => {
  console.error('Erro ao sincronizar o banco de dados:', err)
})
