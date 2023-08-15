import xrpl_worker from "../data_workers/xrpl"
const xrpReceived = require("../modals/XrpReceived");

const isValidEscrow = async (txHash, amount) => {
    try{
        const tx = await xrpl_worker.getTxData(txHash)
        const result = tx.result
        if(result.TransactionType == "EscrowCreate" && amount == result.Amount && result.Destination == process.env.WALLET_ADDRESS){
            const res = await xrpReceived.findOne({ txHash: txHash });
            if(!res){
                const transactionToAdd = new xrpReceived({
                    txHash: txHash,
                    amount: amount,
                    txRaw: tx
                })
                await transactionToAdd.save()
                return true
            }
        }
    }catch(e){
        console.error(`isValidEscrow:`, e)
    }
    return false
}

export default {
    isValidEscrow
}