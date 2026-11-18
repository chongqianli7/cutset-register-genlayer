# Cutset Register

[Deployed contract](https://explorer-studio.genlayer.com/address/0x188d401C0364C1708c2AD8eac45Db4120257EEad) · [Deployment receipt](https://explorer-studio.genlayer.com/transactions/0xd934345a3d093e5a8c1cac36a0b2e500b9bbe3d649da8b5d98405caf301e5dab)

A review primitive for software availability rules stated in plain language. It makes it possible for an owner and a separate reviewer to agree on which combinations of outages can cause a top-level failure, and to close a review only after a signed control covers every minimal combination.

For example, delivery fails when the routing table is unavailable, or when both primary and backup queues are unavailable. The minimal cut sets are `{routing}` and `{primary, backup}`. Protecting both queues still leaves routing uncovered. Coverage of routing plus either queue is sufficient under the declared rule.

## Consensus and state

Each validator independently compiles the bounded rule against the same immutable event catalog using the GenLayer LLM interface. Structured alternatives are normalized into bitmasks and supersets are removed. Two differently ordered or redundant outputs can agree only if they imply the same complete antichain. Conflicting logical meanings, invalid indices and unsupported compile results cannot create a case. The model performs interpretation. Deterministic code applies coverage and controls closure.

| Entry point | Policy |
| --- | --- |
| `compile(key, reviewer, events_json, rule)` | Anyone can open a fresh key with a different reviewer. The event catalog and compiled cuts are frozen. |
| `attest(key, index, evidence)` | Only the designated reviewer can add an evidence note for a prevention control that covers a currently uncovered cut. |
| `close(key)` | Only the owner may close after every cut has at least one protected event. |
| `review(key)` | Read JSON or an empty string if absent. Bit `i` denotes the event at index `i`. |

The bounded vocabulary supports 2–8 events and monotone combinations of AND and OR. Reviewer attestations are signed assertions. The contract does not test production controls, authenticate evidence notes, or estimate failure probability. A fully covered case is closed against the specified model. Create a new key if the model or reviewer changes.

## Run

Stable Studionet, chain 61999, RPC `https://studio.genlayer.com/api`. Requires Node.js 22+ and Python 3.

```sh
npm ci
npm test
node scripts/example.mjs my-unused-review-key
npm run verify
```

The live example uses distinct ephemeral owner and reviewer test wallets. It records successful compilation and cover/close writes and rejects premature close, unauthorized attestation and repeated coverage. Its control notes describe a test fixture. Local tests use a VM adapter to exercise mismatching interpretations and coverage. The read-only verifier checks the network receipts and finalized case. See [deployment.json](deployment.json) and [evidence.json](evidence.json). The deployment script records a new deployment only if deliberately run in a checkout without an existing deployment record.

MIT licensed.
