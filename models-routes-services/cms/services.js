const CMSModel = require('./model')
const { validationResult } = require('express-validator')
const { messages, status, jsonStatus } = require('../../helper/api.responses')
const { removenull, catchError, pick } = require('../../helper/utilities.services')
// const config = require('../../../config')

class CMS {
  async add(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      req.body = pick(req.body, ['sSlug', 'sDetails', 'sTitle', 'bIsActive'])
      removenull(req.body)

      let { sSlug } = req.body

      sSlug = sSlug.toLowerCase()

      const exist = await CMSModel.findOne({ sSlug })
      if (exist) return res.status(status.ResourceExist).jsonp({ status: jsonStatus.ResourceExist, message: messages[req.userLanguage].already_exist.replace('##', messages[req.userLanguage].cmsSlug) })

      const newCMS = new CMSModel({ ...req.body })

      const data = await newCMS.save()

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].add_success.replace('##', messages[req.userLanguage].content), data })
    } catch (error) {
      return catchError('CMS.add', error, req, res)
    }
  }

  async list(req, res) {
    try {
      const cms = await CMSModel.find().lean()

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', messages[req.userLanguage].content), data: cms })
    } catch (error) {
      return catchError('CMS.list', error, req, res)
    }
  }

  async adminGet(req, res) {
    try {
      const data = await CMSModel.findOne({ sSlug: req.params.sSlug }).lean()

      if (!data) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_exist.replace('##', messages[req.userLanguage].content) })

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', messages[req.userLanguage].content), data })
    } catch (error) {
      return catchError('CMS.adminGet', error, req, res)
    }
  }

  async update(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      req.body = pick(req.body, ['sSlug', 'sDetails', 'sTitle', 'bIsActive'])
      removenull(req.body)

      req.body.sSlug = req.body.sSlug.toLowerCase()
      const exist = await CMSModel.findOne({ sSlug: req.body.sSlug, _id: { $ne: req.params.id } })
      if (exist) return res.status(status.ResourceExist).jsonp({ status: jsonStatus.ResourceExist, message: messages[req.userLanguage].already_exist.replace('##', messages[req.userLanguage].cmsSlug) })

      const data = await CMSModel.findByIdAndUpdate(req.params.id, { ...req.body, dUpdatedAt: Date.now() }, { new: true, runValidators: true })

      if (!data) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_exist.replace('##', messages[req.userLanguage].cms) })
      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].update_success.replace('##', messages[req.userLanguage].cms), data })
    } catch (error) {
      return catchError('CMS.update', error, req, res)
    }
  }

  async remove(req, res) {
    try {
      const data = await CMSModel.findByIdAndDelete(req.params.id).lean()
      if (!data) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_exist.replace('##', messages[req.userLanguage].cms) })

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].del_success.replace('##', messages[req.userLanguage].cms), data })
    } catch (error) {
      return catchError('CMS.remove', error, req, res)
    }
  }

  // for user
  async userList(req, res) {
    try {
      const data = await CMSModel.find({ eStatus: 'Y' }).lean()

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', messages[req.userLanguage].content), data })
    } catch (error) {
      return catchError('CMS.userList', error, req, res)
    }
  }

  async get(req, res) {
    try {
      const data = await CMSModel.findOne({ sSlug: req.params.sSlug, eStatus: 'Y' }).lean()

      if (!data) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_exist.replace('##', messages[req.userLanguage].content) })

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', messages[req.userLanguage].content), data })
    } catch (error) {
      return catchError('CMS.get', error, req, res)
    }
  }
}

module.exports = new CMS()
