const {setIndex, findOne, findMany, insertOne, update}  = require('./mongoAPIs');
const fs = require('fs');
const ACCOUNTS = 'active_accounts_15';
var genesis = require('./genesis.json');

(async () => {
    let alloc = {};
    let accounts = await findMany(ACCOUNTS, {genesis: true});
    console.log(accounts);
    for (account of accounts) {
        alloc[account['address']] = { "balance": "1000000000000000000000" }
    }
    genesis['alloc'] = alloc;
    fs.writeFile('./genesis_7150000.json', JSON.stringify(genesis, null, 4), (err) => {
        console.log(err);
    });
})();
