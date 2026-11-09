'use client';

import rehypeKatex from 'rehype-katex';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';

export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-2 text-[15px] leading-relaxed [&_.katex-display]:overflow-x-auto [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 dark:[&_code]:bg-slate-800">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
