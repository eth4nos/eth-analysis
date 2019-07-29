const {insertOne, findOne, findLastOne, findMany}  = require('./mongoAPIs');

(async () => {
    try {
        // let blocks = await findMany('blocks');
        // console.log(blocks);

        // let states = await findMany('states');
        // console.log(states);

        // let transactions = await findMany('transactions');
        // console.log(transactions);

        // let lastBlock = await findLastOne('blocks', {number: -1});
        // console.log(lastBlock);

        // let block = await findOne('blocks', {number: 1});
        // console.log(block);

        // let accounts = await findMany('accounts');
        // console.log(accounts);

        // let activeAccounts = await findMany('activeAccounts');
        // console.log(activeAccounts);

        // let lastActiveAccounts = await findLastOne('activeAccounts', {number: -1});
        // console.log(lastActiveAccounts);

        let activeAccounts = await findOne('activeAccounts', {number: 172799});
        console.log(activeAccounts);
        activeAccounts = await findOne('activeAccounts', {number: 172800});
        console.log(activeAccounts);
        activeAccounts = await findOne('activeAccounts', {number: 172801});
        console.log(activeAccounts);

        // let lastAccounts = await findLastOne('accounts', {distance: -1});
        // console.log(lastAccounts);

    } catch (err) {
        return console.error(err);
    }
})();
