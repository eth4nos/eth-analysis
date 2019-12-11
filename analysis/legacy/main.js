var cluster = require('cluster');
const { Accounts, BlockAnalysis }  = require('./mongoAPIs');
const ProgressBar = require('./progress');

const period = 8000000; // total period to analyze
const epoch = 50000;
const epoch_1w = 40320; // analysis epoch
const epoch_2w = 80640; // analysis epoch
const epoch_1m = 172800; // analysis epoch
const epoch_6m = 1036800; // analysis epoch
const epoch_1y = 2073600; // analysis epoch
const chunk = 1000; // chunk to fetch accounts from the DB

if (cluster.isMaster) {
	let start = 0;
	let end = 55720610; //55730764; //14264037;
	let workers = 28; //require('os').cpus().length - 1;

	// Make progressBar
	const limits = [];
	for (let i = 0; i < parseInt((end - start) / chunk); i++) {
		limits.push(chunk);
	}
	let remainder = (end - start) % chunk;
	if (remainder > 0) {
		limits.push(remainder);
	}
	let progressBar = new ProgressBar(limits.length, start, chunk);
	progressBar.addBars(limits.slice(0, workers));

	// Process fork
	for (let i = 0; i < workers; i++) {
		let worker = cluster.fork();
		worker.send({
			progid: i,
			nonce: i,
			start: start + chunk * i,
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
				start: start + chunk * nonce,
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
		let accounts = await Accounts.find().skip(msg.start).limit(msg.amount).catch((e) => { console.error('Accounts', e.message); });

		for (let i = 0; i < accounts.length; i++) {
			let record = accounts[i];
			let activeBlocks = record.activeBlocks.sort((a,b) => {return a - b;})
			// let advent = Math.ceil(activeBlocks[0] / epoch) * epoch;
			// let advent = period + 1;
			// for (let j = 0; j < activeBlocks.length; j++) {
			// 	if (activeBlocks[j] >= 7000000) {
			// 		advent = Math.ceil(activeBlocks[j] / epoch) * epoch;
			// 		break;
			// 	}
			// }

			// let totalBlocks = new Array();
			// for (let i = advent; i <= period; i += epoch) {
			// 	totalBlocks.push(i);
			// }
			// await BlockAnalysis.updateMany(
			// 	{ number: { $in: totalBlocks }},
			// 	{ $inc: { totalAccounts: 1 }}
			// ).catch((e) => { console.error(`totalBlocks: ${record.address}\n${e.message}`); });
			
			// let activeEpochs_1w = new Set();
			let activeEpochs_2w = new Set();
			// let activeEpochs_1m = new Set();
			let activeEpochs_6m = new Set();
			let activeEpochs_1y = new Set();

			activeBlocks.forEach(number => {
				// if (number >= 7000000) {
					// if (Math.floor(number / epoch) < Math.floor((number + epoch_1w) / epoch))
					// 	activeEpochs_1w.add(Math.ceil(number / epoch) * epoch);
					if (Math.floor(number / epoch) < Math.floor((number + epoch_2w) / epoch))
						activeEpochs_2w.add(Math.ceil(number / epoch) * epoch);
					// if (Math.floor(number / epoch) < Math.floor((number + epoch_1m) / epoch))
						// activeEpochs_1m.add(Math.ceil(number / epoch) * epoch);
					if (Math.floor(number / epoch) < Math.floor((number + epoch_6m) / epoch))
						activeEpochs_6m.add(Math.ceil(number / epoch) * epoch);
					if (Math.floor(number / epoch) < Math.floor((number + epoch_1y) / epoch))
						activeEpochs_1y.add(Math.ceil(number / epoch) * epoch);
				// }
			});
			
			// Array.from(activeEpochs).forEach(async number => {
			// await BlockAnalysis.updateMany(
			// 	{ number: { $in: Array.from(activeEpochs_1w)}},
			// 	{ $inc: { activeAccounts_1w: 1 }}
			// ).catch((e) => { console.error(`activeEpochs_1w: ${record.address}\n${e.message}`); });
			await BlockAnalysis.updateMany(
				{ number: { $in: Array.from(activeEpochs_2w)}},
				{ $inc: { activeAccounts_2w: 1 }}
			).catch((e) => { console.error(`activeEpochs_2w: ${record.address}\n${e.message}`); });
			// await BlockAnalysis.updateMany(
			// 	{ number: { $in: Array.from(activeEpochs_1m)}},
			// 	{ $inc: { activeAccounts_1m: 1 }}
			// ).catch((e) => { console.error(`activeEpochs_1m: ${record.address}\n${e.message}`); });
			await BlockAnalysis.updateMany(
				{ number: { $in: Array.from(activeEpochs_6m)}},
				{ $inc: { activeAccounts_6m: 1 }}
			).catch((e) => { console.error(`activeEpochs_6m: ${record.address}\n${e.message}`); });
			await BlockAnalysis.updateMany(
				{ number: { $in: Array.from(activeEpochs_1y)}},
				{ $inc: { activeAccounts_1y: 1 }}
			).catch((e) => { console.error(`activeEpochs_1y: ${record.address}\n${e.message}`); });
			// });

			process.send({ progid: msg.progid, nonce: msg.nonce });
		}
		process.exit(msg.progid);
	});
}

function getMin(arr) {
    return arr.reduce((min, v) => min <= v ? min : v, Infinity);
}