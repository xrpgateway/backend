import xrpl_worker from "../data_workers/xrpl";
import { createOffer, priceOracle } from "../swappayments/dex";
const xrpReceived = require("../modals/XrpReceived");

async function isValidTransaction(txHash, amount) {
  try {
    const tx = await xrpl_worker.getTxData(txHash);
    const amount_ = tx.result.Amount;
    const receiver = tx.result.Destination;
    const res = await xrpReceived.findOne({ txHash: txHash });
    if (
      typeof amount_ === "object" &&
      !Array.isArray(amount_) &&
      amount_ !== null
    ) {
      const amountXRP = priceOracle(amount_) * parseFloat(amount_.value);
      if (
        Math.abs(amountXRP - amount) < 3 &&
        receiver == process.env.WALLET_ADDRESS &&
        !res
      ) {
        const transactionToAdd = new xrpReceived({
            txHash: txHash,
            amount: amount,
            txRaw: tx
        })
        await transactionToAdd.save()
        createOffer(amount, amount_.value, amount_)
        return true;
      }
    } else {
      if (
        amount == amount_ &&
        receiver == process.env.WALLET_ADDRESS &&
        !res
      ) {
        const transactionToAdd = new xrpReceived({
            txHash: txHash,
            amount: amount,
            txRaw: tx
        })
        await transactionToAdd.save()
        return true;
      }
    }
  } catch (e) {
    console.error(e);
  }
  return false;
}

export { isValidTransaction };
