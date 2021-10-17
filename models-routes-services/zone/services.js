const { ObjectId } = require('mongoose').Types
const { messages, status, jsonStatus } = require('../../helper/api.responses')
const ZonesModel = require('./model')
const { removenull, catchError, pick, getPaginationParams } = require('../../helper/utilities.services')
const { validationResult } = require('express-validator')

// const config = require('../../../config')

class ZoneServices {
  async adminAddZone(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.body)
      req.body = pick(req.body, ['sName', 'bIsActive'])
      const { sName = '' } = req.body
      req.body.sName = sName ? (sName + '').toUpperCase() : ''

      const zoneExists = await ZonesModel.findOne({ sName: req.body.sName })

      if (zoneExists) return res.status(status.ResourceExist).jsonp({ status: jsonStatus.ResourceExist, message: messages[req.userLanguage].already_exist.replace('##', 'Zone name') })

      let zone = await ZonesModel.create({ ...req.body })
      zone = zone.toObject()
      zone = pick(zone, ['dCreatedAt', '_id', 'bIsActive', 'sName'])

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].add_success.replace('##', 'Zone'), data: zone })
    } catch (error) {
      return catchError('ZoneServices.adminAddZone', error, req, res)
    }
  }

  async adminUpdateZone(req, res) {
    try {
      const { id: iZoneId } = req.params

      if (iZoneId && !ObjectId.isValid(iZoneId)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Zone id') })

      removenull(req.body)
      req.body = pick(req.body, ['bIsActive', 'sName'])

      const zoneExists = await ZonesModel.findById(iZoneId)
      if (!zoneExists) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Zone') })

      const zone = await ZonesModel.findByIdAndUpdate(iZoneId, { ...req.body }, { new: true, runValidators: true, fields: { dCreatedAt: 1, _id: 1, bIsActive: 1, sName: 1 } })

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].update_success.replace('##', 'Zone'), data: zone })
    } catch (error) {
      return catchError('ZoneServices.adminUpdateZone', error, req, res)
    }
  }

  async adminListZones(req, res) {
    try {
      removenull(req.body)
      req.query = pick(req.query, ['start', 'limit', 'sort', 'order', 'search', 'sd', 'ed'])
      const { start, limit, sorting, search } = getPaginationParams(req.query)
      const [data = { total: 0, results: [] }] = await ZonesModel.aggregate([
        {
          $match: {
            dCreatedAt: { $exists: 1 },
            $or: [
              { sName: { $regex: new RegExp('^.*' + search + '.*', 'i') } }
            ]
          }
        },
        { $sort: sorting },

        {
          $facet: {
            metadata: [
              { $count: 'total' }
            ],
            results: [
              { $skip: parseInt(start) },
              { $limit: parseInt(limit) },
              { $project: { sName: 1, bIsActive: 1, dCreatedAt: 1 } }]
          }
        },
        { $project: { results: 1, total: { $ifNull: [{ $arrayElemAt: ['$metadata.total', 0] }, 0] } } }
      ]).exec()

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Zones list'), data })
    } catch (error) {
      return catchError('ZoneServices.adminListZones', error, req, res)
    }
  }

  async adminGetZoneDetails(req, res) {
    try {
      removenull(req.params)
      const { id: iZoneId } = req.params
      if (iZoneId && !ObjectId.isValid(iZoneId)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Zone id') })

      const zone = await ZonesModel.findById(iZoneId, { sName: 1, bIsActive: 1, dCreatedAt: 1 })
      if (!zone) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Zone') })

      return res.status(status.OK).jsonp({
        status: jsonStatus.OK,
        message: messages[req.userLanguage].success.replace('##', 'Zone details'),
        data: zone
      })
    } catch (error) {
      return catchError('ZoneServices.adminGetZoneDetails', error, req, res)
    }
  }

  // async adminDeleteZone(req, res) {
  //   try {
  //     removenull(req.params)
  //     const { id: iZoneId } = req.params
  //     if (iZoneId && !ObjectId.isValid(iZoneId)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Zone id') })

  //     const zone = await ZonesModel.findById(iZoneId, { sName: 1, bIsActive: 1, dCreatedAt: 1 })
  //     if (!zone) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'User') })

  //     let deletedZone = await ZonesModel.findByIdAndRemove(iZoneId, { returnOriginal: 1 })
  //     deletedZone = keepSelectedProperties(zone, ['dCreatedAt', '_id', 'bIsActive', 'sName'])

  //     return res.status(status.OK).jsonp({
  //       status: jsonStatus.OK,
  //       message: messages[req.userLanguage].del_success.replace('##', 'Zone'),
  //       data: deletedZone
  //     })
  //   } catch (error) {
  //     return catchError('ZoneServices.adminDeleteZone', error, req, res)
  //   }
  // }

  async listZones(req, res) {
    try {
      removenull(req.body)
      req.query = pick(req.query, ['start', 'limit', 'sort', 'order', 'search', 'sd', 'ed'])
      const { start, limit } = getPaginationParams(req.query)
      const [data = { total: 0, results: [] }] = await ZonesModel.aggregate([
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

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Zones list'), data })
    } catch (error) {
      return catchError('ZoneServices.addZone', error, req, res)
    }
  }
}

module.exports = new ZoneServices()
