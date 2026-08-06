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
import { ApiError, asyncHandler, errorHandler, notFoundHandler } from './errors.js';
import { buildRematchRace, validateRematchSource } from './race.model.js';
import { CAR_MODEL_COLLECTION_NAME, carModels, isKnownCarModelId, toggleFavorite } from './car-model.model.js';
import {
  PERSONAL_BEST_COLLECTION_NAME,
  canRacerFinish,
  findRacerInRace,
  markRacerFinished,
  nextRacePosition,
  resolvePersonalBest,
  validateFinishPayload
} from './personal-best.model.js';

const app = express();
app.use(cors());
app.use(express.json());

export function authenticateRequest(req, res, next) {
  const authorization = req.headers.authorization ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const payload = verifyAuthToken(token);

  if (!payload?.userId) {
    next(ApiError.unauthorized());
    return;
  }

  req.auth = payload;
  next();
}

const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGO_DB || 'race-game';
const client = new MongoClient(mongoUrl);

async function connect() {
  if (!client.topology?.isConnected?.()) {
    await client.connect();
  }
  return client.db(dbName);
}

app.post(
  '/api/register',
  asyncHandler(async (req, res) => {
    const validation = validateRegisterPayload(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest('registration payload is invalid', validation.errors);
    }

    const db = await connect();
    const usersCollection = db.collection(USER_COLLECTION_NAME);
    const existingUser = await usersCollection.findOne({ email: validation.data.email });

    if (existingUser) {
      throw ApiError.conflict('email is already registered');
    }

    const userDocument = createUserDocument(validation.data);
    const insertion = await usersCollection.insertOne(userDocument);
    const createdUser = { ...userDocument, _id: insertion.insertedId };

    res.status(201).json({ user: formatPublicUser(createdUser) });
  })
);

app.post(
  '/api/login',
  asyncHandler(async (req, res) => {
    const validation = validateLoginPayload(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest('login payload is invalid', validation.errors);
    }

    const db = await connect();
    const usersCollection = db.collection(USER_COLLECTION_NAME);
    const existingUser = await usersCollection.findOne({ email: validation.data.email });

    if (!existingUser || !verifyPassword(existingUser.passwordHash, validation.data.password)) {
      throw ApiError.unauthorized('invalid email or password');
    }

    const token = createAuthToken({ userId: existingUser._id?.toString?.(), email: existingUser.email });
    res.status(200).json({ token, user: formatPublicUser(existingUser) });
  })
);

app.get(
  '/api/me',
  authenticateRequest,
  asyncHandler(async (req, res) => {
    const db = await connect();
    const usersCollection = db.collection(USER_COLLECTION_NAME);
    const user = await usersCollection.findOne({ _id: new ObjectId(req.auth.userId) });

    if (!user) {
      throw ApiError.notFound('user not found');
    }

    res.status(200).json({ user: formatPublicUser(user) });
  })
);

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

app.get(
  '/api/car-models',
  authenticateRequest,
  asyncHandler(async (_req, res) => {
    const db = await connect();
    const collection = db.collection(CAR_MODEL_COLLECTION_NAME);
    const docs = await collection.find({}).toArray();

    if (docs.length > 0) {
      res.json(docs);
      return;
    }

    await collection.insertMany(carModels);
    res.json(carModels);
  })
);

app.post(
  '/api/car-models/:carModelId/favorite',
  authenticateRequest,
  asyncHandler(async (req, res) => {
    const { carModelId } = req.params;
    if (!isKnownCarModelId(carModelId)) {
      throw ApiError.notFound('car model not found');
    }

    const db = await connect();
    const usersCollection = db.collection(USER_COLLECTION_NAME);
    const user = await usersCollection.findOne({ _id: new ObjectId(req.auth.userId) });
    if (!user) {
      throw ApiError.notFound('user not found');
    }

    const { favorited, favoriteCarModelIds } = toggleFavorite(user.favoriteCarModelIds, carModelId);
    await usersCollection.updateOne({ _id: user._id }, { $set: { favoriteCarModelIds } });

    res.status(200).json({ carModelId, favorited, favoriteCarModelIds });
  })
);

app.get(
  '/api/races',
  authenticateRequest,
  asyncHandler(async (req, res) => {
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
  })
);

app.post(
  '/api/races',
  authenticateRequest,
  asyncHandler(async (req, res) => {
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
  })
);

