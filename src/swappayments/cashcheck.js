import { sendTx } from "../wallet"
import xrpl_worker from '../data_workers/xrpl'
async function cashCheck(txHash){
    let data = await xrpl_worker.getCheckId(txHash)
    sendTx({
        "TransactionType": "CheckCash",
        "Account": process.env.WALLET_ADDRESS,
        "Amount": data.amount,

        "CheckID":data.checkid,
        "Fee": "12"
    })
 
}

export {
    cashCheck
}