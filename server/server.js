import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';

const app = express();
app.use(cors());
app.use(express.json());

const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGO_DB || 'race-game';
const client = new MongoClient(mongoUrl);

const carModels = [
  { id: 'Vanta', name: 'Vanta', tag: 'Stealth frame', accent: '#7df9ff' },
  { id: 'Rift', name: 'Rift', tag: 'Quantum drift', accent: '#ff74d8' },
  { id: 'Axiom', name: 'Axiom', tag: 'Neural chassis', accent: '#7b61ff' },
  { id: 'Spectra', name: 'Spectra', tag: 'Lightwave shell', accent: '#ffd166' },
  { id: 'Kestrel', name: 'Kestrel', tag: 'Skyline racer', accent: '#15f5b3' },
  { id: 'Nox', name: 'Nox', tag: 'Shadow sprint', accent: '#ff5f7d' }
];

async function connect() {
  if (!client.topology?.isConnected?.()) {
    await client.connect();
  }
  return client.db(dbName);
}

app.get('/api/car-models', async (_req, res) => {
  try {
    const db = await connect();
    const collection = db.collection('carModels');
    const docs = await collection.find({}).toArray();

    if (docs.length > 0) {
      res.json(docs);
      return;
    }

    await collection.insertMany(carModels);
    res.json(carModels);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/races', async (_req, res) => {
  try {
    const db = await connect();
    const races = await db.collection('races').find({}).sort({ createdAt: -1 }).toArray();
    const summaries = races.map((race) => ({
      id: race._id?.toString?.() ?? race.id,
      name: race.name,
      status: race.status,
      createdAt: race.createdAt,
      racerCount: race.racers?.length ?? 0,
      resultCount: race.results?.length ?? 0
    }));
    res.json(summaries);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/races', async (req, res) => {
  try {
    const db = await connect();
    const race = {
      ...req.body,
      createdAt: new Date().toISOString(),
      racers: [],
      results: []
    };

    const result = await db.collection('races').insertOne(race);
    res.status(201).json({ ...race, id: result.insertedId.toString() });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/races/:raceId/racers', async (req, res) => {
  try {
    const db = await connect();
    const raceId = req.params.raceId;
    const racer = { ...req.body, id: `racer-${Date.now()}` };

    await db.collection('races').updateOne({ _id: new ObjectId(raceId) }, { $push: { racers: racer } });
    res.status(201).json(racer);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/races/:raceId/results', async (req, res) => {
  try {
    const db = await connect();
    const raceId = req.params.raceId;
    const result = { ...req.body, id: `result-${Date.now()}` };

    await db.collection('races').updateOne({ _id: new ObjectId(raceId) }, { $push: { results: result } });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/races/:raceId', async (req, res) => {
  try {
    const db = await connect();
    const race = await db.collection('races').findOne({ _id: new ObjectId(req.params.raceId) });
    if (!race) {
      res.status(404).json({ message: 'Race not found' });
      return;
    }

    res.json({
      id: race._id?.toString?.() ?? race.id,
      name: race.name,
      status: race.status,
      createdAt: race.createdAt,
      racers: race.racers ?? [],
      results: race.results ?? []
    });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Mongo-backed race API listening on http://127.0.0.1:${port}`);
});
