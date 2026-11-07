from pathlib import Path
import json,re,hashlib,html,datetime,os
ROOT=Path(__file__).parent
PDF='Последнее основное меню: kiomei-main-A4-revised (1).pdf'
WEB='Официальное меню https://kyomei.ru/menu/, проверено 2026-10-31'
OLD='Локальное учебное меню kyomeibistro_site/mat/menu-full.html; дополнительная позиция, актуальность требует подтверждения'
USER='Сценарий формата из задания пользователя; порция/цена не является исходной позицией бистро'
periods=['10-12','12-16','16-20','20-23']
cat=[];meta={}
fc={'ramen':34,'burger':35,'roti':30,'grill':36,'snacks':29,'salad':30,'sushi':38,'rolls':36,'onigiri':34,'dessert':29,'sets':35,'coffee':22,'tea':14,'matcha':26,'lemonade':20,'bottled':52,'alcohol':32,'breakfast':31,'combo':34}
pack={'ramen':42,'burger':22,'roti':24,'grill':30,'snacks':18,'salad':22,'sushi':24,'rolls':26,'onigiri':12,'dessert':15,'sets':65,'coffee':13,'tea':13,'matcha':15,'lemonade':14,'bottled':0,'alcohol':0,'breakfast':28,'combo':38}
def add(id,name,category,price,source=PDF,status='menu',cost=None,packing=None,**m):
 assert id not in meta,id
 d=dict(id=id,name=name,category=category,icon=category,basePrice=price,foodCostPct=fc.get(category,32) if cost is None else cost,packagingCost=pack.get(category,20) if packing is None else packing,source=source,status=status)
 cat.append(d);meta[id]=dict(m);return id
