// node modules import.
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const path = require('path')
const helmet = require('helmet')
const compression = require('compression')
const morgan = require('morgan')
const fs = require('fs')

const config = require('./config')
const { status } = require('./helper/api.responses')

// admin routes
const adminAuthRoutes = require('./models-routes-services/admin/auth/routes')
const adminUserRoutes = require('./models-routes-services/admin/users/routes')

// other routes
const userAuthRoutes = require('./models-routes-services/user/auth/routes')
const siteRoutes = require('./models-routes-services/site/routes')
const zoneRoutes = require('./models-routes-services/zone/routes')
const workTypeRoutes = require('./models-routes-services/worktype/routes')
const departmentRoutes = require('./models-routes-services/department/routes')
const checklistRoutes = require('./models-routes-services/checkList/routes')
const siteStepRoutes = require('./models-routes-services/siteSteps/routes')
const cmsRoutes = require('./models-routes-services/cms/routes')

const app = express()
const logFile = fs.createWriteStream('./access.log', { flags: 'a' })
const errorLogs = fs.createWriteStream(path.join(__dirname, 'error.log'), { flags: 'a' })

app.use(morgan(':remote-addr [:date[web]] :method :url :status - :response-time ms', { stream: logFile }))
app.use(cors())
app.use(helmet())
app.use(compression())
app.use(bodyParser.json({ extended: true }))
app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static(path.join(__dirname, 'public')))

app.set('view engine', 'ejs')

// mongoose connection (url from config/env)
const connectionOptions = { poolSize: 50, promiseLibrary: global.Promise, useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false }
mongoose.connect(config.DB_URL, connectionOptions)
  .then(() => console.log('Connected to database..'))
  .catch(error => {
    console.log('Connection to Database failed..', error)
    errorLogs.write(`${new Date().toString()} => ${error.toString()}\r\n`)
  })

app.use('*', (req, res, next) => {
  console.info(`${req.method} : ${req.url} : ${JSON.stringify({ body: req.body, params: req.query }, null, 4)}}`)
  return next()
})

// cachegoose(mongoose, {
//   engine: 'redis',
//   host: config.REDIS_HOST,
//   port: config.REDIS_PORT
// })

// Admin routes
app.use('/api/v1/admin/auth', adminAuthRoutes)
app.use('/api/v1/admin/users', adminUserRoutes)

// Other routes
app.use('/api/v1/users/auth', userAuthRoutes)
app.use('/api/v1/zones', zoneRoutes)
app.use('/api/v1/worktypes', workTypeRoutes)
app.use('/api/v1/departments', departmentRoutes)
app.use('/api/v1/checklist', checklistRoutes)
app.use('/api/v1/sitesteps', siteStepRoutes)
app.use('/api/v1/sites', siteRoutes)
app.use('/api/v1/cms', cmsRoutes)

app.get('/', (req, res) => {
  return res.status(status.OK).send('Contractor\'s app')
})

app.get('*', (req, res) => {
  res.status(status.NotFound).sendFile(path.join(__dirname, '/public/404.html'))
})

app.listen(config.PORT, () => {
  console.log('Magic happens on port :' + config.PORT)
})
