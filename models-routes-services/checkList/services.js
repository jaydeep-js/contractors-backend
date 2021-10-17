const ChecklistModel = require('./models')
const { ObjectId } = require('mongoose').Types
const { validationResult } = require('express-validator')
const { status, jsonStatus, messages } = require('../../helper/api.responses')
const { getPaginationParams, removenull, pick, catchError } = require('../../helper/utilities.services')
const config = require('../../config')
const AWS = require('aws-sdk')

AWS.config.update({ accessKeyId: config.AWS_MEDIA_ACCESS_KEY, secretAccessKey: config.AWS_MEDIA_SECRET_KEY, signatureVersion: 'v4', region: 'ap-south-1' })
var s3 = new AWS.S3()

class CheckList {
  async adminAdd(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.body)
      req.body = pick(req.body, ['sImage', 'sTitle', 'bIsActive', 'bIsOptional', 'eMediaType'])

      let { sTitle, eMediaType } = req.body
      sTitle = (sTitle + '').trim()

      if (!['P', 'V'].includes(eMediaType)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Media Type') })

      const exists = await ChecklistModel.findOne({ sTitle: { $regex: new RegExp('^.*' + sTitle + '.*', 'i') } })
      if (exists) return res.status(status.ResourceExist).jsonp({ status: jsonStatus.ResourceExist, message: messages[req.userLanguage].already_exist.replace('##', 'Checklist item with similar name') })

      console.timeLog('req.body.sTitle', req.body.sTitle)
      let data = await ChecklistModel.create({ ...req.body, sTitle })
      data = pick(data.toObject(), ['sTitle', '_id', 'bIsActive', 'bIsOptional', 'eMediaType', 'sImage', 'dCreatedAt'])

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].add_success.replace('##', 'Checklist item'), data })
    } catch (error) {
      return catchError('Checklist.adminAdd', error, req, res)
    }
  }

  async adminGetDetails(req, res) {
    try {
      removenull(req.params)
      const { id: iChecklistItemId } = req.params
      if (iChecklistItemId && !ObjectId.isValid(iChecklistItemId)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Checklist item id') })

      const checklistItem = await ChecklistModel.findById(iChecklistItemId, { dCreatedAt: 1, bIsActive: 1, sImage: 1, sTitle: 1, bIsOptional: 1, eMediaType: 1 })
      if (!checklistItem) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Checklist item') })

      return res.status(status.OK).jsonp({
        status: jsonStatus.OK,
        message: messages[req.userLanguage].success.replace('##', 'Checklist item details'),
        data: checklistItem
      })
    } catch (error) {
      return catchError('Checklist.adminGetDetails', error, req, res)
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

      const s3Path = 'admin/Checklist/'
      const fileKey = `${Date.now()}_${sFileName}`

      const s3Params = {
        Bucket: config.S3_MEDIA_BUCKET_NAME,
        Key: s3Path + fileKey,
        ContentType: sContentType,
        Expires: 100
      }
      s3.getSignedUrl('putObject', s3Params, function (error, url) {
        if (error) {
          catchError('CheckList.getSignedUrl', error, req, res)
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
      return catchError('Checklist.adminGetPresignedUrl', error, req, res)
    }
  }

  async adminUpdate(req, res) {
    try {
      const { id: iChecklistItemId } = req.params

      if (iChecklistItemId && !ObjectId.isValid(iChecklistItemId)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Checklist item id') })

      removenull(req.body)
      req.body = pick(req.body, ['bIsActive', 'bIsOptional', 'eMediaType', 'sImage', 'dCreatedAt'])

      const { eMediaType } = req.body

      if (!['P', 'V'].includes(eMediaType)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Media Type') })

      const checklistItemExists = await ChecklistModel.findById(iChecklistItemId)
      if (!checklistItemExists) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Checklist item') })

      const checklistItem = await ChecklistModel.findByIdAndUpdate(iChecklistItemId, { ...req.body }, { fields: { dCreatedAt: 1, sImage: 1, bIsActive: 1, sTitle: 1, bIsOptional: 1, eMediaType: 1 }, new: true, runValidators: true })

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].update_success.replace('##', 'Checklist item'), data: checklistItem })
    } catch (error) {
      return catchError('Checklist.adminUpdateDepartment', error, req, res)
    }
  }

  async adminList(req, res) {
    try {
      req.query = pick(req.query, ['start', 'limit', 'sort', 'order', 'search', 'sd', 'ed'])
      const { start, limit, sorting, search } = getPaginationParams(req.query)

      const filters = { $and: [{ dCreatedAt: { $lte: new Date() } }] }

      const [data = { total: 0, results: [] }] = await ChecklistModel.aggregate([
        { $match: filters },
        {
          $match: {
            dCreatedAt: { $exists: 1 },
            $or: [
              { sTitle: { $regex: new RegExp('^.*' + search + '.*', 'i') } }
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
              { $project: { sTitle: 1, sImage: 1, bIsActive: 1, bIsOptional: 1, eMediaType: 1, dCreatedAt: 1 } }
            ]
          }
        },
        { $project: { results: 1, total: { $ifNull: [{ $arrayElemAt: ['$metadata.total', 0] }, 0] } } }
      ]).exec()

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Checklist items'), data })
    } catch (error) {
      return catchError('Checklist.adminList', error, req, res)
    }
  }

  async list(req, res) {
    try {
      req.query = pick(req.query, ['start', 'limit', 'sort', 'order', 'search', 'sd', 'ed'])
      const { start, limit, search } = getPaginationParams(req.query)

      const [data = { total: 0, results: [] }] = await ChecklistModel.aggregate([
        {
          $match: {
            bIsActive: true,
            $or: [
              { sTitle: { $regex: new RegExp('^.*' + search + '.*', 'i') } }
            ]
          }
        },
        {

          $facet: {
            metadata: [{ $count: 'total' }],
            results: [
              { $skip: parseInt(start) },
              { $limit: parseInt(limit) },
              { $project: { sTitle: 1, sImage: 1, bIsOptional: 1, eMediaType: 1, dCreatedAt: 1 } }
            ]
          }
        },
        { $project: { results: 1, total: { $ifNull: [{ $arrayElemAt: ['$metadata.total', 0] }, 0] } } }
      ])

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Checklist'), data })
    } catch (error) {
      return catchError('Checklist.list', error, req, res)
    }
  }
}

module.exports = new CheckList()