# Complete printed PDF: all 49 dishes/sets; prices take priority over all older sources.
for id,name,p in [('kimchi','Кимчи рамен',590),('curry','Карри рамен',590),('tom-yum','Том ям рамен',680),('cheese-tom-yum','Сырный том ям рамен',750),('miso-salmon','Мисо рамен с лососем',720),('preacher','Preacher Рамен',1490)]:add('ramen-'+id,name,'ramen',p,pdf=True)
for id,name,p in [('seafood-rice','Рис с морепродуктами',770),('seafood-noodles','Лапша с морепродуктами',770),('beef-rice','Рис с говядиной',780),('beef-noodles','Лапша с говядиной',780),('beef-curry-rice','Говядина в овощном соусе карри с рисом',790),('shrimp-mango','Креветки манго чили',890),('shrimp-pesto','Креветки в сливочном соусе с песто',890),('steak','Стейк на японском гриле',1390)]:add(id,name,'grill',p,pdf=True)
add('burger-beef-aioli','Бургер с говядиной, сыром и айоли','burger',690,pdf=True)
add('burger-golden-preacher','Золотой бургер Preacher','burger',990,pdf=True)
for id,name,p in [('beef','Роти таракеру с говядиной',590),('cheese','Роти с сыром',390),('cheese-nori','Роти с сыром и нори',390),('eel-mozzarella','Роти с угрём и моцареллой',720)]:add('roti-'+id,name,'roti',p,pdf=True)
add('sashimi-tartare-assortment','Ассорти сашими и тартаров','sushi',2200,pdf=True)
add('spinach-tuna-salad','Салат из шпината с опалённым тунцом','salad',620,pdf=True)
add('onigiri-preacher','Preacher Онигири — лосось и красная икра','onigiri',590,pdf=True)
add('onigiri-tuna','Онигири с тунцом','onigiri',390,pdf=True)
add('kimchi-cabbage','Капуста кимчи','snacks',250,pdf=True)
add('nachos-tabajan','Начос с табадзян','snacks',200,pdf=True)
add('mochi','Моти','dessert',300,pdf=True)
add('custard-ring','Заварное кольцо с творожным кремом','dessert',490,pdf=True)
add('ice-cream','Мороженое','dessert',180,pdf=True)
rolls=[('philadelphia','Филадельфия',990),('philadelphia-tuna','Филадельфия с тунцом',720),('philadelphia-roe','Филадельфия с икрой',1190),('tataki-salmon-passionfruit','Татаки с лососем и маракуйей',1050),('ebi-california','Эби калифорния с креветкой',740),('ebi-hosomaki','Эби хосомаки с креветкой',690),('tuna-hosomaki','Туна хосомаки с тунцом',690),('tuna-cheese-roe','Ролл с тунцом, сыром и икрой',690),('scallop-shrimp','Ролл с гребешком и креветкой',840),('baked-tuna','Запечённый ролл с тунцом и сливочным сыром',650),('baked-shrimp','Запечённый ролл с креветкой и спайси соусом',670),('baked-eel','Запечённый ролл с угрём и моцареллой',740)]
for id,n,p in rolls:add('roll-'+id,n,'rolls',p,pdf=True)
for id,n,p in [('salmon-slices','Нарезка лосося',690),('tuna-slices','Нарезка тунца',590),('kaisendon','Кайсендон',890),('gunkan-salmon','Гунканы с лососем',390),('gunkan-tuna','Гунканы с тунцом',360)]:add(id,n,'sushi',p,pdf=True)
for id,n,p in [('koi','KOI — Страстная любовь',4200),('futari','FUTARI — Вечер вдвоём',3100),('shinmi','SHINMI — Глубина вкуса',4900)]:add('set-'+id,n,'sets',p,pdf=True)
assert len(cat)==49,len(cat)
# Official online beverage section fills the PDF's absent drinks, not overwriting food prices.
for id,n,c,p in [
('matcha-iced','Кио айс матча','matcha',300),('matcha-latte','Кио матча латте','matcha',300),('matcha-tonic','Кио матча тоник','matcha',300),
('lemonade-mandarin','Мандарин, кактус, бамбук','lemonade',370),('lemonade-cherry','Цветы вишни, яблоко, саган-дайля','lemonade',370),('lemonade-grape','Виноград, киви, бобы тонка','lemonade',370),('lemonade-mango','Манго, маракуйя, каламанси','lemonade',370),
('tea-buckwheat','Чай Гречиха с вишней / Гречишный чай','tea',390),('tea-linden','Чай Зелёный с липой / Японская липа','tea',390),('tea-alpine','Чай Альпийский луг','tea',390),('tea-oolong','Чай Зелёный / Молочный улун','tea',390),('tea-puer','Чай Красный крепкий / Пуэр Ча','tea',390),('tea-assam','Чай Красный / Ассам','tea',390),
('mulled-wine','Глинтвейн','alcohol',600),('espresso','Эспрессо','coffee',200),('americano','Американо','coffee',200),('latte','Латте','coffee',300),('iced-latte','Айс латте','coffee',300),('cappuccino','Капучино','coffee',300),('flat-white','Флэт уайт','coffee',300),('raf','Раф','coffee',300)]:add(id,n,c,p,WEB,official=True)
# Additional documented items from the complete local training catalog. No invented food.
# Alias mapping prevents an older synonym/price from duplicating an item in the latest PDF/site.
aliases=['Кари рамен','Ким чи рамен','Том ям рамен','Роти таракеру','Чизу нори роти','Ким чи','Ким чи с капустой','Онигири с тунцом','Икура филадельфия','Кайсендон','Магуро сашими','Магуро спайси','Сякэ гункан','Туна хосомаки','Филадельфия','Хотатэ эби спайси','Чизу Икура туна','Эби калифорния','Эби хосомаки','Лосось Масу','Говядина кари с рисом','Говядина тэппаньяки','Говядина теппаньяки','Лапша с говядиной','Лапша с морепродуктами','Рис с говядиной','Эби манго чили','Чизу роти','Мороженое','Моти','Магуро сашими массу соус','Сяке гункан спайси','Калифорния с креветкой','Американо','Капучино','Айс латте','Кио айс матча','Кио матча латте','Кио матча тоник','Латте','Молочный улун','Пуэр ча','Раф','Флэт уайт','Эспрессо','Японская липа','Начос с айоли и табаздян']
def norm(t):return re.sub(r'\s+',' ',t.lower().replace('ё','е')).strip()
known={norm(x) for x in aliases+[c['name'] for c in cat]}
legacy_source=Path(os.environ.get('KYOMEI_MENU_HTML', 'menu-full.html'))
if legacy_source.exists():
 text=legacy_source.read_text()
