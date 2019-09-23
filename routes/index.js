var express = require('express');
var router = express.Router();

const { BlockAnalysis, BlockAnalysis_7m }  = require('../analysis/mongoAPIs');

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Active Accounts of Ethereum', period: 'data' });
});

router.get('/7m', (req, res, next) => {
  res.render('index', { title: 'Active Accounts of Ethereum', period: 'data_7m' });
});

router.get('/data', async (req, res, next) => {
  res.json(getSources(await BlockAnalysis.find()));
});

router.get('/data_7m', async (req, res, next) => {
  res.json(getSources(await BlockAnalysis_7m.find()));
});

function getSources(data) {
  return [
    { id: 'total', values: data.map((row) => {
      return { number: row.number, value: row.totalAccounts }
    })},
    { id: 'active_1m', values: data.map((row) => {
      return { number: row.number, value: row.activeAccounts_1m }
    })},
    { id: 'active_1w', values: data.map((row) => {
      return { number: row.number, value: row.activeAccounts_1w }
    })},
    // { id: 'puppet', values: data.map((row) => {
    //   return { number: row.number, value: row.activeAccounts }
    // })},
    { id: 'ratio_m', values: data.map((row) => {
      return { number: row.number, value: row.activeAccounts_1m / row.totalAccounts * 100 }
    })},
    { id: 'ratio_w', values: data.map((row) => {
      return { number: row.number, value: row.activeAccounts_1w / row.totalAccounts * 100 }
    })}
  ];
}

module.exports = router;