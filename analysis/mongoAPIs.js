const MongoClient = require('mongodb').MongoClient;

const url = 'mongodb://localhost:27017';
// Database Name
const dbName = 'eth-analysis';

function insertOne(collectionName, data) {
    return new Promise(async (resolve, reject) => {
        let client = await MongoClient.connect(url, { useNewUrlParser: true }).catch((e) => { console.error(e.message); reject(); });

        if (!client) {
            console.error("no client");
            reject();
        }
        const db = client.db(dbName);
        let collection = db.collection(collectionName);
        let res = await collection.insertOne(data).catch((e) => { console.error(e.message); reject(); });
        client.close();
        resolve();
        // console.log(res);
    });
}

function upsertOne(collectionName, id, data) {
    return new Promise(async (resolve, reject) => {
        let client = await MongoClient.connect(url, { useNewUrlParser: true });

        if (!client) {
            console.error("no client")
            reject();
        }
        const db = client.db(dbName);
        let collection = db.collection(collectionName);
        let res = collection.update(data, id, {upsert: true});
        // console.log(res);
        client.close();
        resolve(res)
    });
}

function findOne(collectionName, where={}) {
    return new Promise(async (resolve, reject) => {
        let client = await MongoClient.connect(url, { useNewUrlParser: true }).catch((e) => { console.error(e.message); reject(); });
        if (!client) {
            console.error("no client")
            reject();
        }
        const db = client.db(dbName);
        let collection = db.collection(collectionName);
        let res = await collection.find(where).toArray().catch((e) => { console.error(e.message); reject(); });
        // console.log(res);
        client.close();
        if (res.length > 0) resolve(res[0]);
        else resolve(undefined)
    });
}

function findLastOne(collectionName, id) {
    return new Promise(async (resolve, reject) => {
        let client = await MongoClient.connect(url, { useNewUrlParser: true });
        if (!client) {
            console.error("no client")
            reject();
        }
        const db = client.db(dbName);
        let collection = db.collection(collectionName);
        let res = await collection.find().sort(id).limit(1).toArray();
        // console.log(res);
        client.close();
        if (res.length > 0) resolve(res[0]);
        else resolve(undefined)
    });
}

function findMany(collectionName, where={}) {
    return new Promise(async (resolve, reject) => {
        let client = await MongoClient.connect(url, { useNewUrlParser: true });
        if (!client) {
            console.error("no client")
            reject();
        }
        const db = client.db(dbName);
        let collection = db.collection(collectionName);
        let res = await collection.find(where).toArray().catch((e) => { console.error(e.message); reject(); });
        client.close();
        if (res.length > 0) resolve(res);
        else resolve(undefined)

    });
}

function updateOne(collectionName, where={}, data) {
    return new Promise(async (resolve, reject) => {
        let client = await MongoClient.connect(url, { useNewUrlParser: true }).catch((e) => { console.error(e.message); reject(); });
        if (!client) {
            console.error("no client")
            reject();
        }
        const db = client.db(dbName);
        let collection = db.collection(collectionName);
        await collection.updateOne(where, { $set: data }).catch((e) => { console.error(e.message); reject(); });
        // console.log(res);
        client.close();
        resolve()
    });
}

function remove(collectionName, where={}) {
    return new Promise(async (resolve, reject) => {
        let client = await MongoClient.connect(url, { useNewUrlParser: true }).catch((e) => { console.error(e.message); reject(); });
        if (!client) {
            console.error("no client")
            reject();
        }
        const db = client.db(dbName);
        let collection = db.collection(collectionName);
        let res = await collection.remove(where).catch((e) => { console.error(e.message); reject(); });
        console.log(res);
        client.close();
        resolve();
    });
}

function drop(collectionName) {
    return new Promise(async (resolve, reject) => {
        let client = await MongoClient.connect(url, { useNewUrlParser: true }).catch((e) => { console.error(e.message); reject(); });
        if (!client) {
            console.error("no client")
            reject();
        }
        const db = client.db(dbName);
        let collection = db.collection(collectionName);
        let res = await collection.drop().catch((e) => { console.error(e.message); reject(); });
        console.log(res);
        client.close();
        resolve();
    });
}

function setIndex(collectionName, index, option) {
    return new Promise(async (resolve, reject) => {
        let client = await MongoClient.connect(url, { useNewUrlParser: true }).catch((e) => { console.error(e.message); reject(); });
        if (!client) {
            console.error("no client")
            reject();
        }
        const db = client.db(dbName);
        let collection = db.collection(collectionName);
        let res = await collection.createIndex(index, option).catch((e) => { console.error(e.message); reject(); });
        console.log(res);
        client.close();
        resolve();
    });
}

function count(collectionName, option={}) {
    return new Promise(async (resolve, reject) => {
        let client = await MongoClient.connect(url, { useNewUrlParser: true }).catch((e) => { console.error(e.message); reject(); });
        if (!client) {
            console.error("no client")
            reject();
        }
        const db = client.db(dbName);
        let collection = db.collection(collectionName);
        let res = await collection.countDocuments().catch((e) => { console.error(e.message); reject(); });
        console.log(res);
        client.close();
        resolve();
    });
}

module.exports = {insertOne, upsertOne, findOne, findLastOne, findMany, updateOne, remove, drop, setIndex, count}
