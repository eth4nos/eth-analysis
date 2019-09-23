var cluster = require('cluster');
// const {setIndex, findOne, insertOne, update, upsert, end}  = require('./mongoAPIs');
var { Blocks, Accounts_0 } = require('./mongoAPIs');
const ProgressBar = require('./progress');
// const ACCOUNTS = 'accounts_7m';
var epoch = 1000;

if (cluster.isMaster) {
	// (async () => { await setIndex(ACCOUNTS, { address: 1 }, { unique: true }); })();

	let start = 3000000;
	let end = 5000000;
	let workers = 25; // require('os').cpus().length - 1;

	// Parse arguments
	if (process.argv.length >= 4) {
		start = process.argv[2] * 1;
		end = process.argv[3] * 1;
		if (process.argv[4]) workers = process.argv[4];
	}

	// Make progressBar
	const limits = [];
	for (let i = 0; i < parseInt((end - start) / epoch); i++) {
		limits.push(epoch);
	}
	let remainder = (end - start) % epoch;
	if (remainder > 0) {
		limits.push(remainder);
	}
	let progressBar = new ProgressBar(limits.length, start, epoch);
	progressBar.addBars(limits.slice(0, workers));

	// Process fork
	for (let i = 0; i < workers; i++) {
		let worker = cluster.fork();
		worker.send({
			progid: i,
			nonce: i,
			start: start + epoch * i,
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
				start: start + epoch * nonce,
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
		for (let i = msg.start; i <= msg.start + msg.amount; i++) {
			await extractBlock(i);
			process.send({progid: msg.progid, nonce: msg.nonce});
		}
		process.exit(msg.progid);
	});
}

async function extractBlock(blockNum) {
	let block = await Blocks.findOne({number: blockNum}).catch((e) => { console.error(e.message) });
	
	let addresses = Array.from(new Set(block.to.concat(block.miner, block.from)));
	for (let i = 0; i < addresses.length; i++) {
		let address = addresses[i];
		console.log(blockNum);
		let account = await Accounts_0.findOne({ address: address });
		if (account) {
			let activeBlocks = account.activeBlocks.push(blockNum);
			await Accounts_0.updateOne(
				{ address: address },
				{ $set: { activeBlocks: activeBlocks }}
			);
		} else
			await Accounts_0.create({
				address: address,
				activeBlocks: [blockNum]
				// { upsert: true, strict: false }
			});

		// await Accounts_0.updateOne({ address: address }, { $addToSet: { activeBlocks: blockNum }}, { upsert: true, strict: false }).catch((e) => { console.error(e.message) });
	}
}
