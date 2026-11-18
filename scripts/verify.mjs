import {abi} from 'genlayer-js'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {client, finalized, outcome} from './network.mjs'

const hash = text => createHash('sha256').update(text).digest('hex')
const methods = {
  "independent_rule_compilation": "compile",
  "premature_close": "close",
  "unauthorized_attestation": "attest",
  "cover_dual_queue_cut": "attest",
  "duplicate_attestation": "attest",
  "cover_routing_cut": "attest",
  "close_covered_review": "close"
}
const deployment = JSON.parse(readFileSync('deployment.json'))
const {transactions, finalState} = JSON.parse(readFileSync('evidence.json'))
assert.equal(await client.getChainId(),61999)
const deployed = await finalized(deployment.hash)
assert.equal(outcome(deployed,deployment.hash).execution,'SUCCESS')
assert.equal(deployed.to_address.toLowerCase(),deployment.address.toLowerCase())
for(const saved of transactions){
  const tx=await finalized(saved.hash)
  const record=outcome(tx,saved.hash)
  for(const field of ['status','execution','consensus','reason']) assert.deepEqual(record[field],saved[field])
  assert.equal(record.status,'FINALIZED')
  const call=abi.calldata.decode(Buffer.from(tx.data.calldata.base64,'base64'))
  assert.equal(call.get('method'),methods[saved.label])
  assert.equal(call.get('args')[0],'queue-resilience')
  assert.equal(tx.from_address.toLowerCase(),saved.signer)
  assert.equal(tx.to_address.toLowerCase(),deployment.address.toLowerCase())
}
const read=async (functionName,args)=>JSON.parse(await client.readContract({
  address:deployment.address,functionName,args,stateStatus:'finalized',
}))
const model=await read('review',['queue-resilience'])
assert.deepEqual(model,finalState)
assert.equal(model.state,'CLOSED')
assert.deepEqual(model.cuts,[3,4])
assert.deepEqual(model.uncovered,[])
const protectedMask=Object.keys(model.attestations).reduce((mask,i)=>mask|(1<<Number(i)),0)
assert(model.cuts.every(mask=>mask&protectedMask))
assert.equal(transactions.filter(row=>row.execution==='ERROR').length,3)
console.log(JSON.stringify({verifiedReceipts:transactions.length+1,model},null,2))
