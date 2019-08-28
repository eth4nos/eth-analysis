var cluster = require('cluster');
const {setIndex, findOne, insertOne, update, findRange}  = require('./mongoAPIs');
const ProgressBar = require('./progress');

/**
 * 1 ~ 3M
 * ObjectId: 5d53d285019cd1d76756e705
 * count: 840230
 */
aggAccounts = [
	{
		// 3M ~ 5M
		db_name: 'accounts_3m',
		objectId: '5d5a296e156c0e1acc0d9ec1',
		count: 22197266
	},
	{
		// 5M ~ 7M
		db_name: 'accounts_5m',
		objectId: '5d53d28e0da4fa0c01c4ec38',
		count: 27180157
	},
	{
		// 7M ~ 8M
		db_name: 'accounts_7m',
		objectId: '5d5a495f0d0057455ff99507',
		// count: 14264133
		count: 10000
	}
]

const ACCOUNTS			= 'accounts_7m';
const ACTIVE_ACCOUNTS	= 'active_accounts_7m';
const TRANSACTIONS		= 'transactions_7m';
const INTERVAL			= 100
const EPOCH				= 172800; // 1 month
// const EPOCH 			= 40320 // 1 week
// const EPOCH 			= 1024;
const order = 2;

if (cluster.isMaster) {
	let start = 0;
	let end = aggAccounts[order].count;
	let workers = require('os').cpus().length - 1;
	(async () => { await setIndex(ACTIVE_ACCOUNTS, { address: 1 }, { unique: true }); })();
	// Make progressBar
	const limits = [];
	for (let i = 0; i < parseInt((end - start) / INTERVAL); i++) {
		limits.push(INTERVAL);
	}
	// console.log(limits);
	let remainder = (end - start) % INTERVAL;
	if (remainder > 0) {
		limits.push(remainder);
	}
	let progressBar = new ProgressBar(limits.length, start, INTERVAL);
	progressBar.addBars(limits.slice(0, workers));

	// Process fork
	for (let i = 0; i < workers; i++) {
		let worker = cluster.fork();
		worker.send({
			progid: i,
			nonce: i,
			start: start + INTERVAL * i,
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
				start: start + INTERVAL * nonce,
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
		let accounts = await findRange(ACCOUNTS, {_id: 1}, msg.start, msg.amount);
		// accounts.forEach(async record => {
		for (let i = 0; i < accounts.length; i++) {
			let record = accounts[i];
			let activeBlocks = [...new Set(record.activeBlocks.sort((a,b) => { return a - b; }))];
			let restoreBlock = [];
			
			for (let j = 0; j < activeBlocks.length - 1; j++) {
				if (Math.floor(activeBlocks[j + 1] / EPOCH) - Math.floor(activeBlocks[j] / EPOCH) > 1)
					restoreBlock.push(activeBlocks[j + 1] - 1);
			}

			// await update(ACCOUNTS,
			// 	{ address: record.address },
			// 	{ $set: { activeBlocks: activeBlocks }}
			// );

			await insertOne(ACTIVE_ACCOUNTS, {
				address: record.address,
				restoreBlock: restoreBlock
			});
			process.send({progid: msg.progid, nonce: msg.nonce});
		};
		process.exit(msg.progid);
	});
}