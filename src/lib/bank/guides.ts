import type { AccountKind } from "./data";

export interface GuideStep {
  title: string;
  text: string;
}

export interface AccountGuide {
  name: string;
  summary: string;
  steps: GuideStep[];
}

/** Walk-through for each type of account: what the page shows and what you can do on it. */
export const ACCOUNT_GUIDES: Record<AccountKind, AccountGuide> = {
  current: {
    name: "Current account",
    summary: "Your everyday account for paying bills, receiving money and spending with your cards.",
    steps: [
      { title: "Your balance", text: "The big number is what this account holds. Each account is shown on its own, with no combined total." },
      { title: "Move money", text: "Tap Move money to send money to another of your accounts. Pick where it comes from, where it goes, and the amount." },
      { title: "Latest activity", text: "The last three payments and transfers in this account. Tap See more for the full list, with search and filters." },
      { title: "Swipe between accounts", text: "Swipe sideways to go to your other accounts. The dots at the bottom show where you are." },
    ],
  },
  savings: {
    name: "Savings account",
    summary: "Keep money apart from your spending. It earns interest.",
    steps: [
      { title: "Your balance and rate", text: "This account earns 2.25% a year. The estimate under the balance shows roughly what it would earn at the current amount." },
      { title: "Move money in or out", text: "Tap Move money to add money from your current account, or to take it back out at any time." },
      { title: "Latest activity", text: "Transfers in and out of savings. Tap See more for the full list." },
      { title: "Demo note", text: "In this demo the interest is an estimate. It is not paid into the account." },
    ],
  },
  currency: {
    name: "Currency account",
    summary: "Hold money in another currency next to your dollars.",
    steps: [
      { title: "Your balance", text: "The balance is kept in US dollars. Under it you see the same amount in this account's currency." },
      { title: "The rate", text: "The demo rate is shown on the page. The converted amount updates with it." },
      { title: "Move money", text: "Tap Move money to add money from your other accounts, or take it back to your main account." },
      { title: "Latest activity", text: "Recent transfers in and out. Tap See more for the full list." },
    ],
  },
  joint: {
    name: "Joint account",
    summary: "A shared account with one other person, with its own IBAN.",
    steps: [
      { title: "Who shares it", text: "The page shows the second holder. Both of you can see the account and use it." },
      { title: "Move money", text: "Tap Move money to put money in from your own accounts, or move it out." },
      { title: "Latest activity", text: "Everything that has happened in the account, with the latest three shown here. Tap See more for the full list." },
      { title: "Swipe between accounts", text: "Swipe sideways to go to your other accounts." },
    ],
  },
  crypto: {
    name: "Crypto wallet",
    summary: "Receive crypto from another wallet and sell what you hold.",
    steps: [
      { title: "Your holdings", text: "Each coin you hold, its quantity and its value at the demo price. The total is the value of your holdings." },
      { title: "Receive", text: "Share your address for a coin to receive crypto from another wallet. It shows in your holdings after a few confirmations." },
      { title: "Sell", text: "Sell only what you hold. You can't sell more than your balance of a coin. The money goes to your main account." },
      { title: "Latest activity", text: "Your sales and deposits. Tap See more for the full list." },
    ],
  },
  invest: {
    name: "Investments",
    summary: "Buy and sell funds, bonds and stocks with the cash in this account.",
    steps: [
      { title: "Cash and holdings", text: "Cash is what you can invest now. The total adds the value of what you already hold." },
      { title: "Buy", text: "Choose an investment and the amount in dollars. The cash in this account pays for it." },
      { title: "Sell", text: "Choose what you hold and how many units to sell. You can't sell more units than you own. The money comes back to this account's cash." },
      { title: "Latest activity", text: "Your buys and sales. Tap See more for the full list." },
    ],
  },
  pockets: {
    name: "Round-up account",
    summary: "Spare change from your payments is saved here automatically.",
    steps: [
      { title: "Your saved round-ups", text: "The balance is the spare change you have saved so far. Round-ups from payments land here." },
      { title: "Switch round-ups on or off", text: "When round-ups are on, the spare change up to the next whole dollar from each payment, request or scheduled payment is saved here." },
      { title: "Move money", text: "Tap Move money to take saved money out to another account, or add money in." },
      { title: "Latest activity", text: "Each round-up, with the account it came from. Tap See more for the full list." },
    ],
  },
};
