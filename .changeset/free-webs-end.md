---
'@rocket.chat/message-parser': major
---

Migrate PlainRun parser rule from PEG.js to TypeScript with incremental migration infrastructure. Establishes shared type contract (`ParseResult`, `ParserFunction`), grammar bridge utilities (`callTsParser`), and consolidated parser functions destination (`src/parser/grammar.ts`). Parser output remains bit-identical to original implementation.
