const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Merchant = require("../modals/metchantmodel");
const Transaction = require("../modals/transactionmodel");
const EscrowTransaction = require("../modals/escrowtxmodal");
const { cashChecks } = require("../swappayments/cashcheck");
const { isValidTransaction } = require("../payments/utils");
const fetch = require("node-fetch");
import email from "../email";

// Express Routes
router.post("/api/split-payment/initiate", async (req, res) => {
  const { txHash, secret, emails, amount } = req.body;

  try {
    const splitPaymentID = crypto.randomUUID().toString();
    // Create a new transaction
    const transaction = new EscrowTransaction({
      spid: splitPaymentID,
      amount,
      participants: [
        {
          email: emails[0],
          escrowId,
          secret,
        },
      ],
    });

    for (const email_ of emails.slice(1)) {
      email.sendEmail({
        to: email_,
        subject: "Payment Link for Split Payment",
        html: `<!DOCTYPE html><html><body><h1>Your split payment link!</h1><br><a href="/?id=${splitPaymentID}">Pay Now</a></body></html>`
      });
    }

    await transaction.save();

    res
      .status(200)
      .json({
        success: true,
        message: "Split payment initiated successfully.",
      });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({
        success: false,
        error: "An error occurred while initiating the split payment.",
      });
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
      return res.status(404).json({ success: false, error: "Merchant not found." });
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
        success = await check1(transactionHashes);
      case 1:
        success = await check2(transactionHashes, amount);
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
    res.status(500).json({ error: "Internal server error." });
  }
});

async function check1(hashes) {
  try {
    let data = await cashChecks(hashes[0]);
    if (data == false) {
      return false;
    }
    if (data["result"]["meta"]["TransactionResult"] != "tesSUCCESS") {
      return false;
    }

    return true
  } catch {
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

module.exports = { router };
