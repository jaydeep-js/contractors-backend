const { check } = require('express-validator')
const router = require('express').Router()
const workTypeServices = require('./services')
const { jsonStatus, status, messages } = require('../../helper/api.responses')
const { isUserAuthenticated, isAdminAuthenticated } = require('../../middlewares/middleware')

// user routes
router.get('/list', isUserAuthenticated, workTypeServices.listWorkTypes)

// admin routes
router.post('/admin/add', [
  check('sName').not().isEmpty(),
  check('bIsActive').isBoolean(),
  check('aSiteStepIds').isArray({ min: 1 })
], isAdminAuthenticated, workTypeServices.adminAddWorkType)

router.put('/admin/:id', isAdminAuthenticated, workTypeServices.adminUpdateWorkType)
router.get('/admin/list', isAdminAuthenticated, workTypeServices.adminListWorkTypes)
router.get('/admin/:id', isAdminAuthenticated, workTypeServices.adminGetWorkTypeDetails)
// router.post('/delete/:id', isAdminAuthenticated, workTypeServices.adminDeleteWorkType)

router.all('*', (req, res) => {
  return res.status(status.BadRequest).jsonp({
    status: jsonStatus.BadRequest,
    messages: messages.English.route_not_found
  })
})

module.exports = router
