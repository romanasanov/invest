import { json,isAdmin,sameOrigin,body } from '../../../../lib/admin-auth';
import { readConfig,saveConfig } from '../../../../lib/server-config';
import { validateConfig } from '../../../../lib/config-validation';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{if(!await isAdmin(request))return json({error:'Войдите в редактор.'},401);return json(await readConfig());}
 catch{return json({error:'Хранилище временно недоступно.'},503);}
}
export async function PUT(request:Request){
 if(!sameOrigin(request))return json({error:'Недопустимый источник запроса.'},403);
 try{
  if(!await isAdmin(request))return json({error:'Сессия закончилась. Войдите снова.'},401);
  const input=await body(request);let config;
  try{config=validateConfig(input.config);}catch(e){return json({error:e instanceof Error?e.message:'Проверьте настройки.'},400);}
  if(!Number.isInteger(input.version)||input.version<0)return json({error:'Некорректная версия настроек.'},400);
  const saved=await saveConfig(config,input.version);
  if(!saved)return json({error:'Настройки изменились в другом окне. Экспортируйте свой черновик и загрузите актуальную версию.'},409);
  return json(saved);
 }catch{return json({error:'Не удалось сохранить. Изменения остались в редакторе.'},503);}
}
