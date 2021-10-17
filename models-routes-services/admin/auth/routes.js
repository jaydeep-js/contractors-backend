const router = require('express').Router()
const adminAuthServices = require('./services')
const { body } = require('express-validator')
const { jsonStatus, status, messages } = require('../../../helper/api.responses')
const { setLanguage, isAdminAuthenticated } = require('../../../middlewares/middleware')

router.post('/register', [
  body('sUsername').not().isEmpty(),
  body('sEmail').isEmail(),
  body('sMobNum').not().isEmpty(),
  body('sPassword').not().isEmpty(),
  body('sSecret').not().isEmpty()
], setLanguage, adminAuthServices.register)

router.post('/login', [
  body('sLogin').not().isEmpty(),
  body('sPassword').not().isEmpty()
], setLanguage, adminAuthServices.login)

router.put('/logout', isAdminAuthenticated, adminAuthServices.logout)

router.all('*', (req, res) => {
  return res.status(status.BadRequest).jsonp({
    status: jsonStatus.BadRequest,
    messages: messages.English.route_not_found
  })
})

module.exports = router
