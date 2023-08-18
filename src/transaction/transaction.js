const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Merchant = require("../modals/metchantmodel");
const Transaction = require("../modals/transactionmodel");
const EscrowTransaction = require("../modals/escrowtxmodal");
const { cashCheck } = require("../swappayments/cashcheck");
const { isValidTransaction } = require("../payments/utils");
const fetch = require("node-fetch");
import { dropsToXrp } from "xrpl";
import xrpl_worker from "../data_workers/xrpl";
import email from "../email";
import { CurrencyData, priceOracle } from "../swappayments/dex";
import escrow from "../swappayments/escrow";
import { sendTx } from "../wallet";
const jwt = require('jsonwebtoken');
const xrpl = require('xrpl')

function toFixed2(num) {
  const ratestr = num.toString();
  let i = 0;
  let isDot = false;
  for (let x of ratestr) {
    if (!isDot) {
      if (x == ".") {
        isDot = true;
      }
    } else {
      if (x == "0") {
        i += 1;
      } else {
        break;
      }
    }
  }
  return parseFloat(num).toFixed(i + 2);
}

const jwtMiddleware = (req, res, next) => {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).send('No token, authorization denied.');
  }

  try {
    const decoded = jwt.verify(token, 'yourSecretKey');
    req.merchantId = decoded.merchantId;
    next();
  } catch (error) {
    console.log("ok" + error)
    res.status(401).send('Token is not valid.');
  }
};


router.post("/gettransaction", jwtMiddleware, async (req, res) => {
  let merchantId = req.body.merchantId
  let transactions = await Transaction.find({ merchantId: merchantId })
  console.log(transactions)
  return res.json(transactions)

})

router.get("/rate/:currency/:xrp", async (req, res) => {
  const currency = req.params.currency;
  const xrpval = req.params.xrp;
  if (currency == "XRP") {
    return res.json({ rate: 1, val: parseFloat(toFixed2(dropsToXrp(xrpval))) });
  } else if (currency) {
    if (CurrencyData[currency]) {
      const rate = await priceOracle(CurrencyData[currency]);
      return res.json({ rate: parseFloat(toFixed2(rate)), val: parseFloat(toFixed2(parseFloat(dropsToXrp(xrpval)) * rate)) });
    }
    return res.json({ rate: -1, val: 0 });
  }
  res.json({ rate: 1, val: 0 });
});



router.post("/escrow_submit", async (req, res) => {
  try {
    const { splitPaymentID, txHash, secret, email } = req.body;
    const escrw = await EscrowTransaction.findOne({ spid: splitPaymentID });
    if (!escrw) {
      return res
        .status(404)
        .json({ success: false, message: "Splitpayment not found!" });
    }
    let amount_ = (parseInt(escrw.amount) / escrw.participants.length).toFixed(
      0
    );
    if (!escrow.isValidEscrow(txHash, amount_)) {
      return res
        .status(403)
        .json({ success: false, message: "Not valid escrow!" });
    }
    let index = -1;
    let upq = {};
    let k = 0;
    for (let user of escrw.participants) {
      if (user.email == email) {
        index = k;
        break;
      }
      k += 1;
    }
    if (index == -1) {
      return res.status(404).json({
        success: false,
        message: "Given user not found!",
      });
    }
    upq[`participants.${index}.secret`] = secret;
    upq[`participants.${index}.txHash`] = txHash;
    await EscrowTransaction.updateOne(
      { spid: splitPaymentID },
      {
        $set: upq,
      }
    );
    handleFinzlaiseEscrow(splitPaymentID);
    res.json({ success: true, message: "Your split confirmed!" });
  } catch (e) {
    console.error("Error /escrow_submit:", error);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// Endpoint to submit and validate a transaction
router.post("/submitted", async (req, res) => {
  try {
    const {
      merchantId,
      amount,
      nonce,
      signedHash,
      data,
      transactionHashes,
      transactiontype,
      users,
      extradata,
    } = req.body;

    const transactionid = crypto.randomUUID().toString();
    // Fetch the merchant's public key
    const merchant = await Merchant.findOne({ merchantId });
    if (!merchant) {
      return res
        .status(400)
        .json({ success: false, error: "Merchant not found." });
    }

    // Verify the signed hash
    let messagecheck = createTransactionData(merchantId, amount, nonce, data);
    const isValidSignature = verifyTransaction(
      merchant.merchantKey,
      messagecheck,
      signedHash
    );

    if (!isValidSignature) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid signature." });
    }
    console.log(transactiontype)
    let success = false;
    switch (transactiontype) {
      case 0:
        success = await check1(transactionHashes);
        break
      case 1:
        success = await check2(transactionHashes, amount);
        break
      case 2:
        success = await check3(
          transactionHashes,
          amount,
          users,
          merchantId,
          data,
          extradata
        );
        if (success) {
          return res.status(200).json({
            success: true,
            message: "Split payment initiated!",
          });
        }
        break
    }

    if (!success) {
      return res
        .status(403)
        .json({ success: false, error: "Not able to verify buddy" });
    }

    const transac = new Transaction({
      paymentType: transactiontype,
      amount: amount,
      transactionid,
      merchantId,
      merchantSignedHash: signedHash,
      stage: "completed",
      payout: "pending",
      userTransactionHash: transactionHashes,
      users: users,
      data: data,
      extradata,
    });
    await transac.save();

    if (merchant.webhookUrl) {
      fetch(merchant.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data,
          transactionid,
          extradata,
          userTransactionHash: transactionHashes,
        }),
      });
    }
    res.status(200).json({
      success: true,
      message: "Transaction submitted and validated successfully.",
    });
  } catch (error) {
    console.error("Error processing transaction:", error);
    res.status(500).json({ success: false, error: "Internal server error." });
  }
});

