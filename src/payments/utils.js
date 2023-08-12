import xrpl_worker from "../data_workers/xrpl";
const xrpReceived = require('../modals/XrpReceived')

async function isValidXrpTransfer(txHash, sender, amount){
    try{
        const tx = await xrpl_worker.getTxData(txHash)
        const sender_ = tx.result.Account
        const amount_ = tx.result.Amount
        const receiver = tx.result.Destination
        if(sender == sender_ && amount == amount_ && receiver == process.env.WALLET_ADDRESS){
            const res = await xrpReceived.findOne({ txHash: txHash })
            if(!res){
                return true
            }
        }
    } catch(e) {
        console.error(e)
    }
    return false
}

export {
    isValidXrpTransfer
}