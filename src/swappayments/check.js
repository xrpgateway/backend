import { sendTx } from "../wallet"

function createCheck(sendamount, toaddress){
   
    sendTx({
        "TransactionType": "CheckCreate",
        "Account": process.env.WALLET_ADDRESS,
        "Destination": toaddress,
        "SendMax": sendamount,

        "Expiration": 810113521,
        "DestinationTag": 1,
        "Fee": "12", /*{
          "currency": "GKO",
          "issuer": "ruazs5h1qEsqpke88pcqnaseXdm6od2xc",
          "value": "2"
        }*/
    })
}

export {
    createCheck
}