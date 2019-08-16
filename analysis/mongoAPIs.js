const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://localhost:27017';
// Database Name
const dbName = 'eth-analysis';
var client, db;

function connect() {
    return new Promise(async (resolve, reject) => {
        client = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }).catch((e) => { console.error(e.message); reject(); });
        if (!client) {
            console.error("no client");
            reject();
        }
        db = await client.db(dbName);
        // console.log(this);
        resolve();
    });
}

function end() {
    client.close();
}

class Mongodb {
    constructor() {
    }

    insertOne(collectionName, data) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            let res = await collection.insertOne(data).catch((e) => { console.error('insertOne', e.message); reject(); });
            await end();
            resolve();
            // console.log(res);
        });
    }

    insertMany(collectionName, data) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            let res = await collection.insertMany(data).catch((e) => { console.error('insertMany', e.message); reject(); });
            await end();
            resolve();
            // console.log(res);
        });
    }

    findOne(collectionName, where={}) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            let res = await collection.find(where).toArray().catch((e) => { console.error('findOne', e.message); reject(); });
            // console.log(res);
            await end();
            if (res.length > 0) resolve(res[0]);
            else resolve(undefined)
        });
    }


    findLastOne(collectionName, id) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            let res = await collection.find().sort(id).limit(10).toArray();
            // console.log(res);
            await end();
            if (res.length > 0) resolve(res[0]);
            else resolve(undefined)
        });
    }

    findMany(collectionName, where={}) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            let res = await collection.find(where).toArray().catch((e) => { console.error(e.message); reject(); });
            await end();
            if (res.length > 0) resolve(res);
            else resolve(undefined)
        });
    }

    update(collectionName, where={}, data, option) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            await collection.updateOne(where, data, option).catch((e) => { console.error('update', e.message); reject(); });
            // console.log(res);
            await end();
            resolve()
        });
    }

    updateOne(collectionName, where={}, data, option) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            await collection.updateOne(where, { $set: data }, option).catch((e) => { console.error('updateOne', e.message); reject(); });
            // console.log(res);
            await end();
            resolve()
        });
    }

    updateMany(collectionName, where={}, data, option) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            await collection.updateMany(where, { $set: data }, option).catch((e) => { console.error(e.message); reject(); });
            await end();
            // console.log(res);
            resolve();
        });
    }

    remove(collectionName, where={}) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            let res = await collection.remove(where).catch((e) => { console.error(e.message); reject(); });
            await end();
            // console.log(res);
            resolve();
        });
    }

    drop(collectionName) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            let res = await collection.drop().catch((e) => { console.error(e.message); reject(); });
            console.log(res);
            await end();
            resolve();
        });
    }

    createCollection(collectionName) {
        return new Promise(async (resolve, reject) => {
            await connect();
            await db.createCollection(collectionName);
            await end();
        });
    }

    getIndices(collectionName) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            let res = await collection.getIndexes().catch((e) => { console.error(e.message); reject(); });
            // console.log(res);
            await end();
            resolve(res);
        });
    }

    setIndex(collectionName, index, option) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            let res = await collection.createIndex(index, option).catch((e) => { console.error(e.message); reject(); });
            // console.log(res);
            await end();
            resolve();
        });
    }

    dropIndex(collectionName, index, option) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            let res = await collection.dropIndex(index).catch((e) => { console.error(e.message); reject(); });
            // console.log(res);
            await end();
            resolve();
        });
    }

    dropIndices(collectionName) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            let res = await collection.dropIndexes().catch((e) => { console.error(e.message); reject(); });
            // console.log(res);
            await end();
            resolve();
        });
    }

    countDocuments(collectionName, option={}) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            let res = await collection.countDocuments().catch((e) => { console.error(e.message); reject(); });
            // console.log(res);
            await end();
            resolve(res);
        });
    }

    renameCollection(collectionName,newName) {
        return new Promise(async (resolve, reject) => {
            await connect();
            let collection = db.collection(collectionName);
            await collection.rename(newName).catch((e) => { console.error(e.message); reject(); });
            // console.log(res);
            await end();
            resolve();
        });
    }
}

var mongo = new Mongodb();

module.exports = mongo;
