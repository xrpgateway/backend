const mongoose = require("mongoose");

// Define the XRPTransaction schema
const EscrowTransactionSchema = new mongoose.Schema({
  spid: String,
  amount: String,
  participants: [
    {
      email: String,
      txHash: String,
      secret: String,
    },
  ],
  merchantId: String,
  data: String,
  extradata: String,
});

// Create the XRPTransaction model
const EscrowTransaction = mongoose.model(
  "EscrowTransaction",
  EscrowTransactionSchema
);

module.exports = EscrowTransaction;
