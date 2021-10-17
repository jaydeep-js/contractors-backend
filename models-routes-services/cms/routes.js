const router = require('express').Router()
const cmsServices = require('./services')
const { jsonStatus, status, messages } = require('../../helper/api.responses')
const { isUserAuthenticated, isAdminAuthenticated } = require('../../middlewares/middleware')
const { check } = require('express-validator')

router.get('/user/list', isUserAuthenticated, cmsServices.userList)
router.get('/user/:sSlug', isUserAuthenticated, cmsServices.get)

// admin
router.post('/admin/add', [
  check('sName').not().isEmpty(),
  check('sSlug').not().isEmpty(),
  check('sDetails').not().isEmpty(),
  check('bIsActive').isBoolean()
], isAdminAuthenticated, cmsServices.add)

router.get('/admin', isAdminAuthenticated, cmsServices.list)

router.get('/admin/:sSlug', isAdminAuthenticated, cmsServices.adminGet)

router.put('/admin/:id', [
  check('sName').not().isEmpty(),
  check('sSlug').not().isEmpty(),
  check('sDetails').not().isEmpty(),
  check('bIsActive').isBoolean()
], isAdminAuthenticated, cmsServices.update)

router.delete('/admin/:id', isAdminAuthenticated, cmsServices.remove)

router.all('*', (req, res) => {
  return res.status(status.BadRequest).jsonp({
    status: jsonStatus.BadRequest,
    messages: messages.English.route_not_found
  })
})

module.exports = router
