import { seedClinicalGuidelines } from '../src/services/pinecone.js';

seedClinicalGuidelines()
  .then((r) => {
    console.log('Seeded clinical guidelines:', r);
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
