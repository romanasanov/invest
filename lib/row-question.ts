export interface RowQuestion {
  format: string;
  label: string;
  value: string;
  context?: string;
}

export function rowQuestionMessage(row: RowQuestion): string {
  return [
    'Здравствуйте! Вопрос по экономике Киомей: ' + row.format + '.',
    row.label + ': ' + row.value,
    row.context,
    'Подскажите, пожалуйста, как формируется этот показатель?',
  ].filter(Boolean).join('\n');
}

export function rowQuestionUrl(row: RowQuestion): string {
  return 'https://t.me/romanasanov?text=' + encodeURIComponent(rowQuestionMessage(row));
}
