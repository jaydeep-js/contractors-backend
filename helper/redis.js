const config = require('../config')
const redis = require('redis')
const { redisPromisify } = require('./redisPromisify')

let redisClient = redis.createClient({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD
})

redisClient.on('error', function (error) {
  console.log('Error in Redis', error)
  process.exit(1)
})

redisClient.on('connect', function () { console.log('redis connected') })

redisClient = redisPromisify(redisClient)

module.exports = {
  cacheRoute: function (duration) {
    return async (req, res, next) => {
      const key = '__express__' + req.originalUrl || req.url
      const cachedBody = JSON.parse(await redisClient.get(key))
      if (cachedBody) {
        res.send(cachedBody)
      } else {
        res.sendResponse = res.send
        res.send = (body) => {
          redisClient.set(key, body, 'EX', duration)
          res.setHeader('content-type', 'application/json')
          res.sendResponse(body)
        }
        next()
      }
    }
  },

  queuePush: function (queueName, data) {
    return redisClient.rpush(queueName, JSON.stringify(data))
  },

  queuePop: function (queueName, data) {
    return redisClient.lpop(queueName)
  },
  redisClient
}

// remove when boughtTicketIds
