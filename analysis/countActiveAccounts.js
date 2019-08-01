const {insertOne, upsertOne, findOne, findLastOne, findMany, updateOne, setIndex, countDocuments}  = require('./mongoAPIs');

const { Bar, Presets } = require('cli-progress');

// use the given Provider, e.g in Mist, or instantiate a new websocket provider
const bar1 = new Bar({}, Presets.shades_classic);

const last = 8000000;
const epoch  = 172800; // 1 month
// const epoch =  40320 // 1 week
// const epoch = 1000;

class Accounts {
    constructor() {
        this.totalAccountSize = 0;
        this.activeAccounts = []; // { account, lastBlockNum, puppet }
    }

    upsert(address, blockNum, to) {
        return new Promise(async (resolve, reject) => {
            // upsert account
            let account = await findOne('accounts', { address: address });
            if (account) {
                let count = account.count;
                let distance = (account.distance * count + blockNum - account.lastBlockNum) / (count + 1);
                await updateOne('accounts', { address: address }, {
                    lastBlockNum: blockNum,
                    distance: distance,
                    count: count + 1
                });
            } else {
                await insertOne('accounts', {
                    number: this.totalAccountSize++,
                    address: address,
                    lastBlockNum: blockNum,
                    distance: 0,
                    count: 1
                });
            }

            // upsert active account
            let activeAccount = this.activeAccounts.find(acc => {
                return acc.address == address;
            });
            if (activeAccount) {
                activeAccount.lastBlockNum = blockNum;
                if (!to) activeAccount.puppet = false;
            } else {
                this.activeAccounts.push({
                    address: address,
                    lastBlockNum: blockNum,
                    puppet: account && to
                });
            }
            resolve();
        });
    }

    sweep(blockNum) {
        this.activeAccounts = this.activeAccounts.filter(account => {
            return blockNum - account.lastBlockNum < epoch;
        });
    }

    getPuppetAccountLength() {
        return this.activeAccounts.filter(acc => {
            return acc.puppet;
        }).length;
    }
}

var accounts = new Accounts();

(async function() {
    let currentBlock = 0;
    // activeAccounts {number, #totalAccounts, #activeAccounts, #puppetAccounts}
    // accounts {address, lastBlockNum, distance, count}

    // console.log(`currentBlock: ${currentBlock}, Accounts: ${accountData.totalAccountSize}`);
    //let latest = await getLatest();

    await setIndex('accounts', { address: 1 }, { unique: true });
    await setIndex('activeAccounts', { number: 1 }, { unique: true });

	bar1.start(last, currentBlock);
	for (let i = currentBlock + 1; i <= last; i++) {
        await updateAccounts(i);
        bar1.update(i);
	}
})();

async function updateAccounts(number) {
    let block = await findOne('blocks', {number: number});

    await accounts.upsert(block.miner, number, true);
    for (let address of block.to) {
        await accounts.upsert(address, number, true);
    }
    for (let address of block.from) {
        await accounts.upsert(address, number, false);
    }

    accounts.sweep(number);

    await insertOne('activeAccounts', {
        number: number,
        total: accounts.totalAccountSize,
        active: accounts.activeAccounts.length,
        puppet: accounts.getPuppetAccountLength()
    });
}
