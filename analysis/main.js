var cluster = require('cluster');
const { Accounts, BlockAnalysis }  = require('./mongoAPIs');
const ProgressBar = require('./progress');

var epoch = 100;

if (cluster.isMaster) {
	let start = 0;
	let end = 42708203;
	let workers = 1; //require('os').cpus().length - 1;

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
		let accounts = await Accounts.find().skip(msg.start).limit(msg.amount);

		for (let i = 0; i < accounts.length; i++) {
			let record = accounts[i];
			let activeBlocks = record.activeBlocks;
			activeBlocks = [...new Set(activeBlocks.sort(((a,b) => { return a-b; })))];

			await Accounts.updateOne(
				{ address: record.address },
				{ $set: {activeBlocks: activeBlocks }}
			);
			process.send({ progid: msg.progid, nonce: msg.nonce });
		}
		process.exit(msg.progid);
	});
}