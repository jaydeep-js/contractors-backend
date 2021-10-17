const { validationResult } = require('express-validator')
const { ObjectId } = require('mongoose').Types
const { messages, status, jsonStatus } = require('../../helper/api.responses')
const WorkTypesModel = require('./model')
const SiteStepsModel = require('../siteSteps/model')
const { removenull, catchError, pick, getPaginationParams } = require('../../helper/utilities.services')
// const config = require('../../../config')

class WorkTypeServices {
  async adminAddWorkType(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.body)
      req.body = pick(req.body, ['sName', 'bIsActive', 'aSiteStepIds'])
      const { sName = '', aSiteStepIds = [] } = req.body
      req.body.sName = sName ? (sName + '').toUpperCase() : ''

      const workTypeExists = await WorkTypesModel.findOne({ sName: req.body.sName })

      if (workTypeExists) return res.status(status.ResourceExist).jsonp({ status: jsonStatus.ResourceExist, message: messages[req.userLanguage].already_exist.replace('##', 'WorkType name') })

      let validSiteSteps = []
      if (req.body && req.body.aSiteStepIds && !!req.body.aSiteStepIds.length) {
        validSiteSteps = await SiteStepsModel.find({ _id: { $in: aSiteStepIds }, bIsActive: 1 }, { sTitle: 1 }).lean()
      }

      let workType = await WorkTypesModel.create({ ...req.body, aSiteStepIds: validSiteSteps })
      workType = workType.toObject()
      workType = pick(workType, ['dCreatedAt', '_id', 'bIsActive', 'sName', 'aSiteStepIds'])

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].add_success.replace('##', 'WorkType'), data: workType })
    } catch (error) {
      return catchError('WorkTypeServices.adminAddWorkType', error, req, res)
    }
  }

  async adminUpdateWorkType(req, res) {
    try {
      const { id: iWorkTypeId } = req.params

      if (iWorkTypeId && !ObjectId.isValid(iWorkTypeId)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'WorkType id') })

      removenull(req.body)
      req.body = pick(req.body, ['sName', 'bIsActive', 'aSiteStepIds'])

      const workTypeExists = await WorkTypesModel.findById(iWorkTypeId)
      if (!workTypeExists) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'WorkType') })

      let validSiteSteps = req.body.aSiteStepIds.map(id => ObjectId(id))
      if (req.body && req.body.aSiteStepIds && !!req.body.aSiteStepIds.length) {
        validSiteSteps = await SiteStepsModel.find({ _id: { $in: validSiteSteps }, bIsActive: true }, { sTitle: 1 }).lean()
      }

      const workType = await WorkTypesModel.findByIdAndUpdate(iWorkTypeId, { ...req.body, aSiteStepIds: validSiteSteps }, { fields: { dCreatedAt: 1, _id: 1, bIsActive: 1, sName: 1, aSiteStepIds: 1 }, new: true, runValidators: true })

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].update_success.replace('##', 'WorkType'), data: workType })
    } catch (error) {
      return catchError('WorkTypeServices.adminUpdateWorkType', error, req, res)
    }
  }

  async adminListWorkTypes(req, res) {
    try {
      removenull(req.query)
      req.query = pick(req.query, ['start', 'limit', 'sort', 'order', 'search', 'sd', 'ed'])
      const { start, limit, sorting, search } = getPaginationParams(req.query)

      // const [data = { total: 0, results: [] }] = await WorkTypesModel.aggregate([
      const [data] = await WorkTypesModel.aggregate([
        {
          $match: {
            dCreatedAt: { $exists: 1 },
            $or: [
              { sName: { $regex: new RegExp('^.*' + search + '.*', 'i') } }
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
              { $project: { sName: 1, bIsActive: 1, dCreatedAt: 1, aSiteSteps: '$aSiteStepIds' } }
            ]
          }
        },
        { $project: { results: 1, total: { $ifNull: [{ $arrayElemAt: ['$metadata.total', 0] }, 0] } } }
      ]).exec()

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'WorkTypes list'), data })
    } catch (error) {
      return catchError('WorkTypeServices.adminListWorkTypes', error, req, res)
    }
  }

  async adminGetWorkTypeDetails(req, res) {
    try {
      removenull(req.params)
      const { id: iWorkTypeId } = req.params
      if (iWorkTypeId && !ObjectId.isValid(iWorkTypeId)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'WorkType id') })

      const workType = await WorkTypesModel.findById(iWorkTypeId, { sName: 1, bIsActive: 1, dCreatedAt: 1, aSiteStepIds: 1 })
      if (!workType) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'WorkType') })

      return res.status(status.OK).jsonp({
        status: jsonStatus.OK,
        message: messages[req.userLanguage].success.replace('##', 'WorkType details'),
        data: workType
      })
    } catch (error) {
      return catchError('WorkTypeServices.adminGetWorkTypeDetails', error, req, res)
    }
  }

  async listWorkTypes(req, res) {
    try {
      removenull(req.body)
      req.query = pick(req.query, ['start', 'limit', 'sort', 'order', 'search', 'sd', 'ed'])
      const { start, limit } = getPaginationParams(req.query)
      const [data = { total: 0, results: [] }] = await WorkTypesModel.aggregate([
        // { $sort: sorting },
        { $match: { bIsActive: true } },
        { $skip: parseInt(start) },
        { $limit: parseInt(limit) },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            results: [{ $project: { sName: 1, dCreatedAt: 1, nSites: 1 } }]
          }
        },
        { $project: { results: 1, total: { $ifNull: [{ $arrayElemAt: ['$metadata.total', 0] }, 0] } } }
      ]).exec()

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'WorkTypes list'), data })
    } catch (error) {
      return catchError('WorkTypeServices.addZone', error, req, res)
    }
  }
}

module.exports = new WorkTypeServices()
