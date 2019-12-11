const { AccountAnalysis }  = require('./mongoAPIs');

(async () => {
    await AccountAnalysis.create({number: 0});
    process.exit();
})();