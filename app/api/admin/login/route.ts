import { body,json,sameOrigin,verifyPassword,loginBucket,allowAttempt,newSession } from '../../../../lib/admin-auth';
import { database } from '../../../../lib/server-config';
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Недопустимый источник запроса.'},403);
 try{
  const data=await body(request,1024);
  if(typeof data.password!=='string'||!data.password||data.password.length>200)return json({error:'Введите пароль.'},400);
  const bucket=await loginBucket(request);
  if(!await allowAttempt(bucket))return json({error:'Слишком много попыток. Попробуйте через 15 минут.'},429,{'Retry-After':'900'});
  if(!await verifyPassword(data.password))return json({error:'Неверный пароль.'},401);
  await database().prepare('DELETE FROM login_limits WHERE bucket=?').bind(bucket).run();
  return json({authenticated:true},200,{'Set-Cookie':await newSession(request)});
 }catch{return json({error:'Вход временно недоступен. Попробуйте позже.'},503);}
}
