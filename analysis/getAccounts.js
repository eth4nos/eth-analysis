var cluster = require('cluster');
// const {setIndex, findOne, insertOne, update, upsert, end}  = require('./mongoAPIs');
var { Blocks, Accounts } = require('./mongoAPIs');
const ProgressBar = require('./progress');
// const ACCOUNTS = 'accounts_7m';
var epoch = 100;

if (cluster.isMaster) {
	// (async () => { await setIndex(ACCOUNTS, { address: 1 }, { unique: true }); })();

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
		for (let i = msg.start + 1; i <= msg.start + msg.amount; i++) {
			await extractBlock(i);
			process.send({progid: msg.progid, nonce: msg.nonce});
		}
		process.exit(msg.progid);
	});
}

async function extractBlock(blockNum) {

	let block = await Blocks.findOne({number: blockNum}).catch((e) => { console.error(e.message) });;
	let addresses = Array.from(new Set(block.to.concat(block.miner, block.from)));

	// addresses.forEach(async address => {
	// 	let account = await Accounts.findOne({ address: address }).catch((e) => { console.error(e.message) });;
	// 	if (account) {
	// 		await Accounts.updateOne({ address: address }, { $addToSet: { activeBlocks: blockNum }}).catch((e) => { console.error(e.message) });
	// 	} else {
	// 		await Accounts.create({ address: address, activeBlocks: blockNum }).catch((e) => { console.error(e.message) });;
	// 	}
	// });
	addresses.forEach(async address => {
		await Accounts.updateOne({ address: address }, { $addToSet: { activeBlocks: blockNum }}, { upsert: true, strict: false }).catch((e) => { console.error(e.message) });
	})

	// let block = await findOne('blocks', {number: blockNum});
	// let addresses = Array.from(new Set(block.to.concat(block.miner, block.from)));

	// Insert accounts
	// console.log(addresses);

	// addresses.forEach(async address => {
	// 	await upsert(ACCOUNTS,
	// 		{ address: address },
	// 		{ $addToSet: { activeBlocks: blockNum }}
	// 	);
	// });

	// for (address of addresses) {
	// 	let account = await findOne(ACCOUNTS, { address: address });
	// 	if (account) {
	// 		await update(ACCOUNTS,
	// 			{ address: address },
	// 			{ $addToSet: { activeBlocks: blockNum }}
	// 			);
	// 	} else {
	// 		await insertOne(ACCOUNTS, {
	// 			address: address,
	// 			activeBlocks: [blockNum]
	// 		});
	// 	}
	// }
}
