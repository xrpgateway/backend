import { sendTx } from "../wallet"
import xrpl_worker from '../data_workers/xrpl'
async function cashCheck(txHash){
    try{
    let data = await xrpl_worker.getCheckId(txHash)
    let res = await sendTx({
        "TransactionType": "CheckCash",
        "Account": process.env.WALLET_ADDRESS,
        "Amount": data.amount,
        "CheckID":data.checkid
    })
    return res
}catch(e){
    console.log(e)
    return false
}
 
}

export {
    cashCheck
}