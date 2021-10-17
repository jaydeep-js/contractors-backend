const router = require('express').Router()
const siteServices = require('./services')
const { body, check } = require('express-validator')
const { jsonStatus, status, messages } = require('../../helper/api.responses')
const { isAdminAuthenticated, isUserAuthenticated } = require('../../middlewares/middleware')

// user registration by admin
router.post('/admin/add', [
  body('sName').not().isEmpty(),
  body('iUserId').not().isEmpty(),
  body('iSupervisorId').not().isEmpty(),
  body('iDepartmentId').not().isEmpty(),
  body('sAddress').not().isEmpty(),
  body('iZoneId').not().isEmpty(),
  body('iWorkTypeId').not().isEmpty(),
  body('nMinLength').not().isEmpty().isNumeric(),
  body('nMaxLength').not().isEmpty().isNumeric(),
  // body('oLocation').isObject(),
  // body('oLocation.type').not().isEmpty(),
  // body('oLocation.coordinates').isArray(),
  body('aSiteSteps').isArray()
  // body('aCheckList').isArray()
], isAdminAuthenticated, siteServices.adminAddSite)

router.put('/admin/:id', isAdminAuthenticated, siteServices.adminUpdateSite)

router.get('/admin/list', isAdminAuthenticated, siteServices.listSites)
router.get('/admin/:id', isAdminAuthenticated, siteServices.adminGetDetails)

// Users routes
router.get('/list', [
  check('eStatus').not().isEmpty()
], isUserAuthenticated, siteServices.listSites)

router.post('/site-photos', [
  check('iSiteId').not().isEmpty(),
  check('aMediaUrls').isArray({ min: 1 }),
  check('aMediaUrls.*.sUrl').isString().not().isEmpty()
], isUserAuthenticated, siteServices.addSitePhotos)

router.get('/site-photos/:iSiteId', [
  check('iSiteId').not().isEmpty()
], isUserAuthenticated, siteServices.listSitePhotos)

router.post('/remarks', [
  check('iSiteId').not().isEmpty().isMongoId(),
  check('eStatus').isIn(['ON', 'P', 'CMP']),
  check('aMediaUrls').isArray({ min: 1 }),
  check('aMediaUrls.*.sUrl').isString().not().isEmpty()
], isUserAuthenticated, siteServices.addRemark)

router.get('/admin/remarks/:iSiteId', isAdminAuthenticated, siteServices.listSiteRemarks)

router.post('/checklist-items',
  isUserAuthenticated, [
    check('iSiteId').not().isEmpty().isMongoId(),
    check('aMediaUrls').isArray({ min: 1 }),
    check('aMediaUrls.*.sUrl').isString().not().isEmpty(),
    check('aMediaUrls.*.iCheckListId').isMongoId().not().isEmpty()],
  siteServices.addCheckListItemsPics)

router.post('/checkout', [
  check('iSiteId').not().isEmpty().isMongoId()
],
isUserAuthenticated, siteServices.checkoutFromSite)

router.post('/location', [
  body('iSiteId').not().isEmpty(),
  body('oLocation').isObject(),
  body('oLocation.type').not().isEmpty(),
  body('oLocation.coordinates').isArray({ min: 2, max: 2 })
], isUserAuthenticated, siteServices.addLocation)

router.post('/check-in', [
  body('iSiteId').not().isEmpty(),
  body('oLocation').isObject(),
  body('oLocation.type').not().isEmpty(),
  body('oLocation.coordinates').isArray({ min: 2, max: 2 })
], isUserAuthenticated, siteServices.checkIn)

router.post('/verify-location', [
  body('iSiteId').not().isEmpty(),
  body('oLocation').isObject(),
  body('oLocation.type').not().isEmpty(),
  body('oLocation.coordinates').isArray({ min: 2, max: 2 })
], isUserAuthenticated, siteServices.verifyLocation)

router.post('/before-site-condition', [
  check('iSiteId').not().isEmpty(),
  check('aMediaUrls').isArray({ min: 1 }),
  check('aMediaUrls.*.sUrl').isString().not().isEmpty()
], isUserAuthenticated, siteServices.addBeforeSiteConditionPics)

router.post('/measurement-book', [
  check('iSiteId').not().isEmpty(),
  check('aMediaUrls').isArray({ min: 1 }),
  check('aMediaUrls.*.sUrl').isString().not().isEmpty()
], isUserAuthenticated, siteServices.addMeasurementBookMedia)

router.post('/sitesteps', [
  check('iSiteId').isMongoId().not().isEmpty(),
  check('iSiteStepId').isMongoId().not().isEmpty(),
  check('aMediaUrls').isArray({ min: 1 }),
  check('aMediaUrls.*.sUrl').isString().not().isEmpty()
], isUserAuthenticated, siteServices.addSiteStepsMedia)

router.get('/before-site-condition/:iSiteId', [
  check('iSiteId').not().isEmpty()
], isUserAuthenticated, siteServices.listBeforeSiteConditionMedia)

router.get('/measurement-book/:iSiteId', [
  check('iSiteId').not().isEmpty()
], isUserAuthenticated, siteServices.listMeasurementBookMedia)

router.get('/sitesteps', [
  check('iSiteId').isMongoId().not().isEmpty()
], isUserAuthenticated, siteServices.listSiteSteps)

router.get('/checklist', [
  check('iSiteId').not().isEmpty()
], isUserAuthenticated, siteServices.listSiteChecklist)

// router.post('/list-pending', isUserAuthenticated, siteServices.listPendingSites)

router.all('*', (req, res) => {
  return res.status(status.BadRequest).jsonp({
    status: jsonStatus.BadRequest,
    messages: messages.English.route_not_found
  })
})

module.exports = router
