const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Merchant = require("../modals/metchantmodel");
const Transaction = require("../modals/transactionmodel");
const xrpl = require("xrpl");
const { getTxData } = require("../data_workers/xrpl");
const { isValidTransaction } = require("../payments/utils");
const fetch = require('node-fetch');

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
        .status(404)
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

    let success = false;
    switch (transactiontype) {
      case 0:
        success = check1(transactionHashes);
      case 1:
        success = await check2(transactionHashes);
      /*case 2:
        // need to handle using seprate endpoint
        success = check3(transactionHashes)*/
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
            method: 'POST',
            headers: {
                'Content-Type':'application/json'
            },
            body: JSON.stringify({
                data,
                transactionid,
                extradata,
                userTransactionHash: transactionHashes
            })
        })
    }
    res
      .status(200)
      .json({
        success: true,
        message: "Transaction submitted and validated successfully.",
      });
  } catch (error) {
    console.error("Error processing transaction:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

function check1(hashes, amount) {
  for (let i = 0; i < hashes.length; i++) {
    let data = getTxData(data);
  }
  return true;
}

async function check2(hashes, amount) {
  const txHash = hashes[0];
  if (await isValidTransaction(txHash, amount)) {
    return true
  }
  return false;
}

function check3(hashes) {
  return true;
}

router.get("/signtest", async (req, res) => {
  let data = createTransactionData(
    "322f07bf-6a92-4541-abb4-5b0f8f157774",
    "10",
    "abc",
    "john"
  );
  console.log(data);
  let merchantId = "322f07bf-6a92-4541-abb4-5b0f8f157774";
  const merchant = await Merchant.findOne({ merchantId });

  let signedhash = signTransaction(merchant.merchantSecretKey, data);
  console.log(signedhash);
  res.status(200).json({ signedhash });
});

router.post("/verificationtest", async (req, res) => {
  let data = createTransactionData(
    "322f07bf-6a92-4541-abb4-5b0f8f157774",
    "10",
    "abc",
    "john"
  );
  console.log(data);
  let sign = req.body.sign;
  let merchantId = "322f07bf-6a92-4541-abb4-5b0f8f157774";
  const merchant = await Merchant.findOne({ merchantId });

  const verifier = verifyTransaction(merchant.merchantKey, data, sign);
  console.log(verifier);

  res.status(200).json(verifier);
});
const createTransactionData = (merchantId, amount, nonce, data) => {
  try {
    const transactionData = `${merchantId}-${amount}-${nonce}-${JSON.stringify(
      data
    )}`;
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

const cashChecks = async (checkid) => {
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
};
//createChecks(100,"fdf")
//cashChecks("E89A3641CC473AAC8FFCFC915C09BAAB5FDFC28F1C15F90E7CF784DC24FC1A97")
module.exports = { router };
