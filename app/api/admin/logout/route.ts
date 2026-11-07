import { json,sameOrigin,endSession } from '../../../../lib/admin-auth';
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Недопустимый источник запроса.'},403);
 return json({authenticated:false},200,{'Set-Cookie':await endSession(request)});
}