async function check1(hashes) {
  try {
    console.log(data)
    let data = await cashCheck(hashes[0]);

    if (data == false) {
      return false
    }
    if (data["result"]["meta"]["TransactionResult"] != "tesSUCCESS") {
      return false


    }
    return true
  } catch (e) {
    console.log(e)
    return false;
  }
}


async function check2(hashes, amount) {
  const txHash = hashes[0];
  if (await isValidTransaction(txHash, amount)) {
    return true;
  }
  return false;
}

async function check3(hashes, amount, users, merchantId, data, extradata) {
  const txHash = hashes[0];
  try {
    let amount_ = (parseInt(amount) / users.length).toFixed(0);
    if (!escrow.isValidEscrow(txHash, amount_)) {
      return false;
    }
    const splitPaymentID = crypto.randomUUID().toString();
    // Create a new transaction
    const transaction = new EscrowTransaction({
      spid: splitPaymentID,
      amount,
      participants: users,
      merchantId,
      data,
      extradata,
    });

    for (const user of users.slice(1)) {
      email.sendEmail({
        to: user.email,
        subject: "Payment Link for Split Payment",
        html: `<!DOCTYPE html><html><body><h1>Your split payment link!</h1><br><h2>Amount ${xrpl.dropsToXrp(amount_)} XRP</h2><br><a href="${process.env.WEBPAGE}/split_external?id=${splitPaymentID}&&email=${user.email}&&amount=${amount_}">Pay Now</a></body></html>`,
      });
    }

    await transaction.save();

    return true;
  } catch (error) {
    console.error(error);
  }
  return false;
}




const handleFinzlaiseEscrow = async (splitPaymentID) => {
  try {
    const escrw = await EscrowTransaction.findOne({ spid: splitPaymentID });
    const transactionHashes = [];
    for (let user of escrw.participants) {
      if (user.txHash == "" || user.secret == "") {
        return;
      }
      transactionHashes.push(user.txHash);
    }
    for (let user of escrw.participants) {
      const tx = (await xrpl_worker.getTxData(user.txHash)).result;
      const condition = tx.Condition;
      const sequance = tx.Sequence;
      const account = tx.Account;
      const res = await sendTx({
        Account: process.env.WALLET_ADDRESS,
        TransactionType: "EscrowFinish",
        Owner: account,
        OfferSequence: sequance,
        Condition: condition,
        Fulfillment: user.secret,
      });
      if (res["result"]["meta"]["TransactionResult"] != "tesSUCCESS") {
        return;
      }
    }

    for (const user of escrw.participants) {
      email.sendEmail({
        to: user.email,
        subject: "Transaction Successful",
        html: `<!DOCTYPE html><html><body><h1>Your split transaction of total amount ${xrpl.dropsToXrp(escrw.amount)} XRP is successful and we also notfied the merchent for the same. Thank You!</h1></body></html>`,
      });
    }

    const transactionid = crypto.randomUUID().toString();
    // Fetch the merchant's public key
    const merchant = await Merchant.findOne({ merchantId: escrw.merchantId });
    const transac = new Transaction({
      paymentType: 2,
      amount: escrw.amount,
      transactionid,
      merchantId: escrw.merchantId,
      merchantSignedHash: "---verified---",
      stage: "completed",
      payout: "pending",
      userTransactionHash: transactionHashes,
      users: escrw.participants,
      data: escrw.data,
      extradata: escrw.extradata,
    });
    await transac.save();

    if (merchant.webhookUrl) {
      fetch(merchant.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data,
          transactionid,
          extradata,
          userTransactionHash: transactionHashes,
        }),
      });
    }
  } catch (e) {
    console.error(e);
  }
};

