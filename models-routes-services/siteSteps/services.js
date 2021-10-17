const { ObjectId } = require('mongoose').Types
const SiteStepsModel = require('./model')
const { validationResult } = require('express-validator')
const { messages, status, jsonStatus } = require('../../helper/api.responses')
const { removenull, catchError, pick, getPaginationParams } = require('../../helper/utilities.services')
// const config = require('../../../config')
const config = require('../../config')
const AWS = require('aws-sdk')

AWS.config.update({ accessKeyId: config.AWS_MEDIA_ACCESS_KEY, secretAccessKey: config.AWS_MEDIA_SECRET_KEY, signatureVersion: 'v4', region: 'ap-south-1' })
var s3 = new AWS.S3()

class SiteStepsService {
  async adminAdd(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.body)
      req.body = pick(req.body, ['sTitle', 'eMediaType', 'sImage', 'bIsActive'])
      const { sTitle = '' } = req.body

      const siteStepExists = await SiteStepsModel.findOne({ sTitle: { $regex: new RegExp('^.*' + sTitle + '.*', 'i') } })

      if (siteStepExists) return res.status(status.ResourceExist).jsonp({ status: jsonStatus.ResourceExist, message: messages[req.userLanguage].already_exist.replace('##', 'Site step') })

      let SiteStep = await SiteStepsModel.create(req.body)
      SiteStep = SiteStep.toObject()
      SiteStep = pick(SiteStep, ['dCreatedAt', '_id', 'eMediaType', 'sTitle', 'sImage'])

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].add_success.replace('##', 'Site step'), data: SiteStep })
    } catch (error) {
      return catchError('SiteStepsService.adminAdd', error, req, res)
    }
  }

  async adminUpdate(req, res) {
    try {
      const { id: iSiteStepId } = req.params

      if (iSiteStepId && !ObjectId.isValid(iSiteStepId)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Site step id') })

      removenull(req.body)
      req.body = pick(req.body, ['eMediaType', 'sImage', 'eStatus'])

      const siteStepExists = await SiteStepsModel.findById(iSiteStepId)
      if (!siteStepExists) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Site step') })

      const siteStep = await SiteStepsModel.findByIdAndUpdate(iSiteStepId, { ...req.body }, { fields: { dCreatedAt: 1, _id: 1, eMediaType: 1, sTitle: 1, sImage: 1 }, new: true, runValidators: true })

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].update_success.replace('##', 'Site step'), data: siteStep })
    } catch (error) {
      return catchError('SiteStepsService.adminUpdate', error, req, res)
    }
  }

  async adminList(req, res) {
    try {
      removenull(req.body)
      req.query = pick(req.query, ['start', 'limit', 'sort', 'order', 'search', 'sd', 'ed'])
      const { start, limit, sorting, search } = getPaginationParams(req.query)

      const [data = { total: 0, results: [] }] = await SiteStepsModel.aggregate([
        {
          $match: {
            dCreatedAt: { $exists: 1 },
            $or: [
              { sTitle: { $regex: new RegExp('^.*' + search + '.*', 'i') } }
            ]
          }
        },
        { $sort: sorting },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            results: [
              { $skip: parseInt(start) },
              { $limit: parseInt(limit) },
              { $project: { sTitle: 1, eMediaType: 1, sImage: 1, dCreatedAt: 1, bIsActive: 1 } }]
          }
        },
        { $project: { results: 1, total: { $ifNull: [{ $arrayElemAt: ['$metadata.total', 0] }, 0] } } }
      ]).exec()

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Site steps list'), data })
    } catch (error) {
      return catchError('SiteStepsService.adminList', error, req, res)
    }
  }

  async adminGetDetails(req, res) {
    try {
      removenull(req.params)
      const { id: iSiteStepId } = req.params
      if (iSiteStepId && !ObjectId.isValid(iSiteStepId)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Site step id') })

      const siteStep = await SiteStepsModel.findById(iSiteStepId, { sTitle: 1, eMediaType: 1, bIsActive: 1, dCreatedAt: 1, sImage: 1 })
      if (!siteStep) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Site step') })

      return res.status(status.OK).jsonp({
        status: jsonStatus.OK,
        message: messages[req.userLanguage].success.replace('##', 'Site details'),
        data: siteStep
      })
    } catch (error) {
      return catchError('SiteStepsService.adminGetDetails', error, req, res)
    }
  }

  async adminGetSignedUrl(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      req.query = pick(req.query, ['sFileName', 'sContentType'])

      let { sFileName, sContentType } = req.query

      sFileName = sFileName.replace('/', '-')
      sFileName = sFileName.replace(/\s/gi, '-')

      const s3Path = 'admin/sitesteps/'
      const fileKey = `${Date.now()}_${sFileName}`

      const s3Params = {
        Bucket: config.S3_MEDIA_BUCKET_NAME,
        Key: s3Path + fileKey,
        ContentType: sContentType,
        Expires: 100
      }
      s3.getSignedUrl('putObject', s3Params, function (error, url) {
        if (error) {
          catchError('SiteStepsService.getSignedUrl', error, req, res)
        } else {
          return res.status(status.OK).jsonp({
            status: jsonStatus.OK,
            message: messages[req.userLanguage].presigned_succ,
            data: {
              sUrl: url,
              sPath: s3Path + fileKey
            }
          })
        }
      })
    } catch (error) {
      return catchError('SiteStepsService.adminGetPresignedUrl', error, req, res)
    }
  }

  async listSiteSteps(req, res) {
    try {
      removenull(req.body)
      req.query = pick(req.query, ['start', 'limit'])
      const { start, limit, sorting } = getPaginationParams(req.query)
      const [data = { total: 0, results: [] }] = await SiteStepsModel.aggregate([
        { $sort: sorting },
        { $match: { bIsActive: true } },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            results: [
              { $skip: parseInt(start) },
              { $limit: parseInt(limit) },
              { $project: { sTitle: 1, eMediaType: 1, dCreatedAt: 1, sImage: 1, bIsActive: 1 } }]
          }
        },
        { $project: { results: 1, total: { $ifNull: [{ $arrayElemAt: ['$metadata.total', 0] }, 0] } } }
      ]).exec()

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Site steps list'), data })
    } catch (error) {
      return catchError('SiteStepsService.listSiteSteps', error, req, res)
    }
  }
}

module.exports = new SiteStepsService()
