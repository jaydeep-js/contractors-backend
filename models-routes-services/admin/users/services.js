const jwt = require('jsonwebtoken')
const UsersModel = require('../../user/model')

const { messages, status, jsonStatus } = require('../../../helper/api.responses')
const { removenull, catchError, pick, isValidEmail, isValidMobileNumber, checkAlphanumeric, getPaginationParams } = require('../../../helper/utilities.services')
const config = require('../../../config')
const { ObjectId } = require('mongoose').Types

class AdminUserServices {
  async adminListUsers(req, res) {
    try {
      req.query = pick(req.query, ['start', 'limit', 'sort', 'order', 'search', 'sd', 'ed'])

      const { start, limit, sorting, search } = getPaginationParams(req.query)
      // const { sd, ed } = req.query

      // const filters = { $and: [{ dCreatedAt: { $lte: new Date() } }] }

      // let { startOfDay = null, endOfDay = null } = {}

      // if (sd || ed) {
      //   if (sd && ed) {
      //     if (sd) {
      //       startOfDay = moment(new Date(new Date(sd).toDateString())).startOf('day').toDate()
      //       filters.$and.push({ dCreatedAt: { $gte: startOfDay } })
      //     }
      //     if (ed) {
      //       endOfDay = moment(new Date(new Date(ed).toDateString())).endOf('day').toDate()
      //       filters.$and.push({ dCreatedAt: { $lte: endOfDay } })
      //     }
      //     if (sd === ed) filters.$and.push({ dCreatedAt: { $gte: startOfDay, $lte: endOfDay } })
      //   }
      // }

      const [data = { total: 0, results: [] }] = await UsersModel.aggregate([
        // { $match: filters },
        {
          $match: {
            dCreatedAt: { $exists: 1 },
            $or: [
              { sEmail: { $regex: new RegExp('^.*' + search + '.*', 'i') } },
              { sName: { $regex: new RegExp('^.*' + search + '.*', 'i') } },
              { sMobNum: { $regex: new RegExp('^.*' + search + '.*', 'i') } },
              { sUsername: { $regex: new RegExp('^.*' + search + '.*', 'i') } }
            ]
          }
        },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            results: [
              { $sort: sorting },
              { $skip: parseInt(start) },
              { $limit: parseInt(limit) },
              { $project: { sUsername: 1, sName: 1, sEmail: 1, eType: 1, sMobNum: 1, eStatus: 1, dCreatedAt: 1 } }
            ]
          }
        },
        { $project: { results: 1, total: { $ifNull: [{ $arrayElemAt: ['$metadata.total', 0] }, 0] } } }
      ]).exec()

      return res.status(status.OK).jsonp({
        status: jsonStatus.OK,
        message: messages[req.userLanguage].success.replace('##', 'Users list'),
        data
      })
    } catch (error) {
      return catchError('AdminUserServices.adminListUsers', error, req, res)
    }
  }

  async adminUpdateUser(req, res) {
    try {
      const { id: iUserId } = req.params
      if (!ObjectId.isValid(iUserId)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'User id ') })

      removenull(req.body)
      req.body = pick(req.body, ['sName', 'sUsername', 'sEmail', 'sMobNum', 'sPassword', 'eStatus', 'eType'])

      const { sMobNum = '', eStatus = '', eType = '' } = req.body
      let { sUsername = '', sEmail = '' } = req.body
      sEmail = sEmail.toLowerCase()
      sUsername = sUsername.toLowerCase()

      if (sEmail && !isValidEmail(sEmail)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Email Id') })

      if (sMobNum && (!isValidMobileNumber(sMobNum) || sMobNum.length !== 10)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Mobile Number') })

      if (eStatus && !['Y', 'N'].includes(eStatus)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'eStatus') })

      if (eType && !['S', 'L'].includes(eType)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'eType') })

      if (sUsername && !checkAlphanumeric(sUsername)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].must_alpha_num })

      const userIdExists = await UsersModel.findById(iUserId)
      if (!userIdExists) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'User') })

      const existingUser = await UsersModel.findOne({ _id: { $ne: ObjectId(iUserId) }, $or: [{ sUsername }, { sMobNum }, { sEmail }] })
      if (existingUser) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].already_exist.replace("##", "User with similar details") })

      const user = await UsersModel.findByIdAndUpdate(iUserId, { ...req.body }, { runValidators: true, new: true })

      const newToken = { sToken: jwt.sign({ _id: (user._id).toHexString() }, config.JWT_SECRET, { expiresIn: config.JWT_VALIDITY }) }

      if (user.aJwtTokens.length < config.LOGIN_HARD_LIMIT || config.LOGIN_HARD_LIMIT === 0) {
        user.aJwtTokens.push(newToken)
      } else {
        user.aJwtTokens.splice(0, 1)
        user.aJwtTokens.push(newToken)
      }
      await user.save()
      UsersModel.filterData(user)

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].update_success.replace('##', 'User'), data: user })
    } catch (error) {
      return catchError('AdminUserServices.updateUser', error, req, res)
    }
  }

  async adminGetUserDetails(req, res) {
    try {
      const { id: iUserId } = req.params

      if (!ObjectId.isValid(iUserId)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'User id ') })

      if (!iUserId) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].fields_missing.replace('##', 'User id') })

      const user = await UsersModel.findById(iUserId)
      if (!user) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'User') })
      UsersModel.filterData(user)

      return res.status(status.OK).jsonp({
        status: jsonStatus.OK,
        message: messages[req.userLanguage].success.replace('##', 'User details'),
        data: user
      })
    } catch (error) {
      return catchError('AdminUserServices.getUserDetails', error, req, res)
    }
  }
}

module.exports = new AdminUserServices()
