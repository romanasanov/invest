'use client';
import type { ReactNode } from 'react';
import { MessageCircle } from 'lucide-react';
import { rowQuestionMessage, rowQuestionUrl } from '../lib/row-question';
import type { RowQuestion } from '../lib/row-question';

export function ModelQuestion({ children, ...row }: RowQuestion & { children?: ReactNode }) {
  function copyDraft() {
    // Telegram receives the same draft through the URL even if clipboard access is unavailable.
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(rowQuestionMessage(row)).catch(() => undefined);
    }
  }
  return <a className="x-question" href={rowQuestionUrl(row)} onClick={copyDraft}
    target="_blank" rel="noopener noreferrer"
    aria-label={'Задать вопрос в Telegram: ' + row.label + ', ' + row.value}
    title="Задать вопрос об этой строке в Telegram">
    {children ?? row.label}<MessageCircle size={13} aria-hidden="true"/>
  </a>;
}
