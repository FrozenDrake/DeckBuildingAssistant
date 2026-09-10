const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('deckbuilder');
  const game = await db.collection('games').findOne({name: 'Umamusume: Pretty Derby'});
  console.log(JSON.stringify(game.card_schema, null, 2));
  await client.close();
}
run();
