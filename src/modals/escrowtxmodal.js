const mongoose = require('mongoose');

// Define the XRPTransaction schema
const EscrowTransactionSchema = new mongoose.Schema({
    spid: String,
    amount: String,
    participants: [{
      email: String,
      escrowId: String,
      secret: String
    }],
  });

// Create the XRPTransaction model
const EscrowTransaction = mongoose.model('EscrowTransaction', EscrowTransactionSchema);

module.exports = EscrowTransaction;