var cluster = require('cluster');
const Web3  = require('web3');
const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');
const {setIndex, insertOne}  = require('./mongoAPIs');
const ProgressBar = require('./progress');
const TRANSACTIONS = 'transactions_test';

if (cluster.isMaster) {
	setIndex(TRANSACTIONS, { blockNum: 1, transactionIndex: 1 });

	let start = 0;
	let end = 8000000;
	let workers = require('os').cpus().length - 1;

	// Parse arguments
	if (process.argv.length >= 4) {
		start = process.argv[2] * 1;
		end = process.argv[3] * 1;
		if (process.argv[4]) workers = process.argv[4];
	}

	// Make progressBar
	const limits = [];
	const length = parseInt((end - start) / workers);
	for (let i = 0; i < workers; i++) {
		limits.push(length);
	}
	limits.push((end - start) % workers);
	// console.log(limits);
	var progressBar = new ProgressBar();
	progressBar.addBars(limits);
	
	// Process fork
	for (var i = 0; i < limits.length; i++) {
		let worker = cluster.fork();
		worker.send({ number: i, start: start + length * i, last: start + length * i + limits[i] });

		worker.on('message', function (message) {
			// console.log('마스터가 ' + worker.process.pid + ' 워커로부터 받은 메시지 : ' + message);
			progressBar.forward(message, 1);
		});
	}

	cluster.on('exit', function(worker, code, signal) {
		// console.log(`${code} finished`);
	});
} else {
	// console.log( 'current worker pid is ' + process.pid );
	process.on('message', async (msg) => {
		for (let i = msg.start + 1; i <= msg.last; i++) {
			await extractBlock(i);
			process.send(msg.number);
		  }
		  process.exit(msg.number);
	});
}

async function extractBlock(blockNum) {
	return new Promise(async (resolve, reject) => {
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
		resolve();
	});
}