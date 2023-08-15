import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import xrpl_worker from "./data_workers/xrpl";
import cors from "cors";
import mongoose from "mongoose";
import wallet from "./wallet";
const { router: merchantRouter} = require('./merchant/merchant');
const {router: transactionRouter} = require('./transaction/transaction')
mongoose.connect(process.env.MONGO_URL).then(() => console.log("Connected!"));

if (process.argv[2] == "cli") {

  require("./cli");

} else {

  const bodyParser = require("body-parser");
  const app = express();
  require("express-ws")(app);
  app.use(cors());
  app.use(bodyParser.json());
  app.use('/merchant', merchantRouter);
  app.use('/transaction', transactionRouter)

  const port = process.env.PORT || 4001;

  app.get("/", (req, res) => {
    res.send("OK!");
  });

  app.listen(port, () => {
    console.log(`Api listening on port ${port}`);
    xrpl_worker.start();
    wallet.startTransactionQueueResolver()
  });

}
