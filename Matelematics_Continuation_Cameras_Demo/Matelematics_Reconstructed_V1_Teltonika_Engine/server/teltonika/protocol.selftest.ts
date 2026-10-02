import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { Socket } from "node:net";
import { attachTeltonikaProtocol } from "./protocol";
import { registerDevice } from "./registry";
import { crc16Ibm } from "./crc16";
function u8(value: number) {
  return Buffer.from([value & 0xff]);
}

function u16(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value, 0);
  return buffer;
}

function i16(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeInt16BE(value, 0);
  return buffer;
}

function i32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(value, 0);
  return buffer;
}

function u64(value: bigint) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(value, 0);
  return buffer;
}

function packet(data: Buffer) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(0, 0);
  header.writeUInt32BE(data.length, 4);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc16Ibm(data), 0);

  return Buffer.concat([header, data, crc]);
}

function gps() {
  return Buffer.concat([
    i32(-75_898_432),
    i32(335_731_100),
    i16(-12),
    u16(90),
    u8(10),
    u16(42),
  ]);
}

function buildCodec8Packet() {
  const record = Buffer.concat([
    u64(1_700_000_000_000n),
    u8(0),
    gps(),
    u8(239),
    u8(1),

    // N1.
    u8(1),
    u8(239),
    u8(1),

    // N2, N4, N8.
    u8(0),
    u8(0),
    u8(0),
  ]);

  const data = Buffer.concat([
    u8(0x08),
    u8(1),
    record,
    u8(1),
  ]);

  return packet(data);
}


class TestSocket extends EventEmitter {
 destroyed=false;
 writes: Buffer[]=[];
 timeout=0;
 onTimeout: (()=>void)|undefined;
 pauses=0;
 resumes=0;
 setTimeout(ms:number,callback:()=>void){this.timeout=ms;this.onTimeout=callback;return this;}
 pause(){this.pauses++;return this;}
 resume(){this.resumes++;return this;}
 write(data:Buffer){this.writes.push(Buffer.from(data));return true;}
 destroy(_error?:Error){this.destroyed=true;this.emit("close");return this;}
}
const imei="990000000099991";
registerDevice({imei,clientId:"protocol-test-company",vehicleId:"protocol-test-vehicle",label:"Protocol test"});
const handshake=Buffer.concat([Buffer.from([0,imei.length]),Buffer.from(imei)]);
const frame=buildCodec8Packet();
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
function gate(){let release!:()=>void;const promise=new Promise<void>(r=>{release=r;});return {promise,release};}
async function authenticated(handler:()=>void|Promise<void>) {
 const socket=new TestSocket();
 attachTeltonikaProtocol(socket as unknown as Socket,handler,{}, {idleTimeoutMs:5000});
 socket.emit("data",handshake.subarray(0,3));
 await tick(); assert.equal(socket.writes.length,0);
 socket.emit("data",handshake.subarray(3));
 await tick(); assert.deepEqual(socket.writes,[Buffer.from([1])]);
 return socket;
}
async function main(){
 const first=gate(),second=gate();let calls=0,active=0,maxActive=0;
 const socket=await authenticated(async()=>{
  const index=++calls; active++;maxActive=Math.max(maxActive,active);
  await (index===1 ? first.promise : second.promise);active--;
 });
 socket.emit("data",frame);
 await tick();assert.equal(calls,1);assert.equal(socket.writes.length,1);
 // Simulate an already queued data event despite pause(): must not reenter.
 socket.emit("data",frame);
 await tick();assert.equal(calls,1);
 first.release();await tick();
 assert.equal(calls,2);assert.equal(maxActive,1);
 assert.equal(socket.writes.length,2);assert.equal(socket.writes[1].readUInt32BE(),1);
 second.release();await tick();
 assert.equal(socket.writes.length,3);assert.equal(socket.writes[2].readUInt32BE(),1);
 assert.equal(maxActive,1);assert.ok(socket.resumes>0);socket.destroy();
 console.log("PASS: fragmented login, queued frames serialized, ACK after each persistence");

 const failed=await authenticated(async()=>{throw new Error("Injected persistence failure");});
 failed.emit("data",frame);await tick();
 assert.ok(failed.destroyed);assert.equal(failed.writes.length,1);
 console.log("PASS: persistence failure closes connection without AVL ACK");

 const pending=gate();
 const closed=await authenticated(()=>pending.promise);
 closed.emit("data",frame);await tick();closed.destroy();pending.release();await tick();
 assert.equal(closed.writes.length,1);
 console.log("PASS: connection closed during persistence receives no late ACK");

 const overflow=await authenticated(()=>{});
 overflow.emit("data",Buffer.alloc(2*1024*1024+1));
 await tick();assert.ok(overflow.destroyed);assert.equal(overflow.writes.length,1);
 console.log("PASS: oversized receive buffer rejected before concatenation");

 const idle=await authenticated(()=>{});
 assert.equal(idle.timeout,5000);idle.onTimeout!();assert.ok(idle.destroyed);
 console.log("PASS: configured socket inactivity callback closes connection");
 console.log("TELTONIKA PROTOCOL SERIALIZATION AND ACK SELF-TEST PASS; synthetic sockets, no DB/network");
}
main().catch(()=>{console.error("Teltonika protocol self-test FAIL");process.exitCode=1;});
