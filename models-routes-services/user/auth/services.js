const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const UsersModel = require('../../user/model')
const { messages, status, jsonStatus } = require('../../../helper/api.responses')
const { removenull, catchError, pick, isValidEmail, isValidMobileNumber, checkAlphanumeric } = require('../../../helper/utilities.services')
const { validationResult } = require('express-validator')
const config = require('../../../config')

class UserAuth {
  async adminAddUser(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      req.body = pick(req.body, ['sName', 'sUsername', 'sEmail', 'sMobNum', 'sPassword', 'eStatus', 'eType'])

      req.body.sEmail = req.body.sEmail.toLowerCase()
      req.body.sUsername = req.body.sUsername.toLowerCase()
      removenull(req.body)

      const { sUsername = '', sEmail = '', sMobNum = '', eStatus = '', eType = '' } = req.body

      if (sEmail && !isValidEmail(sEmail)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Email Id') })
      if (sMobNum && (!isValidMobileNumber(sMobNum) || sMobNum.length !== 10)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Mobile Number') })

      if (eStatus && !['Y', 'N'].includes(eStatus)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'eStatus') })

      if (eType && !['S', 'L'].includes(eType)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'eType') })

      if (sUsername && !checkAlphanumeric(sUsername)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].must_alpha_num })
      if (sMobNum.length !== 10) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Mobile number') })

      const userExist = await UsersModel.findOne({ $or: [{ sEmail }, { sMobNum }, { sUsername }] })
      if (userExist && userExist.sUsername === sUsername) return res.status(status.ResourceExist).jsonp({ status: jsonStatus.ResourceExist, message: messages[req.userLanguage].already_exist.replace('##', 'Username') })
      if (userExist && userExist.sMobNum === sMobNum) return res.status(status.ResourceExist).jsonp({ status: jsonStatus.ResourceExist, message: messages[req.userLanguage].already_exist.replace('##', 'Mobile number') })
      if (userExist && userExist.sEmail === sEmail) return res.status(status.ResourceExist).jsonp({ status: jsonStatus.ResourceExist, message: messages[req.userLanguage].already_exist.replace('##', 'Email id') })

      const newUser = new UsersModel({ ...req.body })
      const user = await newUser.save()

      const newToken = { sToken: jwt.sign({ _id: (user._id).toHexString() }, config.JWT_SECRET, { expiresIn: config.JWT_VALIDITY }) }

      if (user.aJwtTokens.length < config.LOGIN_HARD_LIMIT || config.LOGIN_HARD_LIMIT === 0) user.aJwtTokens.push(newToken)
      else {
        user.aJwtTokens.splice(0, 1)
        user.aJwtTokens.push(newToken)
      }
      await user.save()
      UsersModel.filterData(user)

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].add_success.replace('##', 'User'), data: user })
    } catch (error) {
      return catchError('UserAuth.adminAddUser', error, req, res)
    }
  }

  async login(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      req.body = pick(req.body, ['sLogin', 'sPassword', 'sPushToken'])
      removenull(req.body)

      let { sLogin, sPushToken, sPassword } = req.body

      if (!isValidEmail(sLogin) && !isValidMobileNumber(sLogin)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'User credential') })

      sLogin = sLogin.toLowerCase().trim()

      let user = await UsersModel.findOne({ $or: [{ sEmail: sLogin }, { sMobNum: sLogin }], eStatus: { $ne: 'N' } })
      if (!user) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].auth_failed })

      if (user && user.eStatus === 'N') return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].user_blocked })

      if (!bcrypt.compareSync(sPassword, user.sPassword)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].auth_failed })

      const newToken = {
        sToken: jwt.sign({ _id: (user._id).toHexString() }, config.JWT_SECRET, { expiresIn: config.JWT_VALIDITY }),
        sPushToken
      }

      if (user.aJwtTokens.length < config.LOGIN_HARD_LIMIT || config.LOGIN_HARD_LIMIT === 0) user.aJwtTokens.push(newToken)
      else {
        user.aJwtTokens.splice(0, 1)
        user.aJwtTokens.push(newToken)
      }

      await user.save()

      user = pick(user.toObject(), ['sName', 'sUsername', 'sMobNum', 'sEmail', 'eType', 'dCreatedAt', '_id'])

      return res.status(status.OK).set('Authorization', newToken.sToken).jsonp({
        status: jsonStatus.OK,
        message: messages[req.userLanguage].succ_login,
        data: user,
        Authorization: newToken.sToken
      })
    } catch (error) {
      return catchError('UserAuth.login', error, req, res)
    }
  }

  async validate(req, res) {
    try {
      const { authorization = null } = req.headers
      if (authorization) {
        console.log('validate login')
        const user = await UsersModel.findOne({ aJwtTokens: { $elemMatch: { sToken: authorization } } }).select('eType sName sUsername sMobNum sEmail')
        if (user) {
          const data = user.toObject()
          return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].valid.replace('##', 'Token'), data, bIsValid: true })
        }
      }
      console.log('false')
      return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Token'), bIsValid: false })
    } catch (error) {
      return catchError('UserAuth.validateUserLogin', error, req, res)
    }
  }

  async logout(req, res) {
    try {
      await UsersModel.findByIdAndUpdate(req.user._id, { $pull: { aJwtTokens: { sToken: req.header('Authorization') } } })
      return res.status(status.OK).jsonp({
        status: jsonStatus.OK,
        message: messages[req.userLanguage].succ_logout
      })
    } catch (error) {
      return catchError('UserAuth.logout', error, req, res)
    }
  }
}

module.exports = new UserAuth()