else:
 cached=json.loads((ROOT/'local-menu-index.json').read_text())
 text=''.join('<div class="sec">'+r['section']+'</div><div class="dish"><span class="n">'+r['name']+'</span><span class="p">'+(str(r['price'])+' ₽' if r['price'] else '—')+'</span></div>' for r in cached)
legacy_rows=[]
for section in re.split(r'<div class="sec">',text)[1:]:
 title=section.split('</div>',1)[0]
 for raw,price in re.findall(r'<div class="dish"><span class="n">(.*?)</span><span class="p">(.*?)</span>',section,re.S):
  name=html.unescape(re.sub(r'<small>.*?</small>','',raw).strip());p=int(''.join(re.findall(r'\d',price)) or 0)
  legacy_rows.append(dict(section=title,name=name,price=p or None))
  if norm(name) in known:continue
  known.add(norm(name))
  if 'Сет FUTARI' in title or 'Сет KOI' in title or 'Сет SHINMI' in title:
   # Set component descriptions are not separately confirmed sellable SKUs.
   continue
  if any(w in title for w in ['Вино','Саке','Tequila','Whisky']): c='alcohol'
  elif any(w in name.lower() for w in ['tsingtao','back wood','маркус','вино','amami','hikari','ichigo','momoji','yawaraka','yugen']):c='bottled' if 'zero' in name.lower() else 'alcohol'
  elif 'Б/А' in title:c='bottled'
  elif 'Чай и кофе' in title or name.startswith('Чай'):c='tea'
  elif 'Напитки' in title:c='lemonade'
  elif 'Рамены' in title:c='ramen'
  elif 'Суши' in title:c='rolls'
  elif 'Салаты' in title:c='salad'
  elif 'Десерты' in title:c='dessert'
  elif 'Закуски' in title:c='snacks'
  else:c='grill'
  if name=='Роти с бананом':c='roti'
  if name=='Унадзю':c='grill'
  id='legacy-'+hashlib.sha1(name.encode()).hexdigest()[:10]
  if name=='Роти с бананом':id='roti-banana'
  add(id,name,c,p,OLD+('; цена в источнике не указана, 0 = требуется задать цену перед включением' if not p else ''),legacy=True,unknown_price=not bool(p))
(ROOT/'local-menu-index.json').write_text(json.dumps(legacy_rows,ensure_ascii=False,indent=2)+'\n')
# User-authorized portion variants; a variant is one sold menu unit.
for base in [c for c in list(cat) if c['id'].startswith('ramen-') and meta[c['id']].get('pdf')]:
 for size,label,price in [('lunch','ланч-порция',390),('full','полная порция',590)]:
  cost=({'ramen-preacher':65,'ramen-miso-salmon':47,'ramen-cheese-tom-yum':43,'ramen-tom-yum':41}.get(base['id'],35)+(2 if size=='full' else 0))
  add('format-'+base['id']+'-'+size,base['name']+' — '+label,'ramen',price,USER,'format',cost=cost,packing=42,format='ramen')
add('format-burger-standard','Бургер — стандарт, 1 котлета','burger',390,USER,'format',cost=34,format='ramen')
add('format-burger-double','Бургер — двойной, 2 котлеты','burger',590,USER,'format',cost=39,format='ramen')
for base in [c for c in list(cat) if c['category']=='roti' and meta[c['id']].get('pdf')]:
 for size,label,p in [('quarter','четверть',190),('half','половина',290),('whole','целый',490)]:
  add('format-'+base['id']+'-'+size,base['name']+' — '+label,'roti',p,USER,'format',cost=(40 if 'eel' in base['id'] else 30)+(0 if size=='quarter' else 2),packing=18 if size=='quarter' else 24,format='ramen')
