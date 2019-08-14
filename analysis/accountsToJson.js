const {setIndex, findOne, findMany, insertOne, update}  = require('./mongoAPIs');
const fs = require('fs');
const ACCOUNTS = 'accounts';
var genesis = require('./genesis.json');

(async () => {
    let alloc = {};
    let accounts = await findMany(ACCOUNTS);
    console.log(accounts);
    for (account of accounts) {
        alloc[account['address']] = { "balance": "1000000000000000000000" }
    }
    genesis['alloc'] = alloc;
    fs.writeFile('./genesis_7000030.json', JSON.stringify(genesis, null, 4), (err) => {
        console.log(err);
    });
})();
