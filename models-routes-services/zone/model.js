const mongoose = require('mongoose')
const Schema = mongoose.Schema

const zoneSchema = new Schema({
  sName: { type: String, trim: true, required: true, unique: true },
  bIsActive: { type: Boolean, default: true },
  nSites: { type: Number, default: 0 }
}, { timestamps: { createdAt: 'dCreatedAt', updatedAt: 'dUpdatedAt' } })

module.exports = mongoose.model('Zone', zoneSchema)