for id,n,c,p,cost,packing in [('coffee-250','Кофе на розлив — 250 мл','coffee',150,22,13),('coffee-350','Кофе на розлив — 350 мл','coffee',290,17,15),('tea-250','Чай на розлив — 250 мл','tea',150,13,13),('tea-350','Чай на розлив — 350 мл','tea',290,10,15),('water-bottle','Вода в бутылке','bottled',290,38,0),('asian-soda-1','Азиатская газировка — вид 1','bottled',290,52,0),('asian-soda-2','Азиатская газировка — вид 2','bottled',290,52,0),('asian-soda-3','Азиатская газировка — вид 3','bottled',290,52,0),('mochi-standard','Моти — стандартный','dessert',150,40,12),('mochi-double','Моти — двойной','dessert',250,45,15)]:add('format-'+id,n,c,p,USER+('; конкретный SKU напитка ещё не выбран' if 'soda' in id else ''),'format',cost=cost,packing=packing,format='shared')
# Breakfast and sets are explicit proposals, not claims about the current bistro menu.
for id,n,c,p,cost,f in [('banana-breakfast','Завтрак: роти с бананом + кофе','breakfast',390,34,'shared'),('ramen-roti-set','Сет: ланч-рамен + четверть роти + напиток','combo',590,37,'ramen'),('ramen-burger-set','Сет: ланч-рамен + стандартный бургер + напиток','combo',790,39,'ramen'),('ramen-all-set','Сет: ланч-рамен + бургер + четверть роти + напиток','combo',990,40,'ramen'),('sushi-onigiri-set','Сет: 2 онигири + напиток','combo',790,38,'sushi'),('sushi-roll-set','Сет: ролл + 2 гункана + напиток','combo',1090,39,'sushi'),('sushi-family-set','Сет: 2 ролла + 2 онигири + 2 напитка','combo',1790,40,'sushi'),('matcha-mochi-combo','Комбо: Кио матча латте + моти','combo',390,34,'matcha'),('coffee-ring-combo','Комбо: американо + заварное кольцо','combo',590,31,'matcha')]:add('format-'+id,n,c,p,'Предложение для оценки: '+n+'; цена, состав и фудкост — редактируемые допущения; напиток учтён в фудкосте','format',cost=cost,format=f)
# Existing banana roti has no published price: a separately labelled proposal is used, legacy remains disabled.
add('format-banana-roti','Роти с бананом — предложение формата','roti',290,'Роти с бананом подтверждён в локальном меню; 290 ₽ — редактируемое допущение, цена в источнике отсутствует','format',cost=29,format='matcha')
# Weights are normalized to 100 across enabled menu rows. At each period the engine normalizes over available rows.
def normalize(ws):
 total=sum(ws.values());out={k:round(v/total*100,3) for k,v in ws.items()}
 if out:out[next(iter(out))]+=round(100-sum(out.values()),3)
 return out
