import assert from 'node:assert/strict'
import {createAccount} from 'genlayer-js'
import {session} from './session.mjs'
const {read,send,finish}=session()
const owner=createAccount()
const reviewer=createAccount()
const key=process.argv[2]
assert(key && !key.startsWith('--'),'Supply an unused review key.')
assert.equal(await read('review',[key]),null)
const events=['primary queue unavailable','backup queue unavailable','routing table unavailable']
const rule='Delivery fails if the routing table is unavailable, or if both the primary queue and the backup queue are unavailable.'
await send('independent_rule_compilation','compile',[key,reviewer.address.toLowerCase(),JSON.stringify(events),rule],owner)
assert.deepEqual((await read('review',[key])).cuts,[3,4])
await send('premature_close','close',[key],owner,'ERROR')
await send('unauthorized_attestation','attest',[key,0,'unauthorized test note'],owner,'ERROR')
await send('cover_dual_queue_cut','attest',[key,0,'Fixture QA-01: primary queue failover control reviewed'],reviewer)
assert.deepEqual((await read('review',[key])).uncovered,[4])
await send('duplicate_attestation','attest',[key,0,'Fixture QA-01: repeated attestation'],reviewer,'ERROR')
await send('cover_routing_cut','attest',[key,2,'Fixture RT-02: routing cache fallback control reviewed'],reviewer)
await send('close_covered_review','close',[key],owner)
const result=await read('review',[key])
assert.equal(result.state,'CLOSED')
assert.deepEqual(result.uncovered,[])
assert.equal(Object.keys(result.attestations).length,2)
finish(result)
