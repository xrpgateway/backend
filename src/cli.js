const vorpal = require("vorpal")();
const xrpl = require("xrpl");
const wallet = require("./wallet/index");
import xrpl_worker from "./data_workers/xrpl";
import email from "./email";
import { createOffer, priceOracle } from "./swappayments/dex";
async function createWallet() {
  const client = new xrpl.Client(process.env.XRP_WEBHOOKH_URL);
  await client.connect();
  const fund_result = await client.fundWallet();
  await client.disconnect();
  return fund_result;
}

vorpal.command("createWallet").action(async function (args, callback) {
  try {
    let wallet = await createWallet();
    this.log(wallet);
  } catch (e) {
    console.error(e);
  }
  callback();
});

vorpal.command("testTxQueue").action(async function (args, callback) {
  try {
    wallet.startTransactionQueueResolver();
    wallet.sendTx({ hello1: "world" });
    wallet.sendTx({ hello2: "world" });
    wallet.sendTx({ hello3: "world" });
  } catch (e) {
    console.error(e);
  }
  callback();
});

vorpal
  .command("sendxrp [address] [amount]")
  .action(async function (args, callback) {
    try {
      wallet.startTransactionQueueResolver();
      const address = args.address;
      const amount = args.amount;
      const tx = await wallet.sendXRP(address, amount);
      this.log(`RECEIVED TX---------------: \n `, tx);
    } catch (e) {
      console.error(e);
    }
    callback();
  });

vorpal.command("xrppaymentath").action(async function (args, callback) {
  try {
    const data = await xrpl_worker.getXRPPaymentPaths();
    this.log(data);
  } catch (e) {
    console.error(e);
  }
  callback();
});

vorpal.command("offertest").action(async function (args, callback) {
  try {
    wallet.startTransactionQueueResolver();
    createOffer("3000", "2", {
      currency: "USD",
      issuer: "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
    });
  } catch (e) {
    console.error(e);
  }
  callback();
});

vorpal
  .command("priceoracle [currency] [issuer]")
  .action(async function (args, callback) {
    try {
      const res = await priceOracle({
        currency: args.currency,
        issuer: args.issuer, //"rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
      });
      console.log(res);
    } catch (e) {
      console.error(e);
    }
    callback();
  });

vorpal
  .command("sendemail [destination] [subject] [message]")
  .action(async function (args, callback) {
    try {
      await email.sendEmail({
        to: args.destination,
        subject: args.subject,
        text: args.message
      })
    } catch (e) {
      console.error(e);
    }
    callback();
  });

vorpal.delimiter("xrpg$").show();