bistro={c['id']:({'ramen':5,'burger':3,'grill':2.4,'roti':3,'onigiri':2.5,'snacks':1.5,'salad':2,'dessert':3,'rolls':2.6,'sushi':2,'sets':0.25,'coffee':2.5,'tea':1.2,'matcha':2.8,'lemonade':2,'alcohol':0.4}.get(c['category'],1)) for c in cat if meta[c['id']].get('pdf') or meta[c['id']].get('official')}
ramen={c['id']:(2 if c['id'].endswith('-lunch') else 3) for c in cat if c['id'].startswith('format-ramen-') and meta[c['id']].get('format')=='ramen' and c['category']=='ramen'}
ramen.update({'format-burger-standard':7,'format-burger-double':5,'format-roti-beef-quarter':3,'format-roti-beef-half':3,'format-roti-beef-whole':4,'format-roti-cheese-quarter':2,'format-roti-cheese-half':2,'format-roti-cheese-whole':3,'format-roti-cheese-nori-quarter':1,'format-roti-cheese-nori-half':1,'format-roti-cheese-nori-whole':2,'format-roti-eel-mozzarella-quarter':1,'format-roti-eel-mozzarella-half':1,'format-roti-eel-mozzarella-whole':2,'format-mochi-standard':3,'format-mochi-double':1,'format-coffee-250':2,'format-tea-250':2,'format-water-bottle':2,'format-asian-soda-1':1,'format-asian-soda-2':1,'format-asian-soda-3':1,'format-banana-breakfast':5,'format-ramen-roti-set':4,'format-ramen-burger-set':3,'format-ramen-all-set':2})
sushi={'onigiri-tuna':16,'onigiri-preacher':9,'roll-philadelphia':9,'roll-ebi-california':8,'roll-tuna-hosomaki':7,'roll-ebi-hosomaki':7,'gunkan-salmon':6,'gunkan-tuna':5,'format-mochi-standard':5,'format-sushi-onigiri-set':9,'format-sushi-roll-set':7,'format-sushi-family-set':4,'format-water-bottle':3,'format-asian-soda-1':3,'format-asian-soda-2':2}
matcha={'matcha-iced':10,'matcha-latte':15,'matcha-tonic':6,'americano':7,'cappuccino':12,'latte':8,'flat-white':5,'tea-linden':3,'format-banana-roti':7,'mochi':8,'custard-ring':5,'ice-cream':2,'format-banana-breakfast':5,'format-matcha-mochi-combo':5,'format-coffee-ring-combo':2}
plans={'bistro':{'weekday':[10,42,38,24],'weekend':[22,56,52,34]},'ramen':{'weekday':[12,56,42,22],'weekend':[16,62,48,28]},'sushi':{'weekday':[8,36,36,20],'weekend':[12,46,44,26]},'matcha':{'weekday':[30,44,38,16],'weekend':[34,54,46,20]}}
expenses={
'bistro':[('rent','Аренда',500000),('kitchen-payroll','Кухня: 4 позиции одновременно, покрытие 13 ч × 30 дней',702000),('service-payroll','Зал и касса: 3 позиции одновременно, покрытие 13 ч × 30 дней',409500),('management','Управление и администрирование',160000),('utilities','Коммунальные расходы',90000),('marketing','Маркетинг',100000),('it','IT, связь и сервисы',45000),('cleaning','Уборка, стирка, расходники',60000),('maintenance','Ремонт, обслуживание, резерв',55000)],
'ramen':[('rent','Аренда',300000),('kitchen-payroll','Кухня: 3 повара в смене, включая раздачу; 13 ч × 30 дней',468000),('cashier-payroll','Кассир: 1 позиция; покрытие 13 ч × 30 дней',117000),('management','Доля управления и администрирования',90000),('utilities','Коммунальные расходы',45000),('marketing','Маркетинг',60000),('it','IT, кассы, приложение и связь',35000),('cleaning','Уборка и расходники',30000),('maintenance','Обслуживание и резерв',25000)],
'sushi':[('rent','Аренда',300000),('kitchen-payroll','Кухня: 2 повара, включая выдачу; 13 ч × 30 дней',327600),('cashier-payroll','Кассир: 1 позиция; 13 ч × 30 дней',117000),('management','Доля управления и администрирования',60000),('utilities','Коммунальные расходы',40000),('marketing','Маркетинг',55000),('it','IT, кассы, приложение и связь',35000),('cleaning','Уборка и расходники',28000),('maintenance','Обслуживание и резерв',25000)],
'matcha':[('rent','Аренда',300000),('barista-payroll','Бариста и касса: 2 позиции; 13 ч × 30 дней',273000),('kitchen-payroll','Приготовление и выдача: 1 позиция; 13 ч × 30 дней',148200),('management','Доля управления и администрирования',60000),('utilities','Коммунальные расходы',35000),('marketing','Маркетинг',50000),('it','IT, кассы, приложение и связь',30000),('cleaning','Уборка и расходники',25000),('maintenance','Обслуживание и резерв',22000)]}
plans={f:{d:[round(v*0.45) for v in vals] for d,vals in days.items()} for f,days in plans.items()}
formats=[]
for f,weights,cap in [('bistro',bistro,80),('ramen',ramen,80),('sushi',sushi,65),('matcha',matcha,85)]:
 weights=normalize(weights)
 rows=[]
 for c in cat:
  id=c['id'];active=id in weights
  rows.append(dict(itemId=id,enabled=active,price=c['basePrice'],foodCostPct=c['foodCostPct'],packagingCost=c['packagingCost'],weight=weights.get(id,0),periods=['10-12'] if id=='format-banana-breakfast' else periods))
 formats.append(dict(id=f,menu=rows,salesPlan={d:dict(zip(periods,v)) for d,v in plans[f].items()},capacityPerHour=cap,expenses=[dict(id=i,label=l,amount=a) for i,l,a in expenses[f]],variable=dict(acquiringPct=2.2,taxPct=6,otherPct=1,includedPerSaleCost=0),calendar=dict(weekdayDays=22,weekendDays=8),investment=dict(capital=13000000 if f=='bistro' else 7000000,sharePct=50,fixedAnnualPct=24)))
