import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined
}

const clientPromise =
  global.mongoClientPromise ??
  (uri
    ? new MongoClient(uri).connect()
    : new Promise<MongoClient>(() => {}))

if (uri) {
  global.mongoClientPromise = clientPromise
}

export default clientPromise