router.post("/signtest", async (req, res) => {
  const {

    amount,
    nonce,
    data
  } = req.body
  let merchantId = req.body.merchentId
  console.log(merchant)
  let payload = createTransactionData(merchantId, amount, nonce, data)
  console.log(data);
  const merchant = await Merchant.findOne({ merchantId });
  console.log(merchant)
  let signedhash = signTransaction(merchant.merchantSecretKey, payload);
  console.log(signedhash);
  res.status(200).json({ signedhash });
});

router.post("/verificationtest", async (req, res) => {
  const {

    amount,
    nonce,
    data
  } = req.body
  let merchantId = req.body.merchentId
  let sign = req.body.sign;
  const merchant = await Merchant.findOne({ merchantId });
  let payload = createTransactionData(merchantId, amount, nonce, data)

  const verifier = verifyTransaction(merchant.merchantKey, payload, sign);
  console.log(verifier);

  res.status(200).json(verifier);
});
const createTransactionData = (merchantId, amount, nonce, data) => {
  try {
    const transactionData = `${merchantId}-${amount}-${nonce}-${data}`;
    return transactionData;
  } catch (error) {
    console.error("Error creating transaction data:", error);
    throw new Error("Error creating transaction data.");
  }
};

const signTransaction = (privateKey, transactionData) => {
  try {
    const sign = crypto.createSign("RSA-SHA256");
    sign.update(transactionData);

    const signature = sign.sign(privateKey, "hex");

    return signature;
  } catch (error) {
    console.error("Error signing transaction:", error);
    throw new Error("Error signing transaction.");
  }
};

const verifyTransaction = (publicKey, transactionData, signed) => {
  try {
    const sign = crypto.createVerify("RSA-SHA256");
    sign.update(transactionData);

    const isValidSignature = sign.verify(publicKey, signed, "hex");

    return isValidSignature;
  } catch (error) {
    console.error("Error signing transaction:", error);
    throw new Error("Error signing transaction.");
  }
};

const createChecks = async (amount, destination) => {
  // Can sign offline if the txJSON has all required fields
  const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");

  await client.connect();

  console.log("Connected");

  const sender = "rQpovM9Xe7vYSz5HNfbEJKAeFeVEpV9cTq";
  const receiver = "r9tFDAbb6xExyMp6TDDqGQfTq8vzCqGGXo";
  const seed = "sEd7qjs65MSHRaaaXGpCvsiJsHwG6JJ";
  const wallet = xrpl.Wallet.fromSeed(seed);
  const tx_json = await client.autofill({
    TransactionType: "CheckCreate",
    Account: sender,
    Destination: "r9tFDAbb6xExyMp6TDDqGQfTq8vzCqGGXo",
    SendMax: "100",

    Expiration: 810113521,
    DestinationTag: 1,
    Fee: "12",
  });
  const signed = wallet.sign(tx_json);
  console.log(signed);
  const submit_result = await client.submitAndWait(signed.tx_blob);
  console.log(submit_result);
};
//E89A3641CC473AAC8FFCFC915C09BAAB5FDFC28F1C15F90E7CF784DC24FC1A97

/**const cashChecks = async (checkid) => {
    const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
 
    await client.connect();
 
    console.log("Connected");
 
    const sender = "r9tFDAbb6xExyMp6TDDqGQfTq8vzCqGGXo";
    const receiver = "r9tFDAbb6xExyMp6TDDqGQfTq8vzCqGGXo";
    const seed = "sEdToLE7Mf9oTJBc7sDQKzVPrHaM6dH";
    const wallet = xrpl.Wallet.fromSeed(seed);
    const tx_json = await client.autofill({
        TransactionType: "CheckCash",
        Account: sender,
        Amount: "100",
 
        CheckID: "E89A3641CC473AAC8FFCFC915C09BAAB5FDFC28F1C15F90E7CF784DC24FC1A97",
        Fee: "12",
    });
    const signed = wallet.sign(tx_json);
    console.log(signed);
    const submit_result = await client.submitAndWait(signed.tx_blob);
    console.log(submit_result);
};**/
//createChecks(100,"fdf")
//cashChecks("E89A3641CC473AAC8FFCFC915C09BAAB5FDFC28F1C15F90E7CF784DC24FC1A97")
module.exports = { router };
