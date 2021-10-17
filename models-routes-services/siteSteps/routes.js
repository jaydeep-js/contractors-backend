const router = require('express').Router()
const siteStepsService = require('./services')
const { jsonStatus, status, messages } = require('../../helper/api.responses')
const { isUserAuthenticated, isAdminAuthenticated } = require('../../middlewares/middleware')
const { check } = require('express-validator')

// user routes
router.get('/list', isUserAuthenticated, siteStepsService.listSiteSteps)

// admin routes
router.post('/admin/add', [
  check('sTitle').not().isEmpty(),
  check('bIsActive').isBoolean()
], isAdminAuthenticated, siteStepsService.adminAdd)

router.get('/admin/pre-signed-url', [
  check('sFileName').not().isEmpty(),
  check('sContentType').not().isEmpty()
], isAdminAuthenticated, siteStepsService.adminGetSignedUrl)

router.put('/admin/:id', isAdminAuthenticated, siteStepsService.adminUpdate)
router.get('/admin/list', isAdminAuthenticated, siteStepsService.adminList)
router.get('/admin/:id', isAdminAuthenticated, siteStepsService.adminGetDetails)

router.all('*', (req, res) => {
  return res.status(status.BadRequest).jsonp({
    status: jsonStatus.BadRequest,
    messages: messages.English.route_not_found
  })
})

module.exports = router
