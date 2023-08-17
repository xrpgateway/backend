import Merchant from "../modals/metchantmodel";
import { sendXRP } from "../wallet";

const Transaction = require("../modals/transactionmodel");
const xrpl = require("xrpl");

async function Start() {
    const client = new xrpl.Client(process.env.XRP_WEBHOOKH_URL);
    
    while(true){
        try{
            await client.connect();
            const balance = await client.getXrpBalance(process.env.WALLET_ADDRESS)
            const res = await Transaction.findOne({ amount: { $lte: xrpl.xrpToDrops(balance) }, payout: "pending", stage: "completed" })
            console.log(res)
            if(res){
                const merchent = await Merchant.findOne({ merchantId: res.merchantId })
                const tx = await sendXRP(merchent.xrpaddr, res.amount.toFixed(0))
                if(tx.result["meta"]["TransactionResult"] == "tesSUCCESS"){
                    await Transaction.updateOne({ transactionid: res.transactionid }, { $set: { payout: "completed" } })
                }
            }else{
                await new Promise((resolve, reject)=>{
                    setTimeout(()=>{ resolve() }, 3500)
                })
            }
        }catch(e){
            console.error("Settlement worker => ", e)
        }
    }
}

export default {
    Start
}