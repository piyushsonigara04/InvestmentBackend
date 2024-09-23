// const URL = "mongodb://localhost:27017/Investment"

// const dbConnect = ()=>{
//     const mongoose = require('mongoose');

//     mongoose.connect(URL)
//     .then(()=>console.log('DB connected'))
//     .catch(err=>{
//         console.log(err);
//         process.exit(1);
//     });
// }

// module.exports = dbConnect;

// dbConnect.js for Cassandra

const cassandra = require('cassandra-driver');

// Configure Cassandra connection settings
const client = new cassandra.Client({
    contactPoints: ['localhost'], // Replace with your Cassandra contact points
    localDataCenter: 'datacenter1', // Your data center name
    keyspace: 'my_keyspace' // Your Cassandra keyspace
});

const dbConnect = async () => {
    try {
        await client.connect();
        console.log('Cassandra DB connected');
    } catch (error) {
        console.error('Failed to connect to Cassandra', error);
        process.exit(1);
    }
};

module.exports = { dbConnect, client };
