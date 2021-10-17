const mongoose = require('mongoose')
const Schema = mongoose.Schema

const cmsSchema = new Schema({
  sSlug: { type: String, unique: true, required: true },
  sTitle: { type: String, trim: true, required: true },
  sDetails: { type: String, required: true },
  bIsActive: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'dCreatedAt', updatedAt: 'dUpdatedAt' } })

cmsSchema.index({ sSlug: 1 })

module.exports = mongoose.model('cms', cmsSchema)
