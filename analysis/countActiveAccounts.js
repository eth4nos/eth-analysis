const {insertOne, insertMany, upsertOne, updateMany, findOne, findLastOne, findMany, remove, drop, setIndex, countDocuments}  = require('./mongoAPIs');

const { Bar, Presets } = require('cli-progress');

// use the given Provider, e.g in Mist, or instantiate a new websocket provider
const bar1 = new Bar({}, Presets.shades_classic);

const last = 8000000;
const epoch  = 172800; // 1 month
// const epoch =  40320 // 1 week
// const epoch = 1000;

class Accounts {
    constructor() {
        // this.activeAccounts = []; // { account, lastBlockNum, puppet }
        this.ancientAccounts = 0;
        this.activeAccounts = 0;
    }

    upsert(address, blockNum) {
        return new Promise(async (resolve, reject) => {
            await upsertOne('accounts', { address: address }, {
                address: address,
                lastBlockNum: blockNum,
                active: true
            });
            resolve();
        });
    }

    sweep(blockNum) {
        return new Promise(async (resolve, reject) => {
            await updateMany('accounts', { $and: [{ active: true }, { lastBlockNum: { $lt: (blockNum - epoch) }}] }, { $set: { active: false }});
            resolve();
        });
    }
}

var accounts = new Accounts();

(async function() {
    // countAccounts {number, #totalAccounts, #activeAccounts}
    // accounts {address, lastBlockNum, distance, count}

    await setIndex('accounts', { address: 1 }, { unique: true });
    await setIndex('countAccounts', { number: 1 }, { unique: true });

    let currentBlock = 0;
    let lastBlock = await findLastOne('countAccounts', { number: -1 });
    if (lastBlock) currentBlock = lastBlock.number;
    // await drop('activeAccounts');
   
    accounts.totalAccountSize = await countDocuments('accounts');

	bar1.start(last, currentBlock);
	for (let i = currentBlock + 1; i <= last; i++) {
        await updateAccounts(i);
        bar1.update(i);
	}
})();

async function updateAccounts(number) {
    let block = await findOne('blocks', {number: number});

    await accounts.upsert(block.miner, number);
    for (let address of block.to) {
        await accounts.upsert(address, number);
    }
    for (let address of block.from) {
        await accounts.upsert(address, number);
    }

    await accounts.sweep(number);

    let total = await countDocuments('accounts');
    let active = await countDocuments('accounts', { active: true });
    await insertOne('countAccounts', {
        number: number,
        total: total,
        active: active
    });
}
