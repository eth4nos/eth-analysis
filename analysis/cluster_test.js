// cluster.js
var cluster = require('cluster'); // 클러스터 모듈 로드
var numCPUs = require('os').cpus().length; // CPU 개수 가져오기
// numCPUs = 3;

const ProgressBar = require('./progress');

if (cluster.isMaster) { // 마스터 처리
	const limits = []
	for (let i = 0; i < numCPUs; i++) {
		limits.push(100);
	}
	// console.log(limits);
	var progressBar = new ProgressBar();
	progressBar.addBars(limits);

	for (var i = 0; i < numCPUs; i++) {
		let worker = cluster.fork(); // CPU 개수만큼 fork
		worker.send(i);

		//생성한 워커가 보내는 메시지 처리
		worker.on('message', function (message) {
			// console.log('마스터가 ' + worker.process.pid + ' 워커로부터 받은 메시지 : ' + message);
			progressBar.forward(message, 1);
		});
	}
	
	// 워커 종료시 다잉 메시지 출력
	cluster.on('exit', function(worker, code, signal) {
		console.log('worker ' + worker.process.pid + ' died');
	});
}
else { // 워커 처리
	// console.log( 'current worker pid is ' + process.pid );
	var i = 0;
	process.on('message', (data) => {
		//do something with data
		// console.log(data);
		i = data;
	}); 

	setInterval(() => {
		// process.send(process.pid + ' pid 를 가진 워커가 마스터에게 보내는 메시지');
		process.send(i);
	}, 1000);
	

	// process.exit(0);
}