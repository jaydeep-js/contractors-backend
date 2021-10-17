const { ObjectId } = require('mongoose').Types
const DepartmentsModel = require('./model')
const { validationResult } = require('express-validator')
const { messages, status, jsonStatus } = require('../../helper/api.responses')
const { removenull, catchError, pick, getPaginationParams } = require('../../helper/utilities.services')
// const config = require('../../../config')

class DepartmentServices {
  async adminAddDepartment(req, res) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) return res.status(status.UnprocessableEntity).jsonp({ status: jsonStatus.UnprocessableEntity, errors: errors.array() })

      removenull(req.body)
      req.body = pick(req.body, ['sName', 'bIsActive'])
      const { sName = '' } = req.body
      req.body.sName = sName ? (sName + '').toUpperCase() : ''

      const departmentExists = await DepartmentsModel.findOne({ sName: req.body.sName })

      if (departmentExists) return res.status(status.ResourceExist).jsonp({ status: jsonStatus.ResourceExist, message: messages[req.userLanguage].already_exist.replace('##', 'Department name') })

      let department = await DepartmentsModel.create(req.body)
      department = department.toObject()
      department = pick(department, ['dCreatedAt', '_id', 'bIsActive', 'sName'])

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].add_success.replace('##', 'Department'), data: department })
    } catch (error) {
      return catchError('DepartmentServices.adminAddDepartment', error, req, res)
    }
  }

  async adminUpdateDepartment(req, res) {
    try {
      const { id: iDepartmentId } = req.params

      if (iDepartmentId && !ObjectId.isValid(iDepartmentId)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Department id') })

      removenull(req.body)
      req.body = pick(req.body, ['bIsActive'])

      const departmentExists = await DepartmentsModel.findById(iDepartmentId)
      if (!departmentExists) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Department') })

      const department = await DepartmentsModel.findByIdAndUpdate(iDepartmentId, { ...req.body }, { fields: { dCreatedAt: 1, _id: 1, bIsActive: 1, sName: 1 }, new: true, runValidators: true })

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].update_success.replace('##', 'Department'), data: department })
    } catch (error) {
      return catchError('DepartmentServices.adminUpdateDepartment', error, req, res)
    }
  }

  async adminListDepartments(req, res) {
    try {
      removenull(req.body)
      req.query = pick(req.query, ['start', 'limit', 'sort', 'order', 'search', 'sd', 'ed'])
      const { start, limit, sorting, search } = getPaginationParams(req.query)
      // const { sd, ed } = req.query

      // const filters = { $and: [{ dCreatedAt: { $lte: new Date() } }] }

      // const { startOfDay = null, endOfDay = null } = {}

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

      const [data = { total: 0, results: [] }] = await DepartmentsModel.aggregate([
        // { $match: filters },
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
              { $project: { sName: 1, bIsActive: 1, dCreatedAt: 1 } }
            ]
          }
        },
        { $project: { results: 1, total: { $ifNull: [{ $arrayElemAt: ['$metadata.total', 0] }, 0] } } }
      ]).exec()

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Departments list'), data })
    } catch (error) {
      return catchError('DepartmentServices.adminListDepartments', error, req, res)
    }
  }

  async adminGetDepartmentDetails(req, res) {
    try {
      removenull(req.params)
      const { id: iDepartmentId } = req.params
      if (iDepartmentId && !ObjectId.isValid(iDepartmentId)) return res.status(status.BadRequest).jsonp({ status: jsonStatus.BadRequest, message: messages[req.userLanguage].invalid.replace('##', 'Department id') })

      const department = await DepartmentsModel.findById(iDepartmentId, { sName: 1, bIsActive: 1, dCreatedAt: 1 })
      if (!department) return res.status(status.NotFound).jsonp({ status: jsonStatus.NotFound, message: messages[req.userLanguage].not_found.replace('##', 'Department') })

      return res.status(status.OK).jsonp({
        status: jsonStatus.OK,
        message: messages[req.userLanguage].success.replace('##', 'Department details'),
        data: department
      })
    } catch (error) {
      return catchError('DepartmentServices.adminGetDepartmentDetails', error, req, res)
    }
  }

  async listDepartments(req, res) {
    try {
      removenull(req.body)
      req.query = pick(req.query, ['start', 'limit', 'sort', 'order', 'search', 'sd', 'ed'])
      const { start, limit } = getPaginationParams(req.query)
      const [data = { total: 0, results: [] }] = await DepartmentsModel.aggregate([
        // { $sort: sorting },
        { $match: { bIsActive: true } },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            results: [
              { $skip: parseInt(start) },
              { $limit: parseInt(limit) },
              { $project: { sName: 1, dCreatedAt: 1, nSites: 1 } }
            ]
          }
        },
        { $project: { results: 1, total: { $ifNull: [{ $arrayElemAt: ['$metadata.total', 0] }, 0] } } }
      ]).exec()

      return res.status(status.OK).jsonp({ status: jsonStatus.OK, message: messages[req.userLanguage].success.replace('##', 'Departments list'), data })
    } catch (error) {
      return catchError('DepartmentServices.listDepartments', error, req, res)
    }
  }
}

module.exports = new DepartmentServices()
