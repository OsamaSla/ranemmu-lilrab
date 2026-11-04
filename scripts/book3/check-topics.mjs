import fs from 'fs';

const index = JSON.parse(fs.readFileSync('assets/hymns/index.json', 'utf8'));
const b3 = index.filter((h) => h.book === 'book3');

const TOPICS = ['worship', 'cross', 'comfort', 'repentance', 'fellowship', 'warfare', 'word', 'eternity', 'church'];
const primary = Object.fromEntries(TOPICS.map((t) => [t, 0]));
const anyTag = Object.fromEntries(TOPICS.map((t) => [t, 0]));
for (const h of b3) {
  if (h.primaryTopic) primary[h.primaryTopic] += 1;
  const all = new Set([...(h.primaryTopic ? [h.primaryTopic] : []), ...(h.topics ?? [])]);
  for (const t of all) anyTag[t] += 1;
}

console.log('book3 summaries:', b3.length, '| tagged:', b3.filter((h) => h.primaryTopic).length, '| untagged:', b3.filter((h) => !h.primaryTopic).length);
console.log('\nprimary counts:');
for (const t of TOPICS) console.log('  ' + t.padEnd(12), primary[t]);
console.log('\nprimary+secondary counts:');
for (const t of TOPICS) console.log('  ' + t.padEnd(12), anyTag[t]);

const sample = b3.find((h) => h.number === 1);
console.log('\nsample hymn 1:', sample.id, '|', sample.title, '| primary:', sample.primaryTopic, '| topics:', sample.topics);
