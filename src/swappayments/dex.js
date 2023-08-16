import { sendTx } from "../wallet";
import xrpl_worker from "../data_workers/xrpl";
const xrpl = require("xrpl");

const CurrencyData = {
  USD: {
    currency: "USD",
    issuer: "rg2MAgwqwmV9TgMexVBpRDK89vMyJkpbC",
  },
  EUR: {
    currency: "EUR",
    issuer: "rg2MAgwqwmV9TgMexVBpRDK89vMyJkpbC",
  },
  BTC: {
    currency: "BTC",
    issuer: "rg2MAgwqwmV9TgMexVBpRDK89vMyJkpbC",
  },
  JPY: {
    currency: "JPY",
    issuer: "rg2MAgwqwmV9TgMexVBpRDK89vMyJkpbC",
  },
  GBP: {
    currency: "GBP",
    issuer: "rg2MAgwqwmV9TgMexVBpRDK89vMyJkpbC",
  },
  CHF: {
    currency: "CHF",
    issuer: "rg2MAgwqwmV9TgMexVBpRDK89vMyJkpbC",
  },
  SGD: {
    currency: "SGD",
    issuer: "rg2MAgwqwmV9TgMexVBpRDK89vMyJkpbC",
  },
  NGN: {
    currency: "NGN",
    issuer: "rg2MAgwqwmV9TgMexVBpRDK89vMyJkpbC",
  },
};

function createOffer(receiveXrp, currencyObj) {
  sendTx({
    TransactionType: "OfferCreate",
    Account: process.env.WALLET_ADDRESS,
    TakerGets: currencyObj,
    TakerPays: receiveXrp
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
  const meanTakerGets = parseFloat(xrpl.dropsToXrp((takerGetsAmounts.reduce((sum, value) => sum + value, 0) / takerGetsAmounts.length).toFixed(0)));
  return meanTakerPays/meanTakerGets
}

async function priceOracle(currency) {
  const offersreq = await xrpl_worker.getOffers(currency, {
    currency: "XRP",
  });
  return getTokenPerXRP(offersreq.result.offers);
}

export { createOffer, priceOracle, CurrencyData };
