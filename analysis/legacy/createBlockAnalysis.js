const { BlockAnalysis_7m }  = require('./mongoAPIs');

const start = 7000000; //0;
const period = 8000000;
const epoch = 50000;

(async () => {
    for (let number = start; number <= period; number += epoch) {
        await BlockAnalysis_7m.create(
            { number: number }
        );
    }
    process.exit();
})();