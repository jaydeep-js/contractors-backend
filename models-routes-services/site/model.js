const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SiteSchema = new Schema({
  sName: { type: String, trim: true, required: true },
  iUserId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
  iSupervisorId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
  // iWorkTypeId: { type: Schema.Types.ObjectId, ref: 'worktypes', required: true },
  aWorkTypes: [{
    iWorkTypeId: { type: Schema.Types.ObjectId, ref: 'worktypes' }
  }],
  iDepartmentId: { type: Schema.Types.ObjectId, ref: 'departments', required: true },
  iZoneId: { type: Schema.Types.ObjectId, ref: 'zones', required: true },
  aRemarks: {
    type: [{
      sComment: { type: String, required: true },
      eStatus: { type: String, required: true },
      aMediaUrls: [{
        sUrl: { type: String }
      }]
    }],
    default: undefined
  },
  nMinLength: { type: Number, required: true },
  nMaxLength: { type: Number, required: true },
  eStatus: { type: String, enum: ['NV', 'ON', 'P', 'CMP', 'SUB'], default: 'NV' }, // NV : Not Visited by supervisor, ON:Ongoing, P : "Pending", "CMP":"Completed","SUB":"Submitted"
  eBillRemainStatus: { type: String, enum: ['MS', 'BC', 'BS', 'SESC', 'AMCR'] },
  // MS=Measurement Submitted, BC=Bill Credited, BS=Bill Submitted, SESC=SES Credited , "AMCR" : Amount Credited
  aCheckList: [{
    iCheckListId: { type: Schema.Types.ObjectId, ref: 'checklists' },
    aMediaUrls: {
      type: [{
        sUrl: { type: String }
      }],
      default: undefined
    }
  }],
  aSiteSteps: [{
    iSiteStepId: { type: Schema.Types.ObjectId, ref: 'sitesteps' },
    aMediaUrls: {
      type: [{
        sUrl: { type: String }
      }],
      default: undefined
    }
  }],
  aBeforeSiteCondition: {
    type: [{
      sUrl: { type: String, require: true }
    }],
    default: undefined
  },
  aSitePhotos: {
    type: [{
      sUrl: { type: String }
    }],
    default: undefined
  },
  aMeasurementBook: {
    type: [{
      sUrl: { type: String }
    }],
    default: undefined
  },
  sAddress: { type: String, default: '' },
  aUserCheckIns: {
    type: [
      {
        dUpdatedAt: { type: Date, default: new Date() },
        sIpAddr: { type: String },
        oLocation: {
          type: {
            type: String,
            enum: ['Point']
          },
          coordinates: {
            type: Array
          }
        }
      }
    ],
    default: undefined
  },
  oLocation: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number]
    }
  }
}, { timestamps: { createdAt: 'dCreatedAt', updatedAt: 'dUpdatedAt' } })

SiteSchema.index({ oLocation: '2dsphere' })
SiteSchema.index({ iUserId: 1, iWorkId: 1, iDeptId: 1, iZoneId: 1 })

module.exports = mongoose.model('Site', SiteSchema)

/*

ch1-123
  contractors-media/sites/:iSiteId/checklists/:iChecklistId_Date.now()
*/
