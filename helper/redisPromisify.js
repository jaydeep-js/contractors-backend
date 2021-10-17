const util = require('util')

module.exports = {
  redisPromisify: function(redisClient) {
    redisClient.hget = util.promisify(redisClient.hget)
    redisClient.hgetall = util.promisify(redisClient.hgetall)
    redisClient.hset = util.promisify(redisClient.hset)
    redisClient.hmget = util.promisify(redisClient.hmget)

    redisClient.expire = util.promisify(redisClient.expire)
    redisClient.expireat = util.promisify(redisClient.expireat)
    redisClient.pexpireat = util.promisify(redisClient.pexpireat)
    redisClient.exists = util.promisify(redisClient.exists)
    redisClient.get = util.promisify(redisClient.get)
    redisClient.set = util.promisify(redisClient.set)
    redisClient.del = util.promisify(redisClient.del)
    redisClient.keys = util.promisify(redisClient.keys)
    redisClient.incr = util.promisify(redisClient.incr)
    redisClient.unlink = util.promisify(redisClient.unlink)

    redisClient.rpush = util.promisify(redisClient.rpush)
    redisClient.blpop = util.promisify(redisClient.blpop)
    redisClient.lpop = util.promisify(redisClient.lpop)

    redisClient.sadd = util.promisify(redisClient.sadd)
    redisClient.sismember = util.promisify(redisClient.sismember)
    redisClient.srem = util.promisify(redisClient.srem)
    redisClient.smembers = util.promisify(redisClient.smembers)
    redisClient.scard = util.promisify(redisClient.scard)
    redisClient.sunion = util.promisify(redisClient.sunion)
    redisClient.zadd = util.promisify(redisClient.zadd)
    redisClient.zscore = util.promisify(redisClient.zscore)
    redisClient.zrank = util.promisify(redisClient.zrank)
    redisClient.zrevrank = util.promisify(redisClient.zrevrank)
    redisClient.zrevrange = util.promisify(redisClient.zrevrange)
    redisClient.evalsha = util.promisify(redisClient.evalsha)
    redisClient.send_command = util.promisify(redisClient.send_command)
    redisClient.zrange = util.promisify(redisClient.zrange)

    return redisClient
  }
}
