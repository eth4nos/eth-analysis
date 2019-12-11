const Web3  = require('web3');
const {insertOne, upsertOne, findOne, findLastOne, findMany}  = require('./mongoAPIs');

const { Bar, Presets } = require('cli-progress');

// use the given Provider, e.g in Mist, or instantiate a new websocket provider
const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');
const bar1 = new Bar({}, Presets.shades_classic);

const TRANSACTIONS = 'transactions';

(async function() {
	// let currentBlock = await findLastOne(BLOCKS, {number: -1});

	let current = 4747990;
	// if (currentBlock) current = currentBlock.number;
	
	// if (current == 0)
	//     insertGenesis()
	// let last = await getLatest();
	let last = 8000000;

	if (process.argv.length == 4) {
		current = process.argv[2] * 1;
		last = process.argv[3] * 1;
	}
	console.log(`Current: ${current}`);
	console.log(`Last: ${last}`);

	bar1.start(last, current);

	for (let i = current + 1; i <= last; i++) {
		await extractBlock(i);
		bar1.update(i);
  }
})();

async function extractBlock(blockNum) {
	let block = await web3.eth.getBlock(blockNum, true).catch((e) => { console.error(e.message); reject(); });

	// Insert transactions
	for (let transaction of block.transactions) {
		// console.log(transaction);
		let receipt = await web3.eth.getTransactionReceipt(transaction.hash).catch((e) => { console.error(e.message); reject(); });
		if (!transaction.to) {
			// Contract Creation
			transaction.to = receipt.contractAddress;
		}

		await insertOne(TRANSACTIONS, {
			txhash: transaction.hash,
			blockNum: blockNum,
			from: transaction.from,
			to: transaction.to,
			value: transaction.value,
			gas: transaction.gas,
			gasPrice: transaction.gasPrice,
			gasUsed: receipt.gasUsed,
			nonce: transaction.nonce,
			transactionIndex: transaction.transactionIndex
		}).catch((e) => { console.error(e.message) });
	}
}