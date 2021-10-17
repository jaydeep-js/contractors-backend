/**
 * Auth middleware containes the common methods to authenticate user or admin by token.
 * @method {isAdminAuthenticated} is for authenticating the token and make sure its a admin.
 * @method {isUserAuthenticated} is for authenticating the token.
 * @method {findByToken} is specified in user.model.js
 */
const fs = require('fs')
const AdminsModel = require('../models-routes-services/admin/model')
const UsersModel = require('../models-routes-services/user/model')
const { messages, status, jsonStatus } = require('../helper/api.responses')
const errorLogs = fs.createWriteStream('error.log', { flags: 'a' })

const isUserAuthenticated = async (req, res, next) => {
  try {
    const token = req.header('Authorization')
    console.log('token', token)

    const lang = req.header('Language')
    if (lang === 'English') {
      req.userLanguage = 'English'
    } else {
      req.userLanguage = 'English'
    }
    if (token) {
      req.user = {}
      const user = await UsersModel.findByToken(token)
      if (!user) return res.status(status.Unauthorized).jsonp({ status: jsonStatus.Unauthorized, message: messages[req.userLanguage].err_unauthorized })
      req.user._id = user._id
      return next(null, null)
    } else {
      return res.status(status.Unauthorized).jsonp({ status: jsonStatus.Unauthorized, message: messages[req.userLanguage].err_unauthorized })
    }
  } catch (error) {
    errorLogs.write(`${new Date().toString()} => ${error.toString()}\r\n`)
    return res.status(status.Unauthorized).jsonp({
      status: jsonStatus.Unauthorized,
      message: messages[req.userLanguage].err_unauthorized
    })
  }
}

const isAdminAuthenticated = async (req, res, next) => {
  try {
    const token = req.header('Authorization')
    const lang = req.header('Language')
    if (lang === 'English') {
      req.userLanguage = 'English'
    } else {
      req.userLanguage = 'English'
    }
    if (token) {
      const admin = await AdminsModel.findByToken(token)
      if (!admin) return res.status(status.Unauthorized).jsonp({ status: jsonStatus.Unauthorized, message: messages[req.userLanguage].err_unauthorized })
      req.admin = admin
      return next(null, null)
    } else {
      return res.status(status.Unauthorized).jsonp({ status: jsonStatus.Unauthorized, message: messages[req.userLanguage].err_unauthorized })
    }
  } catch (error) {
    console.log('ERROR OCCURED:', error.message)
    errorLogs.write(`${new Date().toString()} => ${error.toString()}\r\n`)
    return res.status(status.Unauthorized).jsonp({
      status: jsonStatus.Unauthorized,
      message: messages[req.userLanguage].err_unauthorized
    })
  }
}

const setLanguage = (req, res, next) => {
  const lang = req.header('Language')
  if (lang === 'English') {
    req.userLanguage = 'English'
  } else {
    req.userLanguage = 'English'
  }

  return next(null, null)
}

module.exports = {
  isUserAuthenticated,
  isAdminAuthenticated,
  setLanguage

}