app.post(
  '/api/races/:raceId/racers',
  authenticateRequest,
  asyncHandler(async (req, res) => {
    const db = await connect();
    const race = await findOwnedRace(db, req.params.raceId, req.auth.userId);
    if (!race) {
      throw ApiError.notFound('race not found');
    }

    const racer = { ...req.body, id: `racer-${Date.now()}` };

    await db.collection('races').updateOne({ _id: race._id }, { $push: { racers: racer } });
    res.status(201).json(racer);
  })
);

app.post(
  '/api/races/:raceId/results',
  authenticateRequest,
  asyncHandler(async (req, res) => {
    const db = await connect();
    const race = await findOwnedRace(db, req.params.raceId, req.auth.userId);
    if (!race) {
      throw ApiError.notFound('race not found');
    }

    const result = { ...req.body, id: `result-${Date.now()}` };

    await db.collection('races').updateOne({ _id: race._id }, { $push: { results: result } });
    res.status(201).json(result);
  })
);

// Marks a racer as finished, records the corresponding result, and checks the time
// against the caller's personal best for that car model — spanning the `races`
// collection (the racer/result) and the `personalBests` collection (the record it may
// improve on) in one request instead of leaving the client to reconcile both.
app.post(
  '/api/races/:raceId/racers/:racerId/finish',
  authenticateRequest,
  asyncHandler(async (req, res) => {
    const db = await connect();
    const race = await findOwnedRace(db, req.params.raceId, req.auth.userId);
    if (!race) {
      throw ApiError.notFound('race not found');
    }

    const racer = findRacerInRace(race, req.params.racerId);
    if (!racer) {
      throw ApiError.notFound('racer not found on this race');
    }

    if (!canRacerFinish(racer)) {
      throw ApiError.conflict('racer has already finished this race');
    }

    const validation = validateFinishPayload(req.body);
    if (!validation.valid) {
      throw ApiError.badRequest('finish payload is invalid', validation.errors);
    }

    const { finishTimeMs } = validation.data;
    const finishedRacer = markRacerFinished(racer, finishTimeMs);
    const updatedRacers = race.racers.map((entry) => (entry.id === racer.id ? finishedRacer : entry));
    const result = {
      id: `result-${Date.now()}`,
      racerId: racer.id,
      position: nextRacePosition(race.results),
      finishTimeMs
    };

    const personalBestsCollection = db.collection(PERSONAL_BEST_COLLECTION_NAME);
    const existingBest = await personalBestsCollection.findOne({
      ownerId: req.auth.userId,
      carModelId: racer.carModelId
    });
    const { isNewPersonalBest, record } = resolvePersonalBest({
      existingBest,
      ownerId: req.auth.userId,
      carModelId: racer.carModelId,
      finishTimeMs
    });

    await db
      .collection('races')
      .updateOne({ _id: race._id }, { $set: { racers: updatedRacers }, $push: { results: result } });

    if (isNewPersonalBest) {
      await personalBestsCollection.updateOne(
        { ownerId: req.auth.userId, carModelId: racer.carModelId },
        { $set: record },
        { upsert: true }
      );
    }

    res.status(201).json({
      racer: finishedRacer,
      result,
      personalBest: { carModelId: racer.carModelId, finishTimeMs: record.finishTimeMs, isNewPersonalBest }
    });
  })
);

app.get(
  '/api/races/:raceId',
  authenticateRequest,
  asyncHandler(async (req, res) => {
    const db = await connect();
    const race = await findOwnedRace(db, req.params.raceId, req.auth.userId);
    if (!race) {
      throw ApiError.notFound('race not found');
    }

    res.json({
      id: race._id?.toString?.() ?? race.id,
      name: race.name,
      status: race.status,
      createdAt: race.createdAt,
      racers: race.racers ?? [],
      results: race.results ?? []
    });
  })
);

// Clones a race's racers into a fresh race for a rematch. Results aren't carried over
// since they belong to the run being repeated, not the new one.
app.post(
  '/api/races/:raceId/rematch',
  authenticateRequest,
  asyncHandler(async (req, res) => {
    const db = await connect();
    const race = await findOwnedRace(db, req.params.raceId, req.auth.userId);
    if (!race) {
      throw ApiError.notFound('race not found');
    }

    const validation = validateRematchSource(race);
    if (!validation.valid) {
      throw ApiError.badRequest('race cannot be rematched', validation.errors);
    }

    const rematch = buildRematchRace(race, req.auth.userId);
    const insertion = await db.collection('races').insertOne(rematch);
    res.status(201).json({ ...rematch, id: insertion.insertedId.toString() });
  })
);

app.use(notFoundHandler);
app.use(errorHandler);

const port = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Mongo-backed race API listening on http://127.0.0.1:${port}`);
  });
}

export default app;
