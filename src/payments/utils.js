import xrpl_worker from "../data_workers/xrpl";
import { createOffer, priceOracle } from "../swappayments/dex";
const xrpReceived = require("../modals/XrpReceived");
const xrpl = require('xrpl')

async function isValidTransaction(txHash, amount) {
  try {
    const tx = await xrpl_worker.getTxData(txHash);
    console.log(tx)
    const amount_ = tx.result.Amount;
    const receiver = tx.result.Destination;
    const res = await xrpReceived.findOne({ txHash: txHash });
    if (
      typeof amount_ === "object" &&
      !Array.isArray(amount_) &&
      amount_ !== null
    ) {
      const amountXRP = parseFloat(amount_.value) / await priceOracle(amount_);
      console.log(`Diff: ${Math.abs(amountXRP - parseFloat(xrpl.dropsToXrp(amount)))}`)
      if (
        Math.abs(amountXRP - parseFloat(xrpl.dropsToXrp(amount))) < 3 &&
        receiver == process.env.WALLET_ADDRESS &&
        !res
      ) {
        const transactionToAdd = new xrpReceived({
            txHash: txHash,
            amount: amount,
            txRaw: tx
        })
        await transactionToAdd.save()

        const discountXRP =  amountXRP - (amountXRP * 0.03)

        createOffer(xrpl.xrpToDrops(discountXRP.toFixed(2)), amount_)

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
