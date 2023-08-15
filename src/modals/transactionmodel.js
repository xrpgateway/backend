const mongoose = require('mongoose');

// Define the XRPTransaction schema
const xrpTransactionSchema = new mongoose.Schema({
  paymentType: {
    type: String,
    required: true
  },
  transactionid: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  merchantId: {
    type: String,
    required: true
  },
  merchantSignedHash: {
    type: String,
    required: true
  },
  stage: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  payout: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'  
  },
  userTransactionHash: [
    {
      type: String
    }
  ],
  users: [
    {
      type: String
    }
  ],
  data:{
    type:String
  },
  extradata:{
    type:String
  }
});

// Create the XRPTransaction model
const XRPTransaction = mongoose.model('XRPTransaction', xrpTransactionSchema);

module.exports = XRPTransaction;
