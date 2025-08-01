import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createAccount(email) {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'US',
    email,
    capabilities: { transfers: { requested: true } },
  });
  return account.id;
}

async function attachBankAccount(accountId, routingNumber, accountNumber, accountHolderName) {
  const bankToken = await stripe.tokens.create({
    bank_account: {
      country: 'US',
      currency: 'usd',
      routing_number: routingNumber,
      account_number: accountNumber,
      account_holder_name: accountHolderName,
      account_holder_type: 'individual',
    },
  });

  const externalAccount = await stripe.accounts.createExternalAccount(accountId, {
    external_account: bankToken.id,
  });

  return externalAccount;
}

export { createAccount, attachBankAccount };
export default stripe;
