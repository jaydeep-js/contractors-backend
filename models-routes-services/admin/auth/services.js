const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const AdminsModel = require('../../admin/model')
const { messages, status, jsonStatus } = require('../../../helper/api.responses')
const { removenull, catchError, pick, checkAlphanumeric, isValidEmail, isValidMobileNumber } = require('../../../helper/utilities.services')
const config = require('../../../config')
const { validationResult } = require('express-validator')

class AdminAuth {
  async register(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      req.body = pick(req.body, ['sName', 'sUsername', 'sEmail', 'sMobNum', 'sPassword', 'sSecret'])
      removenull(req.body)

      const { sUsername, sEmail, sMobNum, sSecret } = req.body
      if (!isValidEmail(sEmail)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Email Id') })
      if (!isValidMobileNumber(sMobNum) || sMobNum.length !== 10) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Mobile Number') })

      const { APP_SECRET: appSecret } = config
      if (sSecret !== appSecret) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].error })

      if (!checkAlphanumeric(sUsername)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].must_alpha_num })

      const adminExist = await AdminsModel.findOne({ $or: [{ sEmail }, { sMobNum }, { sUsername }] })
      if (adminExist && adminExist.sUsername === sUsername) return res.status(status.ResourceExist).jsonp({ status: jsonStatus.ResourceExist, message: messages[req.userLanguage].already_exist.replace('##', 'Username') })
      if (adminExist && adminExist.sMobNum === sMobNum) return res.status(status.ResourceExist).jsonp({ status: jsonStatus.ResourceExist, message: messages[req.userLanguage].already_exist.replace('##', 'Mobile number') })
      if (adminExist && adminExist.sEmail === sEmail) return res.status(status.ResourceExist).jsonp({ status: jsonStatus.ResourceExist, message: messages[req.userLanguage].already_exist.replace('##', 'Email') })

      const newAdmin = new AdminsModel({ ...req.body })
      const admin = await newAdmin.save()

      const newToken = { sToken: jwt.sign({ _id: (admin._id).toHexString() }, config.JWT_SECRET, { expiresIn: config.JWT_VALIDITY }) }

      if (admin.aJwtTokens.length < config.LOGIN_HARD_LIMIT_ADMIN || config.LOGIN_HARD_LIMIT_ADMIN === 0) admin.aJwtTokens.push(newToken)
      else {
        admin.aJwtTokens.splice(0, 1)
        admin.aJwtTokens.push(newToken)
      }

      await admin.save()
      return res.status(status.OK).set('Authorization', newToken.sToken).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].reg_success })
    } catch (error) {
      return catchError('AdminAuth.register', error, req, res)
    }
  }

  async login(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      req.body = pick(req.body, ['sLogin', 'sPassword', 'sPushToken'])
      removenull(req.body)

      let { sLogin, sPushToken, sPassword } = req.body

      sLogin = sLogin.toLowerCase().trim()
      let admin = await AdminsModel.findOne({ $or: [{ sEmail: sLogin }, { sMobNum: sLogin }], eStatus: 'Y' })

      if (!admin) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].auth_failed })

      if (!bcrypt.compareSync(sPassword, admin.sPassword)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].auth_failed })

      const newToken = {
        sToken: jwt.sign({ _id: (admin._id).toHexString() }, config.JWT_SECRET, { expiresIn: config.JWT_VALIDITY }),
        sIpAddress: req.connection.remoteAddress,
        sPushToken
      }

      if (admin.aJwtTokens.length < config.LOGIN_HARD_LIMIT_ADMIN || config.LOGIN_HARD_LIMIT_ADMIN === 0) {
        admin.aJwtTokens.push(newToken)
      } else {
        admin.aJwtTokens.splice(0, 1)
        admin.aJwtTokens.push(newToken)
      }
      await admin.save()

      admin = AdminsModel.filterData(admin)

      return res.status(status.OK).set('Authorization', newToken.sToken).jsonp({
        status: jsonStatus.OK,
        message: messages[req.userLanguage].succ_login,
        data: admin,
        Authorization: newToken.sToken
      })
    } catch (error) {
      return catchError('AdminAuth.login', error, req, res)
    }
  }

  async logout(req, res) {
    try {
      await AdminsModel.findByIdAndUpdate(req.admin._id, { $pull: { aJwtTokens: { sToken: req.header('Authorization') } } })
      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].succ_logout })
    } catch (error) {
      return catchError('AdminAuth.logout', error, req, res)
    }
  }
}

module.exports = new AdminAuth()
