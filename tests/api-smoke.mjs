import assert from 'node:assert/strict';
import readline from 'node:readline';
const origin=process.argv[2]||'http://127.0.0.1:8787';
const password=await new Promise(resolve=>{const rl=readline.createInterface({input:process.stdin,terminal:false});rl.once('line',line=>{rl.close();resolve(line);});});
let cookie='';
async function request(path,method='GET',value,custom={}){
 const r=await fetch(origin+path,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(value?{'Content-Type':'application/json'}:{}),...custom},body:value?JSON.stringify(value):undefined});
 const raw=await r.text();let data;try{data=JSON.parse(raw);}catch{data={error:raw};}return {status:r.status,data,cookie:r.headers.get('set-cookie')};
}
assert.equal((await request('/api/admin/config')).status,401);
assert.equal((await request('/api/admin/login','POST',{password:'incorrect-test-value'})).status,401);
assert.equal((await request('/api/admin/login','POST',{password},{Origin:'https://example.net'})).status,403);
const login=await request('/api/admin/login','POST',{password});assert.equal(login.status,200);assert.ok(login.cookie.includes('HttpOnly'));assert.ok(login.cookie.includes('SameSite=Strict'));if(origin.startsWith('https'))assert.ok(login.cookie.includes('Secure'));
cookie=login.cookie.split(';')[0];assert.equal((await request('/api/admin/session')).data.authenticated,true);
const before=(await request('/api/admin/config')).data;assert.equal(before.config.schemaVersion,2);assert.equal(before.baseline.config.schemaVersion,2);assert.ok(before.baseline.sourceVersion>0);
const change=structuredClone(before.config);change.formats[0].salesPlan.weekday['10-12']+=1;change.formats[0].check.averageCheck+=10;change.formats[0].check.foodCostPct+=1;change.formats[0].service.enabled=!change.formats[0].service.enabled;
const invalid=structuredClone(change);invalid.formats[0].capacityPerHour=-1;
assert.equal((await request('/api/admin/config','PUT',{config:invalid,version:before.version})).status,400);
const saved=await request('/api/admin/config','PUT',{config:change,version:before.version});assert.equal(saved.status,200);
try{
 const published=(await request('/api/config')).data;assert.equal(published.config.formats[0].salesPlan.weekday['10-12'],change.formats[0].salesPlan.weekday['10-12']);assert.deepEqual(published.config.formats[0].check,change.formats[0].check);assert.deepEqual(published.config.formats[0].service,change.formats[0].service);assert.deepEqual(published.baseline,before.baseline);assert.deepEqual(saved.data.baseline,before.baseline);
 assert.equal((await request('/api/admin/config','PUT',{config:change,version:before.version})).status,409);
}finally{const restored=await request('/api/admin/config','PUT',{config:before.config,version:saved.data.version});assert.equal(restored.status,200);}
assert.equal((await request('/api/admin/logout','POST',{})).status,200);
assert.equal((await request('/api/admin/config')).status,401);
console.log('PASS: public read, authentication, origin protection, secure session, validation, durable save, version conflict, restore, logout.');
