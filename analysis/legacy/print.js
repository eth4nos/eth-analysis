const {insertOne, findOne, findLastOne, findMany, countDocuments}  = require('./mongoAPIs');

(async () => {
    try {
        // let blocks = await findMany('blocks');
        // console.log(blocks);

        // let blocks = await findLastOne('blocks', {number: -1});
        // console.log(blocks);

        // let states = await findMany('states');
        // console.log(states);

        // let transactions = await findLastOne('accounts_legacy', {_id: -1});
        // console.log(transactions);

        // let transactions = await findMany('transactions', {blockNum: 4736769});
        // console.log(transactions);

        // let lastBlock = await findLastOne('blocks', {number: -1});
        // console.log(lastBlock);

        // let block = await findOne('blocks', {number: 1000000});
        // console.log(block);

        // let accounts = await findMany('accounts');
        // console.log(accounts);

        // let account = await findOne('accounts', {address: '0x487adf7d70a6740f8d51cbdd68bb3f91c4a5ce68'});
        // console.log(account);

        // let activeAccounts = await findMany('activeAccounts');
        // console.log(activeAccounts);

        // let lastActiveAccounts = await findLastOne('accounts', { number: -1 });
        // console.log(lastActiveAccounts);

        // let activeAccounts = await findOne('countAccounts', {number: 5});
        // console.log(activeAccounts);

        // let activeAccountCount = await countDocuments('transactions');
        // console.log(activeAccountCount)

        // for (let i = 0; i < 20; i++) {
        //     console.log(await findOne('activeAccounts', {number: i * 100000}));
        // }

        // let lastAccounts = await findLastOne('countAccounts', { number: -1 });
        // console.log(lastAccounts);

        // let account = await findLastOne('transactions_test', { blockNum: -1 });
        // console.log(account);

        let accounts = await findMany('transactions_test', {blockNum: 8000000});
        console.log(accounts);

        // let accounts = await findMany('accounts');
        // console.log(accounts);

        // let transaction = await findLastOne('transactions', { txhash: -1 });
        // console.log(transaction);

        // let block = await findLastOne('blocks', { number: -1 });
        // console.log(block);

        // let account = await findOne('accounts', { address: '0x7c371B2ee198dE1Bf2e405b8b0e8577f682Ed50D'});
        // console.log(account);

        // let transactions = await findMany('transactions');
        // console.log(transactions);

    } catch (err) {
        return console.error(err);
    }
})();