config=dict(schemaVersion=1,updatedAt='2026-10-31T23:00:00+03:00',catalog=cat,formats=formats)
(ROOT/'default-config.json').write_text(json.dumps(config,ensure_ascii=False,indent=2)+'\n')
print('catalog',len(cat),'PDF',sum(m.get('pdf',False) for m in meta.values()),'official',sum(m.get('official',False) for m in meta.values()),'legacy',sum(m.get('legacy',False) for m in meta.values()))
for f in formats:print(f['id'],'enabled',sum(x['enabled'] for x in f['menu']),'weight',sum(x['weight'] for x in f['menu']),'fixed',sum(x['amount'] for x in f['expenses']))
for f in formats:
 assert len(f['menu'])==len(cat)
 assert {r['itemId'] for r in f['menu']}=={c['id'] for c in cat}
 assert all(r['price']>0 for r in f['menu'] if r['enabled'])
 assert abs(sum(r['weight'] for r in f['menu'])-100)<0.001
assert len({c['id'] for c in cat})==len(cat)
# Human-readable provenance, including each actual source title/name and every default assumption.
lines=['КИОМЕЙ — происхождение каталога и редактируемые допущения','Проверено 31 октября 2026.','',
'ИСТОЧНИКИ',f'1. kiomei-main-A4-revised (1).pdf — обе страницы просмотрены, все 49 позиций включены без пропусков; цены приоритетные.',
'2. https://kyomei.ru/menu/ — официальный раздел напитков: 21 позиция; реальные Кио айс матча / матча латте / матча тоник по 300 ₽.',
'3. kyomeibistro_site/mat/menu-full.html — полный учебный каталог, дополнительный источник напитков и продуктов. Старые синонимы актуальных блюд сведены к PDF. Составные части сетов не заведены как новые самостоятельные продажи. Полная извлечённая ведомость сохранена в local-menu-index.json.',
'4. Текущая переписка — порции и цены формата: рамены 390/590, бургер 390/590, роти 190/290/490; розлив 150/290 за 250/350 мл; моти 150/250; бутылки и банки 290; завтрак роти с бананом + кофе.',
'', 'КАК ЧИТАТЬ КАТАЛОГ',
'category и icon — slug категории, фотографии к отдельным строкам меню не привязаны. status=menu означает документированную позицию; статус сам по себе не подтверждает её актуальность (см. source). status=format — порционный вариант или предложенный набор. Каждый формат содержит ВСЕ itemId каталога; enabled задаёт выбранную матрицу.',
'Бистро по умолчанию: все 49 блюд/сетов PDF и 21 напиток официального меню. Дополнительные позиции учебного меню по умолчанию выключены. basePrice=0 только там, где в источнике нет цены; это технический признак «цена не указана», НЕ бесплатная позиция. Все такие строки выключены. Перед включением требуется задать цену.',
'Историческое слово «Кио» в названиях трёх напитков сохранено как фактическое название продукта из действующего меню, а не как отдельный бренд.',
'В точке рамена 6 вкусов × 2 размера, 4 роти × 3 размера и 2 бургера — раздельные расчётные строки порций, а не новые выдуманные рецепты. Разные размеры не надо интерпретировать как разные карточки ассортимента.',
'Точка матча: только реальные позиции, подтверждённые меню. Роти с бананом подтверждён локальным меню, но его цена отсутствует; отдельный вариант format-banana-roti имеет 290 ₽ как допущение. Мелонпан и иные изделия только из референсов не добавлены.',
'', 'ДОПУЩЕНИЯ МОДЕЛИ — НЕ ФАКТЫ ДЕЙСТВУЮЩЕГО БИСТРО',
'Одна продажа = одна реализованная позиция: блюдо, порция, набор либо напиток. Это не чек и не количество гостей. Для набора его вложенные блюда не считаются отдельными продажами.',
'Все foodCostPct, packagingCost, веса, планы продаж, capacityPerHour и расходы кроме заданной аренды — редактируемые стартовые допущения; они не взяты из техкарт или фактического P&L.',
'foodCostPct — доля цены в модели; стоимость включённого базового напитка заложена в foodCostPct порционных блюд/наборов. includedPerSaleCost=0 предотвращает двойной учёт подарочного напитка. Подарки по количеству блюд в одном чеке и вечерние акции требуют сценарных данных о чеках; текущая упрощённая модель не выдаёт их за точную механику.',
'Упаковка — отдельная стоимость за проданную позицию, условно вся продажа с упаковкой. Доля зала отдельно не моделируется. У наборов упаковка суммарная.',
'Веса нормированы до 100% среди включённых строк. По периодам движок перенормирует веса доступных позиций. Завтрак доступен только 10–12, обычное меню также доступно утром.',
'salesPlan — плановый спрос В ПРОДАЖАХ В ЧАС, не сумма за период. Периоды 10–12 (2ч), 12–16 (4ч), 16–20 (4ч), 20–23 (3ч). Календарь 22 будних + 8 выходных = 30 дней. Это сценарный график сети, не фактические часы существующего Киомей.',
'Стартовый спрос установлен на 45% первоначального технического примера, одинаковый коэффициент для всех четырёх форматов и периодов с округлением до целой позиции/ч. Это редактируемый умеренный сценарий, не замер действующей точки и не подбор под доходность. Возможная отрицательная прибыль сохранена; для открытия нужен подтверждённый спрос.',
'Месячная зарплата рассчитана на покрытие всех 13 часов × 30 дней, а не только одной команды/полумесяца. Количество рабочих мест в смене не равно штатной численности; сменный график обеспечивает полное покрытие. Все ставки условно включают расходы работодателя; отдельной второй надбавки на ФОТ нет.',
'Бистро: 4 кухонных позиции × 450 ₽/ч; 3 зала/кассы × 350 ₽/ч. Рамен: 3 повара (раздача — один из них) × 400 ₽/ч, кассир × 300 ₽/ч. Суши: 2 повара × 420 ₽/ч, кассир × 300 ₽/ч. Матча: 2 бариста/касса × 350 ₽/ч и 1 кухня/выдача × 380 ₽/ч. Менеджмент отдельной строкой.',
'Аренда: бистро 500 000 ₽, корнеры по 300 000 ₽ — условие пользователя. Остальные суммы расходов — допущения. Пропускная способность общая по позициям/час: 80/80/65/85, требует замеров по конкретной матрице и комплектации.',
'Эквайринг 2,2%; демонстрационный налог оператора 6% от выручки; прочие переменные 1% — редактируемые допущения, не выбор налогового режима и не юридический совет. Амортизация, выплаты по кредиту, изменение запасов и капремонт не являются автоматически учтёнными: модель операционной прибыли, не полный денежный поток.',
'Вход: 13 млн ₽ бистро / 7 млн ₽ корнер; 50% доля; 24% годовых фиксированного сценария — условия пользователя. Целевой доход активного партнёра не гарантируется. Условия налогов самого инвестора/возврата капитала задаются отдельно, не смешиваются с 6% оператора.',
'Предложенные новые цены наборов и завтрака не утверждены: 390 ₽ завтрак, 590/790/990 ₽ сеты рамена; 790/1090/1790 ₽ сеты суши; 390/590 ₽ комбо матча/кофе. Их состав/цены/себестоимость редактируются.',
'', 'ПОЛНЫЙ КАТАЛОГ: НАЗВАНИЕ | ЦЕНА | СТАТУС | ИСТОЧНИК']
for c in cat:lines.append(f"{c['id']} | {c['name']} | {c['basePrice'] if c['basePrice'] else 'НЕ УКАЗАНА'} ₽ | {c['status']} | {c['source']}")
(ROOT/'menu-provenance.txt').write_text('\n'.join(lines)+'\n')
