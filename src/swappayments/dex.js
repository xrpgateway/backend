import { sendTx } from "../wallet";
import xrpl_worker from "../data_workers/xrpl";
const xrpl = require("xrpl");

const CurrencyData = {
  USD: {
    currency: "USD",
    issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
  },
  GKO: {
    currency: "GKO",
    issuer: "ruazs5h1qEsqpke88pcqnaseXdm6od2xc",
  },
};

function createOffer(receiveXrp, sendamount, currencyObj) {
  currencyObj["value"] = sendamount;
  sendTx({
    TransactionType: "OfferCreate",
    Account: process.env.WALLET_ADDRESS,
    TakerGets: receiveXrp,
    TakerPays: currencyObj /*{
          "currency": "GKO",
          "issuer": "ruazs5h1qEsqpke88pcqnaseXdm6od2xc",
          "value": "2"
        }*/,
  });
}

function getTokenPerXRP(offers) {
  const takerPaysAmounts = offers.map((offer) =>
    parseFloat(offer.TakerPays.value)
  );
  const takerGetsAmounts = offers.map((offer) => parseFloat(offer.TakerGets));

  // Calculate mean and standard deviation of TakerPays values (USD amounts)
  const meanTakerPays =
    takerPaysAmounts.reduce((sum, value) => sum + value, 0) /
    takerPaysAmounts.length;
  const stdTakerPays = Math.sqrt(
    takerPaysAmounts.reduce(
      (sum, value) => sum + Math.pow(value - meanTakerPays, 2),
      0
    ) / takerPaysAmounts.length
  );

  // Calculate Z-scores
  const zScores = takerPaysAmounts.map(
    (value) => (value - meanTakerPays) / stdTakerPays
  );

  // Set a Z-score threshold for outliers
  const zScoreThreshold = 3.0;

  // Filter outliers based on Z-scores
  const filteredOffers = offers.filter(
    (offer, i) => Math.abs(zScores[i]) <= zScoreThreshold
  );

  // Calculate weighted average XRP/USD ratio
  const totalWeightedRatio = filteredOffers.reduce(
    (sum, offer) =>
      sum + parseFloat(offer.TakerGets) / parseFloat(offer.TakerPays.value),
    0
  );
  const weightedAvgRatio = totalWeightedRatio / filteredOffers.length;
  return (1 / xrpl.dropsToXrp(weightedAvgRatio.toFixed(0))).toFixed(2);
}

async function priceOracle(currency) {
  const offersreq = await xrpl_worker.getOffers(currency, {
    currency: "XRP",
  });
  return getTokenPerXRP(offersreq.result.offers);
}

export { createOffer, priceOracle, CurrencyData };
