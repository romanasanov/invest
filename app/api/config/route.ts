import { readConfig } from '../../../lib/server-config';
import { json } from '../../../lib/admin-auth';
export const dynamic='force-dynamic';
export async function GET(){try{return json(await readConfig());}catch{return json({error:'Не удалось загрузить актуальный план. Повторите попытку.'},503);}}
