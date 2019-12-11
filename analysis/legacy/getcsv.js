var fs = require('fs');
const { BlockAnalysis_1w, BlockAnalysis_1m }  = require('../analysis/mongoAPIs');

(async () => {
    let data_1m = await BlockAnalysis_1m.find({ number: { $lt: 8000000 }});
    data_1m.forEach(data => {
        fs.appendFileSync(`data_1m.csv`, `${data.number},${data.totalAccounts},${data.activeAccounts}\n`);
    });
    data_1w = await BlockAnalysis_1w.find({ number: { $lt: 8000000 }});
    data_1w.forEach(data => {
        fs.appendFileSync(`data_1w.csv`, `${data.number},${data.totalAccounts},${data.activeAccounts}\n`);
    });
    process.exit();
})();