import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId } from 'mongodb';
import {
  USER_COLLECTION_NAME,
  validateRegisterPayload,
  validateLoginPayload,
  createUserDocument,
  formatPublicUser,
  verifyPassword,
  createAuthToken,
  verifyAuthToken
} from './auth.model.js';

const app = express();
app.use(cors());
app.use(express.json());

export function authenticateRequest(req, res, next) {
  const authorization = req.headers.authorization ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const payload = verifyAuthToken(token);

  if (!payload?.userId) {
    res.status(401).json({ message: 'unauthorized' });
    return;
  }

  req.auth = payload;
  next();
}

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

app.post('/api/register', async (req, res) => {
  try {
    const validation = validateRegisterPayload(req.body);
    if (!validation.valid) {
      res.status(400).json({ errors: validation.errors });
      return;
    }

    const db = await connect();
    const usersCollection = db.collection(USER_COLLECTION_NAME);
    const existingUser = await usersCollection.findOne({ email: validation.data.email });

    if (existingUser) {
      res.status(409).json({ errors: ['email is already registered'] });
      return;
    }

    const userDocument = createUserDocument(validation.data);
    const insertion = await usersCollection.insertOne(userDocument);
    const createdUser = { ...userDocument, _id: insertion.insertedId };

    res.status(201).json({ user: formatPublicUser(createdUser) });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const validation = validateLoginPayload(req.body);
    if (!validation.valid) {
      res.status(400).json({ errors: validation.errors });
      return;
    }

    const db = await connect();
    const usersCollection = db.collection(USER_COLLECTION_NAME);
    const existingUser = await usersCollection.findOne({ email: validation.data.email });

    if (!existingUser || !verifyPassword(existingUser.passwordHash, validation.data.password)) {
      res.status(401).json({ errors: ['invalid email or password'] });
      return;
    }

    const token = createAuthToken({ userId: existingUser._id?.toString?.(), email: existingUser.email });
    res.status(200).json({ token, user: formatPublicUser(existingUser) });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/me', authenticateRequest, async (req, res) => {
  try {
    const db = await connect();
    const usersCollection = db.collection(USER_COLLECTION_NAME);
    const user = await usersCollection.findOne({ _id: new ObjectId(req.auth.userId) });

    if (!user) {
      res.status(404).json({ message: 'user not found' });
      return;
    }

    res.status(200).json({ user: formatPublicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/protected', authenticateRequest, async (req, res) => {
  res.status(200).json({
    message: 'access granted',
    authenticatedUser: {
      userId: req.auth.userId,
      email: req.auth.email
    },
    data: {
      secret: 'only visible to authenticated users',
      timestamp: new Date().toISOString()
    }
  });
});

async function findOwnedRace(db, raceId, ownerId) {
  const race = await db.collection('races').findOne({ _id: new ObjectId(raceId) });
  if (!race || race.ownerId !== ownerId) {
    return null;
  }
  return race;
}

app.get('/api/car-models', authenticateRequest, async (_req, res) => {
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

app.get('/api/races', authenticateRequest, async (req, res) => {
  try {
    const db = await connect();
    const races = await db.collection('races').find({ ownerId: req.auth.userId }).sort({ createdAt: -1 }).toArray();
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

app.post('/api/races', authenticateRequest, async (req, res) => {
  try {
    const db = await connect();
    const race = {
      ...req.body,
      ownerId: req.auth.userId,
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

app.post('/api/races/:raceId/racers', authenticateRequest, async (req, res) => {
  try {
    const db = await connect();
    const race = await findOwnedRace(db, req.params.raceId, req.auth.userId);
    if (!race) {
      res.status(404).json({ message: 'Race not found' });
      return;
    }

    const racer = { ...req.body, id: `racer-${Date.now()}` };

    await db.collection('races').updateOne({ _id: race._id }, { $push: { racers: racer } });
    res.status(201).json(racer);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.post('/api/races/:raceId/results', authenticateRequest, async (req, res) => {
  try {
    const db = await connect();
    const race = await findOwnedRace(db, req.params.raceId, req.auth.userId);
    if (!race) {
      res.status(404).json({ message: 'Race not found' });
      return;
    }

    const result = { ...req.body, id: `result-${Date.now()}` };

    await db.collection('races').updateOne({ _id: race._id }, { $push: { results: result } });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/races/:raceId', authenticateRequest, async (req, res) => {
  try {
    const db = await connect();
    const race = await findOwnedRace(db, req.params.raceId, req.auth.userId);
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

const port = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Mongo-backed race API listening on http://127.0.0.1:${port}`);
  });
}

export default app;
