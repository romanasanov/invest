import { json,isAdmin } from '../../../../lib/admin-auth';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return json({authenticated:await isAdmin(request)});}catch{return json({authenticated:false});}}
