/*
 * Transactions, Active accounts, Initial state
 */
var cluster = require('cluster');
var { Accounts, Transactions } = require('./mongoAPIs');
const Web3  = require('web3');

const ProgressBar = require('./progress');
// use the given Provider, e.g in Mist, or instantiate a new websocket provider
const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');

const INITIAL_BLOCK = 7000000;
const BATCH = 100;

if (cluster.isMaster) {
	let start = INITIAL_BLOCK;
	let end = 8000000;
	let workers = 60; // require('os').cpus().length - 1;

	// Parse arguments
	if (process.argv.length >= 4) {
		start = process.argv[2] * 1;
		end = process.argv[3] * 1;
		if (process.argv[4]) workers = process.argv[4];
	}

	// Make progressBar
	const limits = [];
	for (let i = 0; i < parseInt((end - start) / BATCH); i++) {
		limits.push(BATCH);
	}
	let remainder = (end - start) % BATCH;
	if (remainder > 0) {
		limits.push(remainder);
	}
	let progressBar = new ProgressBar(limits.length, start, BATCH);
	progressBar.addBars(limits.slice(0, workers));

	// Process fork
	for (let i = 0; i < workers; i++) {
		let worker = cluster.fork();
		worker.send({
			progid: i,
			nonce: i,
			start: start + BATCH * i,
			amount: limits[i]
		});

		worker.on('message', function (msg) {
			progressBar.forward(msg.progid, msg.nonce, 1);
		});
	}
	let nonce = workers;

	// fork next process
	cluster.on('exit', function(worker, progid, signal) {
		// console.log(`${progid} finished`);
		if (nonce <= limits.length) {
			let worker = cluster.fork();
			progressBar.update(progid, limits[nonce]);
			worker.send({
				progid: progid,
				nonce: nonce,
				start: start + BATCH * nonce,
				amount: limits[nonce]
			});
			worker.on('message', function (msg) {
				progressBar.forward(msg.progid, msg.nonce, 1);
			});
			nonce++;
			progressBar.forwardIndicator();
		}
	});
} else {
	process.on('message', async (msg) => {
		// console.log(msg)
		for (let i = msg.start; i < msg.start + msg.amount; i++) {
			await getState(i);
			process.send({progid: msg.progid, nonce: msg.nonce});
		}
		process.exit(msg.progid);
	});
}

async function getState(blockNum) {
	return new Promise(async (resolve, reject) => {
		let block = await web3.eth.getBlock(blockNum, true).catch((e) => { console.error(e.message); reject(); });
		
		// Insert transactions
		for (let i = 0; i < block.transactions.length; i++) {
			let transaction = block.transactions[i];
			if (await Transactions.findOne({hash: transaction.hash})) continue; // ???
			let receipt = await web3.eth.getTransactionReceipt(transaction.hash).catch((e) => { console.error(e.message); reject(); });
			if (receipt && !transaction.to) {
				// Contract Creation
				transaction.to = receipt.contractAddress;
			}
			await updateAccount(transaction.from, blockNum);
			await updateAccount(transaction.to, blockNum);
			await Transactions.create({
				hash: transaction.hash,
				blockNum: blockNum,
				transactionIndex: transaction.transactionIndex,
				from: transaction.from,
				to: transaction.to,
				value: transaction.value,
				nonce: transaction.nonce
			}).catch((e) => { console.error(e.message) });
		}
		await updateAccount(block.miner, blockNum);
		resolve();
	});
}

function updateAccount(address, blockNum) {
	return new Promise(async (resolve, reject) => {
		let account = await Accounts.findOne({ address: address });
		if (account) {
			await Accounts.updateOne(
				{ address: address },
				{ $addToSet: { activeBlocks: blockNum }}
			);
			resolve();
		} else {
			let initialBalance = await web3.eth.getBalance(address, INITIAL_BLOCK).catch((e) => { console.error(e.message); reject(); });
			await Accounts.updateOne(
				{ address: address },
				{ activeBlocks: [blockNum],
				  initialBalance: initialBalance
				}, { upsert: true, strict: true}
			);
			resolve();
		}
	});
}