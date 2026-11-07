import { randomBytes,pbkdf2Sync } from 'node:crypto';
import readline from 'node:readline';
const line=readline.createInterface({input:process.stdin,terminal:false});
line.once('line',password=>{const salt=randomBytes(16).toString('hex');const hash=pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');process.stdout.write(`pbkdf2$100000$${salt}$${hash}\n`);line.close();});
