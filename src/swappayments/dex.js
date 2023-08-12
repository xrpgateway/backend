import { sendTx } from "../wallet"

function createOffer(receiveXrp, sendamount, currencyObj){
    currencyObj["value"] = sendamount
    sendTx({
        "TransactionType": "OfferCreate",
        "Account": process.env.WALLET_ADDRESS,
        "Flags": 0,
        "Sequence": 8,
        "TakerGets": receiveXrp,
        "TakerPays": currencyObj, /*{
          "currency": "GKO",
          "issuer": "ruazs5h1qEsqpke88pcqnaseXdm6od2xc",
          "value": "2"
        }*/
    })
}

export {
    createOffer
}