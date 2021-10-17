const mongoose = require('mongoose')
const Schema = mongoose.Schema

const siteStepsSchema = new Schema({
  sTitle: { type: String, trim: true, required: true },
  bIsActive: { type: Boolean, default: true },
  sImage: { type: String }, // 👉 To ask if this is to be sent from backend
  eMediaType: { type: String, enum: ['P', 'V'] } // P=Photo, V=Video
}, { timestamps: { createdAt: 'dCreatedAt', updatedAt: 'dUpdatedAt' } })

// siteStepsSchema.set('toObject', { getters: true })

module.exports = mongoose.model('SiteSteps', siteStepsSchema)
