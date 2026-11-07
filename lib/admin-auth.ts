import { env } from 'cloudflare:workers';
import { database } from './server-config';
const enc=new TextEncoder();
const hex=(a:ArrayBuffer)=>Array.from(new Uint8Array(a),b=>b.toString(16).padStart(2,'0')).join('');
export const sha256=async(s:string)=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
export function isLocal(request:Request){return ['127.0.0.1','localhost'].includes(new URL(request.url).hostname);}
export function sameOrigin(request:Request){
 const origin=request.headers.get('origin');
 const expected=isLocal(request)?new URL(request.url).origin:env.SITE_ORIGIN;
 return !!origin&&!!expected&&origin===expected;
}
function cookieName(request:Request){return isLocal(request)?'kyomei-admin-local':'__Host-kyomei-admin';}
function tokenFrom(request:Request){
 const key=cookieName(request)+'=';
 return (request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(key))?.slice(key.length)||'';
}
export async function isAdmin(request:Request){
 const token=tokenFrom(request);if(!/^[0-9a-f]{64}$/.test(token))return false;
 const row=await database().prepare('SELECT expires_at FROM admin_sessions WHERE token_hash=?').bind(await sha256(token)).first<{expires_at:number}>();
 return !!row&&row.expires_at>Date.now();
}
export async function verifyPassword(password:string){
 const saved=env.ADMIN_PASSWORD_HASH||'';const [kind,iterations,salt,expected]=saved.split('$');
 if(kind!=='pbkdf2'||!salt||!expected)return false;
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 const actual=hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:Number(iterations),hash:'SHA-256'},key,256));
 let mismatch=actual.length^expected.length;for(let i=0;i<actual.length;i++)mismatch|=actual.charCodeAt(i)^(expected.charCodeAt(i)||0);
 return mismatch===0;
}
export async function loginBucket(request:Request){
 const ip=request.headers.get('cf-connecting-ip')||(isLocal(request)?'loopback':'anonymous');
 return (await sha256(ip))+':'+Math.floor(Date.now()/900000);
}
export async function allowAttempt(bucket:string){
 const row=await database().prepare('INSERT INTO login_limits (bucket,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(bucket,Date.now()+900000).first<{attempts:number}>();
 return !!row&&row.attempts<=5;
}
export async function newSession(request:Request){
 const token=hex(crypto.getRandomValues(new Uint8Array(32)).buffer);const expiry=Date.now()+8*3600000;
 await database().batch([
  database().prepare('DELETE FROM admin_sessions WHERE expires_at < ?').bind(Date.now()),
  database().prepare('DELETE FROM login_limits WHERE expires_at < ?').bind(Date.now()),
  database().prepare('INSERT INTO admin_sessions(token_hash,expires_at) VALUES (?,?)').bind(await sha256(token),expiry),
 ]);
 return `${cookieName(request)}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${isLocal(request)?'':'; Secure'}`;
}
export async function endSession(request:Request){
 const token=tokenFrom(request);if(token)await database().prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await sha256(token)).run();
 return `${cookieName(request)}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${isLocal(request)?'':'; Secure'}`;
}
export function json(body:unknown,status=200,extra:HeadersInit={}){return Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});}
export async function body(request:Request,max=1000000){
 if(Number(request.headers.get('content-length')||0)>max)throw new Error('Слишком большой запрос.');
 const reader=request.body?.getReader();if(!reader)throw new Error('Пустой запрос.');
 const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new Error('Слишком большой запрос.');}chunks.push(value);}}
 finally{reader.releaseLock();}
 const joined=new Uint8Array(size);let offset=0;for(const part of chunks){joined.set(part,offset);offset+=part.byteLength;}
 return JSON.parse(new TextDecoder().decode(joined));
}
