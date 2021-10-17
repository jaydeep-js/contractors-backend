const router = require('express').Router()
const zoneServices = require('./services')
const { check } = require('express-validator')
const { jsonStatus, status, messages } = require('../../helper/api.responses')
const { isUserAuthenticated, isAdminAuthenticated } = require('../../middlewares/middleware')

// user routes
router.get('/list', isUserAuthenticated, zoneServices.listZones)

// admin routes
router.post('/admin/add', [
  check('sName').not().isEmpty(),
  check('bIsActive').isBoolean()
], isAdminAuthenticated, zoneServices.adminAddZone)

router.put('/admin/:id', isAdminAuthenticated, zoneServices.adminUpdateZone)
router.get('/admin/list', isAdminAuthenticated, zoneServices.adminListZones)
router.get('/admin/:id', isAdminAuthenticated, zoneServices.adminGetZoneDetails)

router.all('*', (req, res) => {
  return res.status(status.BadRequest).jsonp({
    status: jsonStatus.BadRequest,
    messages: messages.English.route_not_found
  })
})

module.exports = router
