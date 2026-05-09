/* eslint-disable no-console */
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const COLLECTIONS = ['admin', 'customer', 'pilot', 'attendant'];
const DELETE_OLD_DOCS = true;

async function findUidForDoc(data) {
  if (data.authUid) {
    return data.authUid;
  }

  if (!data.email) {
    return null;
  }

  try {
    const user = await auth.getUserByEmail(data.email);
    return user.uid;
  } catch (error) {
    console.error(`Auth lookup failed for ${data.email}:`, error.message);
    return null;
  }
}

async function migrateCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();

  console.log(`\nCollection: ${collectionName}`);
  console.log(`Docs found: ${snapshot.size}`);

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const legacyDocId = docSnap.id;
    const authUid = await findUidForDoc(data);

    if (!authUid) {
      console.log(`- SKIP ${legacyDocId}: no auth UID and no valid email lookup`);
      continue;
    }

    const targetRef = db.collection(collectionName).doc(authUid);
    const targetSnap = await targetRef.get();

    const normalized = {
      ...data,
      authUid,
      email: data.email || '',
      type: data.type || collectionName
    };

    if (legacyDocId === authUid) {
      const needsPatch =
        data.authUid !== authUid ||
        data.type !== normalized.type ||
        data.email !== normalized.email;

      if (needsPatch) {
        await targetRef.set(normalized, { merge: true });
        console.log(`- PATCH ${collectionName}/${authUid}`);
      } else {
        console.log(`- OK ${collectionName}/${authUid}`);
      }
      continue;
    }

    await targetRef.set(
      targetSnap.exists
        ? { ...targetSnap.data(), ...normalized }
        : normalized,
      { merge: true }
    );

    console.log(`- MIGRATE ${collectionName}/${legacyDocId} -> ${collectionName}/${authUid}`);

    if (DELETE_OLD_DOCS) {
      await docSnap.ref.delete();
      console.log(`  deleted old doc ${legacyDocId}`);
    }
  }
}

async function main() {
  for (const collectionName of COLLECTIONS) {
    await migrateCollection(collectionName);
  }

  console.log('\nDone.');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
