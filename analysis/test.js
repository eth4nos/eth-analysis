const mongo  = require('./mongoAPIs');
const ProgressBar = require('./progress');

// (async function() {
//     var res = await findOne('transactions');
//     console.log(res);
// })();

// (async function() {
//     await remove('blocks', {number: 1});
// })();

// (async function() {
//     let genesis = require('./config/genesis.json');
//     let res = await insertOne('blocks', {
//         number: 1,
//         miner: '0x05a56e2d52c817161883f50c441c3228cfe54d9f',
//         from: Object.keys(genesis.alloc),
//         to: []
//     });
//     console.log(res);
// })();

// (async function() {
//     await dropIndex('accounts', "address_text");
// })();

// (async function() {
//     await dropIndices('transactions');
//     await renameCollection('countAccounts', 'countAccounts_legacy');
//     await renameCollection('accounts', 'accounts_legacy');
//     await renameCollection('activeAccounts', 'activeAccounts_legacy');
//     await renameCollection('transactions', 'transactions_legacy');
// })();

(async function() {
    // await mongo.drop('accounts');
    // await mongo.drop('transactions');
    // await getIndices('accounts');
    // await mongo.setIndex('transactions_legacy', { 'blockNum': 1, 'transactionIndex': 1});
    await mongo.drop('accounts');
    //await mongo.drop('transactions_test');
})();


// var limit = [100, 100, 100];
// var progressBar = new ProgressBar();
// progressBar.addBars(limit);

// var i = 0;
// setInterval(() => {
//     progressBar.forward(0, i);
//     progressBar.forward(1, i * 2);
//     progressBar.forward(2, i * 3);
//     i++;
// }, 1000);
