var cluster = require('cluster');
const {setIndex, findOne, insertOne, update}  = require('./mongoAPIs');
const ProgressBar = require('./progress');
const ACCOUNTS = 'accounts_test';

if (cluster.isMaster) {
	setIndex(ACCOUNTS, { address: 1 });

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
		// console.log(msg);
		for (let i = msg.start + 1; i <= msg.last; i++) {
			await extractBlock(i);
			process.send(msg.number);
		  }
		  process.exit(msg.number);
	});
}

async function extractBlock(blockNum) {
	let block = await findOne('blocks', {number: blockNum});
	let addresses = Array.from(new Set(block.to.concat(block.miner, block.from)));

	// Insert accounts
	// console.log(addresses);
	for (address of addresses) {
		let account = await findOne(ACCOUNTS, { address: address });
		if (account) {
			await update(ACCOUNTS,
				{ address: address },
				{  $addToSet: { activeBlocks: blockNum }}
				);
		} else {
			await insertOne(ACCOUNTS,
				{ address: address },
				{ activeBlocks: [blockNum] }
				);
		}
		
	}
}