const SitesModel = require('./model')
const DepartmentsModel = require('../department/model')
const ZonesModel = require('../zone/model')
const UsersModel = require('../user/model')
const CheckListModel = require('../checkList/models')
const WorkTypesModel = require('../worktype/model')
const SiteStepsModel = require('../siteSteps/model')
const { messages, status, jsonStatus } = require('./../../helper/api.responses')
const { removenull, catchError, pick, getPaginationParams } = require('./../../helper/utilities.services')
const { validationResult } = require('express-validator')
const ObjectId = require('mongoose').Types.ObjectId

class Site {
  async adminAddSite(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })
      removenull(req.body)

      req.body = pick(req.body, ['sName', 'iUserId', 'iSupervisorId', 'sAddress', 'nMinLength', 'nMaxLength', 'aWorkTypeIds', 'iDepartmentId', 'iZoneId', 'aSiteSteps'])

      const { sName, iUserId, iSupervisorId, nMinLength, nMaxLength, aWorkTypeIds, iDepartmentId, iZoneId, aSiteSteps } = req.body

      if (iUserId === iSupervisorId) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].supervisor_user_same })

      let invalidId = ''
      for (const id of [iUserId, iSupervisorId, iDepartmentId, iZoneId]) {
        if (!ObjectId.isValid(id)) {
          [invalidId] = Object.entries(req.body).find(([k, v]) => v === id ? k : null)
          break
        }
      }

      if (invalidId) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', invalidId) })

      const departmentUpdate = await DepartmentsModel.findOneAndUpdate({ _id: ObjectId(iDepartmentId), bIsActive: true }, { $inc: { nSites: 1 } }, { new: true, runValidators: true }).lean()
      if (!departmentUpdate) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Department') })

      const zonesUpdate = await ZonesModel.findOneAndUpdate({ _id: ObjectId(iZoneId), bIsActive: true }, { $inc: { nSites: 1 } }, { new: true, runValidators: true }).lean()
      if (!zonesUpdate) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Zone') })

      const workTypesUpdate = await WorkTypesModel.findOneAndUpdate({ _id: { $in: aWorkTypeIds.map(id => ObjectId(id)) }, bIsActive: true }, { $inc: { nSites: 1 } }, { new: true, runValidators: true }).lean()
      if (!workTypesUpdate) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Work Type') })

      const siteStepIds = aSiteSteps.map(iStepId => ObjectId(iStepId))
      // const checkListIds = aCheckList.map(iChecklistId => ObjectId(iChecklistId))

      const stepsCount = await SiteStepsModel.countDocuments({ _id: { $in: siteStepIds } })
      if (!stepsCount || siteStepIds.length !== stepsCount) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Site Step id') })

      // const checklistCount = await CheckListModel.countDocuments({ _id: { $in: checkListIds } })
      // if (!checklistCount || checklistCount !== checkListIds.length) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Checklist Item id') })

      if (nMinLength <= 0 || nMaxLength <= 0 || nMinLength >= nMaxLength) {
        return res.status(status.BadRequest).jsonp({
          status: jsonStatus.BadRequest,
          message: messages[req.userLanguage].invalid.replace('##', 'Minimum or Maximum length')
        })
      }

      const site = await SitesModel.findOne({ sName: { $regex: new RegExp('^.*' + sName + '.*', 'i') } })
      if (site) {
        return res.status(status.BadRequest).jsonp({
          status: jsonStatus.BadRequest,
          message: messages[req.userLanguage].already_exist.replace('##', 'Site name')
        })
      }

      const checkListIds = await CheckListModel.find({ bIsActive: true }).lean()

      const newFields = {
        aSiteSteps: siteStepIds.map((id, i) => ({ iSiteStepId: id })),
        aCheckList: checkListIds.map((id, i) => ({ iCheckListId: id })),
        eStatus: 'NV'
      }

      const newSite = new SitesModel({ ...req.body, ...newFields })
      const data = await newSite.save()

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].add_success.replace('##', 'Site'), data })
    } catch (error) {
      return catchError('Site.addSite', error, req, res)
    }
  }

  async adminUpdateSite(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })
      removenull(req.body)

      req.body = pick(req.body, ['sName', 'iSiteId', 'iUserId', 'iSupervisorId', 'sAddress', 'nMinLength', 'nMaxLength', 'aWorkTypeIds', 'iDepartmentId', 'iZoneId', 'aSiteSteps'])
    } catch (error) {
      return catchError('Site.adminUpdateSite', error, req, res)
    }
  }

  async listSiteSteps(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.query)
      req.query = pick(req.query, ['iSiteId'])
      const { iSiteId = null } = req.query

      const [data = { results: [] }] = await SitesModel.aggregate([
        { $match: { _id: ObjectId(iSiteId), eStatus: 'ON' } },
        { $unwind: '$aSiteSteps' },
        {
          $lookup: {
            from: 'sitesteps',
            localField: 'aSiteSteps.iSiteStepId',
            foreignField: '_id',
            as: 'siteSteps'
          }
        },
        { $unwind: '$siteSteps' },
        {
          $group: {
            _id: '$_id',
            results: {
              $push: {
                $cond: [
                  { $eq: ['$siteSteps.bIsActive', true] },
                  {
                    _id: '$siteSteps._id',
                    sTitle: '$siteSteps.sTitle',
                    sImage: '$siteSteps.sImage',
                    eMediaType: '$siteSteps.eMediaType',
                    aMediaUrls: '$aSiteSteps.aMediaUrls',
                    bIsUploaded: {
                      $cond: [
                        '$aSiteSteps.aMediaUrls', true, false
                      ]
                    }
                  },
                  '$$REMOVE'
                ]
              }
            }
          }
        }
      ])

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Site Steps'), data })
    } catch (error) {
      return catchError('Site.listSiteSteps', error, req, res)
    }
  }

  async listSiteChecklist(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.query)
      req.query = pick(req.query, ['iSiteId'])
      const { iSiteId = null } = req.query

      const [data = { results: [] }] = await SitesModel.aggregate([
        { $match: { _id: ObjectId(iSiteId) } },
        { $unwind: '$aCheckList' },
        {
          $lookup: {
            from: 'checklists',
            localField: 'aCheckList.iCheckListId',
            foreignField: '_id',
            as: 'checkListItems'
          }
        },
        { $unwind: '$checkListItems' },
        {
          $group: {
            _id: '$_id',
            results: {
              $push: {
                $cond: [
                  { $eq: ['$checkListItems.bIsActive', true] },
                  {
                    _id: '$checkListItems._id',
                    sTitle: '$checkListItems.sTitle',
                    sImage: '$checkListItems.sImage',
                    bIsOptional: '$checkListItems.bIsOptional',
                    eMediaType: '$checkListItems.eMediaType'
                  },
                  '$$REMOVE'
                ]
              }
            }
          }
        }
      ])

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Site Checklist'), data })
    } catch (error) {
      return catchError('Site.listCheckList', error, req, res)
    }
  }

  async listSites(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.query)
      const { start, limit, sorting, sd, ed, search } = getPaginationParams(req.query)
      const { search: qSearch, eStatus: qEStatus = '', aWorkTypeIds: qAWorkTypeIds = [], iZoneId: qIZoneId = '', iDepartmentId: qIDepartmentId = '', eBillRemainStatus: qECmpStatus = '' } = req.query

      const filters = { $and: [{ dCreatedAt: { $lte: new Date() } }] }
      if (sd) filters.$and.push({ dCreatedAt: { $gte: new Date(sd) } })
      if (ed) filters.$and.push({ dCreatedAt: { $lte: new Date(ed) } })

      if (qECmpStatus && !['MS', 'BC', 'BS', 'SESC', 'AMCR'].includes(qECmpStatus)) {
        return res.status(status.BadRequest).jsonp({
          status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'eBillRemainStatus')
        })
      }
      const eBillRemainStatus = qECmpStatus || ''

      let eStatus = null

      if (!req.admin) {
        const user = await UsersModel.findById(req.user._id)
        eStatus = user.eType === 'S' ? (qEStatus || 'NV') : (qEStatus || 'P')
        filters.$and.push({ $or: [{ iSupervisorId: user._id }, { iUserId: user._id }] })

        if (user.eType === 'L' && !['P', 'ON', 'SUB', 'CMP'].includes(eStatus)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'eStatus') })

        if (user.eType === 'S' && !['NV', 'P', 'ON', 'CMP'].includes(eStatus)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'eStatus') })
      }

      if (qSearch) filters.$and.push({ sName: { $regex: new RegExp('^.*' + search + '.*', 'i') } })
      if (eStatus) filters.$and.push({ eStatus })
      if (qAWorkTypeIds && !!qAWorkTypeIds.length) filters.$and.push({ aWorkTypeIds: { $in: qAWorkTypeIds } })
      if (qIZoneId) filters.$and.push({ iZoneId: ObjectId(qIZoneId) })
      if (qIDepartmentId) filters.$and.push({ iDepartmentId: ObjectId(qIDepartmentId) })
      if (eBillRemainStatus) filters.$and.push({ eBillRemainStatus })

      const [data = { total: 0, results: [] }] = await SitesModel.aggregate([
        { $match: filters },
        {
          $lookup: {
            from: 'worktypes',
            let: { ids: '$aWorkTypes.iWorkTypeId', iWorkTypeId: '$iWorkTypeId' },
            pipeline: [
              { $match: { $or: [{ $expr: { $in: ['$_id', { $ifNull: ['$$ids', []] }] } }, '$$iWorkTypeId'] } },
              { $project: { sTitle: 1 } }
            ],
            as: 'workTypeData'
          }
        },
        { $unwind: '$workTypeData' },
        // {
        //   $lookup: {
        //     from: 'worktypes',
        //     localField: 'aWorkTypeIds',
        //     foreignField: '_id',
        //     as: 'workTypeData'
        //   }
        // },
        // { $unwind: '$workTypeData' },
        {
          $lookup: {
            from: 'users',
            let: { userId: '$iUserId', supervisorId: '$iSupervisorId' },
            pipeline: [{
              $facet: {
                supervisor: [{ $match: { $expr: { $eq: ['$_id', '$$supervisorId'] } } }, { $project: { sName: 1 } }],
                user: [{ $match: { $expr: { $eq: ['$_id', '$$userId'] } } }, { $project: { sName: 1 } }]
              }
            },
            { $unwind: { path: '$supervisor', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
            ],
            as: 'userData'
          }
        },
        { $unwind: '$userData' },
        {
          $lookup: {
            from: 'departments',
            localField: 'iDepartmentId',
            foreignField: '_id',
            as: 'departmentData'
          }
        },
        { $unwind: '$departmentData' },
        {
          $lookup: {
            from: 'zones',
            localField: 'iZoneId',
            foreignField: '_id',
            as: 'zoneData'
          }
        },
        { $unwind: '$zoneData' },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            results: [
              { $sort: sorting },
              { $skip: start },
              { $limit: limit },
              // {
              //   $addFields: {
              //     aWorkTypes: {
              //       $reduce: {
              //         input: '$workTypeData',
              //         initialValue: [],
              //         in: {
              //           $concatArrays: [
              //             '$$value', [{
              //               $mergeObjects: ['$$this', {
              //                 $arrayElemAt: [{
              //                   $filter: {
              //                     input: '$aWorkTypes',
              //                     as: 'item',
              //                     cond: { $eq: ['$$item.iWorkTypeId', '$$this._id'] }
              //                   }
              //                 }, 0]
              //               }]
              //             }]
              //           ]
              //         }
              //       }
              //     }
              //   }
              // },
              {
                $project: {
                  sName: 1,
                  dCreatedAt: 1,
                  nMinLength: 1,
                  nMaxLength: 1,
                  eStatus: 1,
                  sAddress: 1,
                  aWorkTypes: 1,
                  eBillRemainStatus: 1,
                  sUsername: { $ifNull: ['$userData.user.sName', ''] },
                  sSupervisorname: { $ifNull: ['$userData.supervisor.sName', ''] },
                  sDepartment: { $ifNull: ['$departmentData.sName', ''] },
                  sZone: { $ifNull: ['$zoneData.sName', ''] }
                }
              }
            ]
          }
        },
        { $project: { results: 1, total: { $arrayElemAt: ['$metadata.total', 0] } } }
      ])

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Sites list'), data })
    } catch (error) {
      return catchError('Site.listSites', error, req, res)
    }
  }

  async adminGetDetails(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      const { id: iSiteId = null } = req.params

      if (!iSiteId || !ObjectId.isValid(iSiteId)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Site Id') })

      const [data = {}] = await SitesModel.aggregate([
        { $match: { _id: ObjectId(iSiteId) } },
        {
          $lookup: {
            from: 'users',
            let: { userId: '$iUserId', supervisorId: '$iSupervisorId' },
            pipeline: [{
              $facet: {
                user: [{ $match: { $expr: { $eq: ['$$userId', '$_id'] } } }, { $project: { sName: 1 } }],
                supervisor: [{ $match: { $expr: { $eq: ['$$supervisorId', '$_id'] } } }, { $project: { sName: 1 } }]
              }
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$supervisor', preserveNullAndEmptyArrays: true } }
            ],
            as: 'userData'
          }
        },
        { $unwind: '$userData' },
        {
          $lookup: {
            from: 'checklists',
            let: { ids: '$aCheckList.iCheckListId' },
            pipeline: [
              { $match: { $expr: { $in: ['$_id', '$$ids'] } } },
              { $project: { sTitle: 1, eMediaType: 1, sImage: 1 } }
            ],
            as: 'checklistData'
          }
        },
        {
          $lookup: {
            from: 'worktypes',
            let: { ids: '$aWorkTypeIds.iWorkTypeId' },
            pipeline: [
              { $match: { $expr: { $in: ['$_id', '$$ids'] } } },
              { $project: { sTitle: 1 } }
            ],
            as: 'workTypeData'
          }
        },
        { $unwind: '$workTypeData' },
        {
          $lookup: {
            from: 'sitesteps',
            let: { ids: '$aSiteSteps.iSiteStepId' },
            pipeline: [
              { $match: { $expr: { $in: ['$_id', '$$ids'] } } },
              { $project: { sTitle: 1, eMediaType: 1, sImage: 1 } }
            ],
            as: 'sitestepData'
          }
        },
        {
          $lookup: {
            from: 'departments',
            localField: 'iDepartmentId',
            foreignField: '_id',
            as: 'departmentData'
          }
        },
        { $unwind: '$departmentData' },
        {
          $lookup: {
            from: 'remarks',
            localField: 'aRemarks',
            foreignField: '_id',
            as: 'remarksData'
          }
        },
        {
          $unwind: { path: '$remarksData', preserveNullAndEmptyArrays: true }
        },
        {
          $lookup: {
            from: 'zones',
            localField: 'iZoneId',
            foreignField: '_id',
            as: 'zoneData'
          }
        },
        { $unwind: '$zoneData' },
        {
          $addFields: {
            aWorkTypes: {
              $reduce: {
                input: '$workTypeData',
                initialValue: [],
                in: {
                  $concatArrays: [
                    '$$value',
                    [{
                      $mergeObjects: ['$$this', {
                        $arrayElemAt: [{
                          $filter: {
                            input: '$aWorkTypes',
                            as: 'item',
                            cond: { $eq: ['$$item.iWorkTypeId', '$$this._id'] }
                          }
                        }, 0]
                      }]
                    }]
                  ]
                }
              }
            },
            aChecklist: {
              $reduce: {
                input: '$checklistData',
                initialValue: [],
                in: {
                  $concatArrays: [
                    '$$value',
                    [{
                      $mergeObjects: ['$$this', {
                        $arrayElemAt: [{
                          $filter: {
                            input: '$aCheckList',
                            as: 'item',
                            cond: { $eq: ['$$item.iCheckListId', '$$this._id'] }
                          }
                        }, 0]
                      }]
                    }]
                  ]
                }
              }
            },
            aSiteSteps: {
              $reduce: {
                input: '$sitestepData',
                initialValue: [],
                in: {
                  $concatArrays: [
                    '$$value',
                    [{
                      $mergeObjects: ['$$this', {
                        $arrayElemAt: [{
                          $filter: {
                            input: '$aSiteSteps',
                            as: 'item',
                            cond: { $eq: ['$$item.iSiteStepId', '$$this._id'] }
                          }
                        }, 0]
                      }]
                    }]
                  ]
                }
              }
            }
          }
        },
        {
          $project: {
            sName: 1,
            dCreatedAt: 1,
            nMinLength: 1,
            nMaxLength: 1,
            eStatus: 1,
            sAddress: 1,
            sUsername: '$userData.user.sName',
            sSupervisorname: '$userData.supervisor.sName',
            // sWorktype: '$workTypeData.sName',
            aWorkTypes: 1,
            sDepartment: '$departmentData.sName',
            sZone: { $ifNull: ['$zoneData.sName', ''] },
            aSiteSteps: 1,
            aSitePhotos: 1,
            aChecklist: 1,
            aBeforeSiteCondition: { $ifNull: ['$aBeforeSiteCondition', []] },
            aMeasurementBook: { $ifNull: ['$aMeasurementBook', []] },
            aSupervisorCheckIns: { $ifNull: ['$aSupervisorCheckIns', []] },
            aUserCheckIns: { $ifNull: ['$aUserCheckIns', []] },
            aRemarks: 1,
            eBillRemainStatus: { $ifNull: ['$eBillRemainStatus', ''] }
          }
        }
      ])

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Site details'), data })
    } catch (error) {
      return catchError('Site.adminGetDetails', error, req, res)
    }
  }

  async addLocation(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      req.body = pick(req.body, ['iSiteId', 'oLocation'])
      removenull(req.body)
      const { oLocation, iSiteId } = req.body

      const site = await SitesModel.findOne({ _id: ObjectId(iSiteId), eStatus: { $in: ['NV'] }, dCreatedAt: { $lt: new Date() } })
      if (!site) {
        return res.status(status.NotFound).jsonp({
          status: jsonStatus.NotFound,
          message: messages[req.userLanguage].not_found.replace('##', 'Site')
        })
      }

      site.oLocation = oLocation
      await site.save()

      return res.status(status.OK).jsonp({
        status: jsonStatus.OK,
        message: messages[req.userLanguage].action_successfully.replace('##', 'Site Location Added')
      })
    } catch (err) {
      return catchError('Site.checkIn', err, req, res)
    }
  }

  async verifyLocation(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      const { oLocation, iSiteId } = req.body

      const site = await SitesModel.findOne({ _id: ObjectId(iSiteId), eStatus: { $in: ['NV'] }, dCreatedAt: { $lt: new Date() } })
      if (!site) {
        return res.status(status.NotFound).jsonp({
          status: jsonStatus.NotFound,
          message: messages[req.userLanguage].not_found.replace('##', 'Site')
        })
      }

      site.oLocation = oLocation
      await site.save()

      return res.status(status.OK).jsonp({
        status: jsonStatus.OK,
        message: messages[req.userLanguage].action_successfully.replace('##', 'Site Location Added')
      })
    } catch (err) {
      return catchError('Site.verifyLocation', err, req, res)
    }
  }

  async checkIn(req, res) {
    try {
      req.body = pick(req.body, ['iSiteId', 'oLocation'])
      removenull(req.body)
      const { oLocation, iSiteId } = req.body
      let site = await SitesModel.findOne({ _id: ObjectId(iSiteId), eStatus: 'P' })
      if (!site) {
        return res.status(status.NotFound).jsonp({
          status: jsonStatus.NotFound,
          message: messages[req.userLanguage].not_found.replace('##', 'Site')
        })
      }

      console.log('oLocation.coordinates', oLocation.coordinates)

      site = await SitesModel.find({
        oLocation: {
          $geoWithin: { $centerSphere: [oLocation.coordinates, 0.0000000048711] }
        }
      })

      if (!site.length) {
        return res.status(status.NotFound).jsonp({
          status: jsonStatus.NotFound,
          message: messages[req.userLanguage].not_found.replace('##', 'Site')
        })
      }

      site = await SitesModel.findByIdAndUpdate(iSiteId, { $push: { aUserCheckIns: { sIpAddr: req.connection.remoteAddress, oLocation: { ...oLocation } } } }, { new: true })

      return res.status(status.OK).jsonp({
        status: jsonStatus.OK,
        message: messages[req.userLanguage].action_successfully.replace('##', 'User checked in'),
        data: site
      })
    } catch (err) {
      return catchError('Site.checkIn', err, req, res)
    }
  }

  // Functions related to upload photos
  async addSitePhotos(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.body)
      req.body = pick(req.body, ['iSiteId', 'aMediaUrls', 'bIsSiteCompleted'])
      const { iSiteId = null, aMediaUrls: aSitePhotos = [], bIsSiteCompleted = false } = req.body

      const site = await SitesModel.findOneAndUpdate({ _id: ObjectId(iSiteId), eStatus: 'NV' }, { eStatus: bIsSiteCompleted ? 'CMP' : 'P', $push: { aSitePhotos: [...aSitePhotos] } }, { new: true, runValidators: true, projection: { aSitePhotos: 1 } })

      if (!site) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Site') })

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].add_success.replace('##', 'Site Photos') })
    } catch (err) {
      return catchError('Site.addSitePhotos', err, req, res)
    }
  }

  async addBeforeSiteConditionPics(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.body)
      req.body = pick(req.body, ['iSiteId', 'aMediaUrls'])
      const { iSiteId = null, aMediaUrls: aBeforeSiteCondition = [] } = req.body

      const site = await SitesModel.findOneAndUpdate({ _id: ObjectId(iSiteId), iUserId: req.user._id }, {
        $push: {
          aBeforeSiteCondition: [...aBeforeSiteCondition]
        }
      }, { new: true, runValidators: true, projection: { aBeforeSiteCondition: 1 } })

      if (!site) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Site') })

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].add_success.replace('##', 'Site Condition Photos') })
    } catch (err) {
      return catchError('Site.addBeforeSiteConditionPics', err, req, res)
    }
  }

  async addMeasurementBookMedia(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.body)
      req.body = pick(req.body, ['iSiteId', 'aMediaUrls'])
      const { iSiteId = null, aMediaUrls: aMeasurementBook = [] } = req.body

      const site = await SitesModel.findOneAndUpdate({ _id: ObjectId(iSiteId), eStatus: 'ON' }, {
        eStatus: 'CMP',
        $push: {
          aMeasurementBook: [...aMeasurementBook]
        }
      }, { new: true, runValidators: true, projection: { aMeasurementBook: 1 } })

      console.log('no site')

      if (!site) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Site') })

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].add_success.replace('##', 'Measurement Book Media') })
    } catch (err) {
      return catchError('Site.addMeasurementBookMedia', err, req, res)
    }
  }

  async addCheckListItemsPics(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.body)
      req.body = pick(req.body, ['iSiteId', 'aMediaUrls'])
      const { iSiteId = null, aMediaUrls = [] } = req.body

      const site = await SitesModel.findOne({ _id: ObjectId(iSiteId), eStatus: 'P' })
      if (!site) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Site') })

      site.aCheckList = site.aCheckList.map((item, i) => {
        const index = aMediaUrls.findIndex(media => media.iCheckListId && `${media.iCheckListId}` === `${item.iCheckListId}`)
        if (index > -1) {
          item.aMediaUrls = item.aMediaUrls && item.aMediaUrls.length ? [...item.aMediaUrls, { sUrl: aMediaUrls[index].sUrl }] : [{ sUrl: aMediaUrls[index].sUrl }]
        }
        return item
      })
      site.eStatus = 'ON'
      await site.save()
      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].add_success.replace('##', 'Checklist Pictures') })
    } catch (err) {
      return catchError('Site.addCheckListItemsPics', err, req, res)
    }
  }

  async addSiteStepsMedia(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.body)
      req.body = pick(req.body, ['iSiteId', 'aMediaUrls', 'iSiteStepId'])
      const { iSiteId = null, aMediaUrls = [], iSiteStepId = null } = req.body

      const site = await SitesModel.findOne({ _id: ObjectId(iSiteId), eStatus: 'ON', iUserId: req.user._id })
      if (!site) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Site') })

      site.aSiteSteps = site.aSiteSteps.map((item, i) => {
        const index = site.aSiteSteps.findIndex(step => step.iSiteStepId && `${step.iSiteStepId}` === `${iSiteStepId}`)
        if (index > -1 && i === index) {
          item.aMediaUrls = item.aMediaUrls && item.aMediaUrls.length ? [...item.aMediaUrls, ...aMediaUrls] : [...aMediaUrls]
        }
        return item
      })
      await site.save()
      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].add_success.replace('##', 'Site Steps Media') })
    } catch (err) {
      return catchError('Site.addSiteStepsMedia', err, req, res)
    }
  }

  async checkoutFromSite(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.body)
      req.body = pick(req.body, ['iSiteId'])
      const { iSiteId = null } = req.body

      let site = await SitesModel.findById(iSiteId)
      if (!site) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Site') })

      const siteStatus = site.eStatus === 'ON' ? 'Ongoing' : 'Pending'
      switch (site.eStatus) {
        case 'P': {
          // Todo => Remove before site condition pics aws s3
          delete site.aBeforeSiteCondition
          site.aCheckList.map((item) => {
            delete item.aMediaUrls
          })
          break
        }

        case 'ON': {
          // !Delete site steps uploaded urls + Status update to Ongoing
          // site.aSiteSteps = site.aSiteSteps.map((step) => {
          //   delete step.aMediaUrls
          //   return step
          // })
          break
        }

        default: break
      }

      site = await site.save()

      return res.status(status.OK).jsonp({
        status: jsonStatus.OK, message: messages[req.userLanguage].action_success.replace('##', `Checkout from ${siteStatus} site`), data: site
      })
    } catch (err) {
      return catchError('Site.checkoutFromSite', err, req, res)
    }
  }

  async listBeforeSiteConditionMedia(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.params)
      req.params = pick(req.params, ['iSiteId'])
      const { iSiteId } = req.params

      const { aBeforeSiteCondition: data = { results: [] } } = await SitesModel.findById(iSiteId, 'aBeforeSiteCondition')
      return res.status(status.OK).jsonp({
        status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Before Site Condition Media'), data: data.length ? { results: data } : data
      })
    } catch (err) {
      return catchError('Site.listBeforeSiteConditionMedia', err, req, res)
    }
  }

  async listMeasurementBookMedia(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.params)
      req.params = pick(req.params, ['iSiteId'])
      const { iSiteId } = req.params

      const { aMeasurementBook: data = { results: [] } } = await SitesModel.findById(iSiteId, 'aMeasurementBook')

      return res.status(status.OK).jsonp({
        status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Measurement Book Media'), data: data.length ? { results: data } : data
      })
    } catch (err) {
      return catchError('Site.listMeasurementBookMedia', err, req, res)
    }
  }

  async listSitePhotos(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.params)
      req.params = pick(req.params, ['iSiteId'])
      const { iSiteId } = req.params

      const data = await SitesModel.findById(iSiteId, 'aSitePhotos')

      return res.status(status.OK).jsonp({
        status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Site Photos List'), data
      })
    } catch (err) {
      return catchError('Site.listSitePhotos', err, req, res)
    }
  }

  async listSiteRemarks(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.params)
      req.params = pick(req.params, ['iSiteId'])
      const { iSiteId } = req.params

      const site = await SitesModel.findById(iSiteId, 'aRemarks').lean()

      return res.status(status.OK).jsonp({
        status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Site Photos List'), data: site
      })
    } catch (err) {
      return catchError('Site.listSiteRemarks', err, req, res)
    }
  }

  async addRemark(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.body)
      req.body = pick(req.body, ['sComment', 'aMediaUrls', 'iSiteId', 'eStatus'])
      const { iSiteId = null, sComment = '', aMediaUrls = [], eStatus = '' } = req.body

      const site = await SitesModel.findByIdAndUpdate(iSiteId, { $push: { aRemarks: { sComment, aMediaUrls, eStatus } } }, { new: true, runValidators: true, projection: { aRemarks: 1 } })

      if (!site) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Site') })

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].add_success.replace('##', 'Remark') })
    } catch (error) {
      return catchError('RemarkServices.add', error, req, res)
    }
  }
}

module.exports = new Site()
