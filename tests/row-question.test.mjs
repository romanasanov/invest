import test from 'node:test';
import assert from 'node:assert/strict';
import { rowQuestionMessage, rowQuestionUrl } from '../lib/row-question.ts';

test('row question preserves the current value, format and day/period in a direct Telegram draft', () => {
  const row={format:'Точка рамена',label:'Чеки 12:00–16:00',value:'27 в час',context:'Выходной день; средний чек 990 ₽; фудкост 32%'};
  const url=new URL(rowQuestionUrl(row));
  assert.equal(url.hostname,'t.me');
  assert.equal(url.pathname,'/romanasanov');
  assert.equal(url.searchParams.get('text'),rowQuestionMessage(row));
  assert.match(url.searchParams.get('text'),/27 в час/);
  assert.match(url.searchParams.get('text'),/Выходной день/);
});

test('menu names with query punctuation cannot replace the recipient or inject URL parameters', () => {
  const row={format:'Бистро',label:'Роти & сыр? + нори',value:'590 ₽ #1'};
  const url=new URL(rowQuestionUrl(row));
  assert.deepEqual([...url.searchParams.keys()],['text']);
  assert.ok(url.searchParams.get('text').includes('Роти & сыр? + нори: 590 ₽ #1'));
});
