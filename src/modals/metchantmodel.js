const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema({
  merchantId: {
    type: String,
    required: true,
    unique: true
  },
  merchantEmail: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  merchantKey: {
    type: String,
    required: true
  },
  merchantSecretKey: {
    type: String,
    required: true
  },
  totalpayout: {
    type: Number,
    default: 0
  },
  xrpaddr: {
    type: String,
    default: 0
  },
  webhookUrl: {
    type: String
  }
});

const Merchant = mongoose.model('Merchant', merchantSchema);

module.exports = Merchant;
