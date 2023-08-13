const mongoose = require('mongoose');

const XrpReceived = new mongoose.Schema({
    txHash: String,
    amount: String,
    txRaw: Object
});

const xrpReceived = mongoose.model('XrpReceived', XrpReceived);

module.exports = xrpReceived;