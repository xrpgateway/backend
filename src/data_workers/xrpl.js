const xrpl = require("xrpl");
import PubSub from "pubsub-js";


process.env.XRP_WEBHOOKH_URL = "wss://s.altnet.rippletest.net:51233"
const start = async () => {
  try {

    const client = new xrpl.Client(process.env.XRP_WEBHOOKH_URL);
    await client.connect();
    const response = await client.request({
      command: "subscribe",
      streams: ["transactions"],
    });
    client.on("disconnected", () => {
      console.log("Disconnected!");
      start();
    });

    client.on("transaction", (tx) => {
      if (tx.status == "closed") {
        if (tx.transaction.TransactionType == "Payment") {
          const data = JSON.stringify({
            Account: tx.transaction.Account,
            Destination: tx.transaction.Destination,
            currency: tx.transaction.Amount.currency,
            value: tx.transaction.Amount.value || tx.transaction.Amount,
            issuer: tx.transaction.Amount.issuer,
          });
          PubSub.publish("xrpl/payment_node", data);
        } else if (tx.transaction.TransactionType == "NFTokenMint") {
          const data = JSON.stringify({
            Account: tx.transaction.Account,
            NFTokenTaxon: tx.transaction.NFTokenTaxon,
            URI: tx.transaction.URI,
            Issuer: tx.transaction.Issuer,
          });
          PubSub.publish("xrpl/nftmint_node", data);
        }
      }
    });
  } catch (e) {
    start();
    console.error(e);
  }
};


const getTxData = async (txHash) => {
  const client = new xrpl.Client(process.env.XRP_WEBHOOKH_URL);
  await client.connect();
  const response = await client.request({
    "id": 1,
    "command": "tx",
    "transaction": txHash,
    "binary": false
  });
  await client.disconnect();
  return response
}



const getCheckId = async (txHash) => {
  try {
    let data = await getTxData(txHash)
    console.log(data)
    let amount = data["result"]["SendMax"]
    let checkid;
    for (let i=0; i < data["result"]["meta"]["AffectedNodes"].length; i++) {
      console.log(data["result"]["meta"]["AffectedNodes"][i]["CreatedNode"])
      if (data["result"]["meta"]["AffectedNodes"][i]["CreatedNode"]) {
        if (data["result"]["meta"]["AffectedNodes"][i]["CreatedNode"]["LedgerEntryType"] == "Check") {
          checkid = data["result"]["meta"]["AffectedNodes"][i]["CreatedNode"]["LedgerIndex"]
        }
      }
    }
    return { checkid, amount }

  }
  catch (e) {
    console.log(e)
    return false
  }

}


const getXRPPaymentPaths = async () => {
  const client = new xrpl.Client(process.env.XRP_WEBHOOKH_URL);
  await client.connect();
  const response = await client.request({
    "id": 8,
    "command": "path_find",
    "subcommand": "create",
    "source_account": process.env.WALLET_ADDRESS,
    "destination_account": process.env.WALLET_ADDRESS,
    "destination_amount": "-1"
  });
  await client.disconnect();
  return response
}

const getOffers = async (sendCurrency, receiveCurrency) => {
  const client = new xrpl.Client(process.env.XRP_WEBHOOKH_URL);
  await client.connect();
  const response = await client.request({
    "id": 4,
    "command": "book_offers",
    "taker": process.env.WALLET_ADDRESS,
    "taker_gets": receiveCurrency, /*{
      "currency": "XRP"
    }*/
    "taker_pays": sendCurrency, /*{
      "currency": "USD",
      "issuer": "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B"
    },*/
    "limit": 10
  }
  );
  await client.disconnect();
  return response
}


const xrpl_worker = {
  start,
  getTxData,
  getXRPPaymentPaths,
  getOffers,
  getCheckId
};

export default xrpl_worker;
