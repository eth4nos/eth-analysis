var cluster = require('cluster');
const {setIndex, findOne, insertOne, update, findRange}  = require('./mongoAPIs');
const ProgressBar = require('./progress');
const ACCOUNTS = 'accounts';

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
		count: 14264133
	}
]

var epoch = 100;
const aggOrder = 0;

if (cluster.isMaster) {
	let start = 0;
	let end = aggAccounts[aggOrder].count;
	let workers = require('os').cpus().length - 1;

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
		let accounts = await findRange(aggAccounts[aggOrder].db_name, {_id: 1}, msg.start, msg.amount);
		// accounts.forEach(async record => {
		for (let i = 0; i < accounts.length; i++) {
			let record = accounts[i];
			let account = await findOne(ACCOUNTS, { address: record.address });
			if (!Array.isArray(record.activeBlocks)) {
				console.log(record.activeBlocks);
			}
			if (account) {
				await update(ACCOUNTS,
					{ address: record.address },
					{ $addToSet: { activeBlocks: record.activeBlocks }}
					);
			} else {
				await insertOne(ACCOUNTS, {
					address: record.address,
					activeBlocks: record.activeBlocks
				});
			}
			process.send({progid: msg.progid, nonce: msg.nonce});
		};
		process.exit(msg.progid);
	});
}