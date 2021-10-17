const router = require('express').Router()
const userServices = require('./services')
const userAuthServices = require('../../user/auth/services.js')
const { jsonStatus, status, messages } = require('../../../helper/api.responses')
const { isAdminAuthenticated } = require('../../../middlewares/middleware')

router.post('/register', isAdminAuthenticated, userAuthServices.adminAddUser)
router.put('/:id', isAdminAuthenticated, userServices.adminUpdateUser)
router.get('/list', isAdminAuthenticated, userServices.adminListUsers)
router.get('/:id', isAdminAuthenticated, userServices.adminGetUserDetails)

router.all('*', (req, res) => {
  return res.status(status.BadRequest).jsonp({
    status: jsonStatus.BadRequest,
    messages: messages.English.route_not_found
  })
})

module.exports = router
