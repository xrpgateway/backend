const QueueEventEmitter = require("queue-event-emitter");
const xrpl = require("xrpl");

const emitter = new QueueEventEmitter();

let wallet;
const client = new xrpl.Client(process.env.XRP_WEBHOOKH_URL);

function createWalletClient() {
  if (!wallet) {
    wallet = xrpl.Wallet.fromSeed(process.env.WALLET_SEED);
  }
}

function sendTx(txData) {
  return new Promise((resolve, reject) => {
    const txReq = {
      callBack: (txRes) => { resolve(txRes) },
      txData
    };
    emitter.emit("txQueue", txReq);
  });
}

function sendXRP(destination, amount) {
  const txData = {
    TransactionType: "Payment",
    Account: wallet.address,
    Amount: amount,
    Destination: destination,
  };
  return sendTx(txData);
}

function startTransactionQueueResolver() {
  createWalletClient();
  emitter.on("txQueue", async (txReq) => {
    const data = txReq.txData
    await client.connect();
    const prepared = await client.autofill(data);
    const max_ledger = prepared.LastLedgerSequence;
    console.log("Prepared transaction instructions:", prepared);
    console.log("Transaction cost:", xrpl.dropsToXrp(prepared.Fee), "XRP");
    console.log("Transaction expires after ledger:", max_ledger);
    const signed = wallet.sign(prepared);
    const tx = await client.submitAndWait(signed.tx_blob);
    console.log(`TxResult: ${JSON.stringify(tx)}`);
    txReq.callBack(tx)
  });
}

module.exports = {
  sendTx,
  sendXRP,
  startTransactionQueueResolver,
  createWalletClient,
};
