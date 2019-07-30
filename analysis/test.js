const {insertOne, upsertOne, findOne, findLastOne, findMany, update, remove, drop, setIndex}  = require('./mongoAPIs');

// (async function() {
//     var res = await findOne('transactions');
//     console.log(res);
// })();

// (async function() {
//     await remove('blocks', {number: 1});
// })();

(async function() {
    let genesis = require('./config/genesis.json');
    let res = await insertOne('blocks', {
        number: 1,
        miner: '0x05a56e2d52c817161883f50c441c3228cfe54d9f',
        from: Object.keys(genesis.alloc),
        to: []
    });
    console.log(res);
})();