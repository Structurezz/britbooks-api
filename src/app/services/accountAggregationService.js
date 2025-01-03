import LinkedAccount from '../models/LinkedAccount.js';

class AccountAggregationService {
  static async linkAccount({ userId, accountName, accountType, accountProvider, balance, accountDetails }) {
    const newAccount = new LinkedAccount({ userId, accountName, accountType, accountProvider, balance, accountDetails });
    return await newAccount.save();
  }

  static async getAccounts(userId) {
    return await LinkedAccount.find({ userId });
  }

  static async getAccountDetails(accountId) {
    const account = await LinkedAccount.findById(accountId);
    if (!account) {
        throw new Error('Account not found');
    }
    return account;
}

  static async unlinkAccount(accountId) {
    const result = await LinkedAccount.findByIdAndDelete(accountId);
    if (!result) throw new Error('Account not found.');
    return { message: 'Account successfully unlinked.' };
  }

  static async aggregateAccounts(userId) {
    const accounts = await LinkedAccount.find({ userId });
    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
    return { totalBalance, accounts };
  }
}

export default AccountAggregationService;
