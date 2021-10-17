const router = require('express').Router()
const departmentServices = require('./services')
const { jsonStatus, status, messages } = require('../../helper/api.responses')
const { isUserAuthenticated, isAdminAuthenticated } = require('../../middlewares/middleware')
const { check } = require('express-validator')

// user routes
router.get('/list', isUserAuthenticated, departmentServices.listDepartments)
// admin routes

router.post('/admin/add', [
  check('sName').not().isEmpty(),
  check('bIsActive').isBoolean()
], isAdminAuthenticated, departmentServices.adminAddDepartment)

router.put('/admin/:id', isAdminAuthenticated, departmentServices.adminUpdateDepartment)
router.get('/admin/list', isAdminAuthenticated, departmentServices.adminListDepartments)
router.get('/admin/:id', isAdminAuthenticated, departmentServices.adminGetDepartmentDetails)
// router.post('/delete/:id', isAdminAuthenticated, zoneServices.adminDeleteZone)

router.all('*', (req, res) => {
  return res.status(status.BadRequest).jsonp({
    status: jsonStatus.BadRequest,
    messages: messages.English.route_not_found
  })
})

module.exports = router
