const mongoose = require('mongoose');

const idmSpecSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Denormalized metadata for efficient list queries
  title: { type: String, default: '' },
  shortTitle: { type: String, default: '' },
  status: {
    type: String,
    enum: ['NP', 'WD', 'CD', 'DIS', 'IS', ''],
    default: 'NP',
    index: true
  },
  version: { type: String, default: '1.0' },

  // Persistent GUIDs
  idmGuid: { type: String, index: true },
  ucGuid: { type: String },
  bcmGuid: { type: String },

  // Full project data (same shape as .idm file)
  projectData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // List-view metadata
  erCount: { type: Number, default: 0 },
  language: { type: String, default: 'EN' },
  tags: [{ type: String }],

  // BPMN diagram thumbnail (small base64 PNG)
  thumbnail: { type: String }
}, {
  timestamps: true,
  minimize: false
});

// Text index for search
idmSpecSchema.index({ title: 'text', shortTitle: 'text' });

// Owner + recent first
idmSpecSchema.index({ owner: 1, updatedAt: -1 });

module.exports = mongoose.model('IdmSpec', idmSpecSchema);
