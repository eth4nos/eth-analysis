var express = require('express');
var router = express.Router();

const {insertOne, upsertOne, findOne, findLastOne, findMany, updateOne, setIndex}  = require('../analysis/mongoAPIs');

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Active Accounts of Ethereum' });
});

router.get('/data', async (req, res, next) => {
  let data = await findMany('activeAccounts', { number: { $mod: [100, 0]} });
  // console.log(data);

  let sources = [
    { id: 'total', values: data.map((row) => {
      return { number: row.number, value: row.total }
    })},
    { id: 'active', values: data.map((row) => {
      return { number: row.number, value: row.active }
    })},
    { id: 'puppet', values: data.map((row) => {
      return { number: row.number, value: row.puppet }
    })},
    { id: 'ratio', values: data.map((row) => {
      return { number: row.number, value: row.active / row.total * 100 }
    })}
  ];

  res.json(sources);
});

module.exports = router;
