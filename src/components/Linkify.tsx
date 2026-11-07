import type { ReactNode } from 'react'

// Plain text with http(s) URLs turned into links; no innerHTML
export default function Linkify({ text }: { text: string }) {
  const parts: ReactNode[] = text.split(/(https?:\/\/\S+)/).map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="underline underline-offset-2 hover:no-underline"
      >
        {part}
      </a>
    ) : (
      part
    ),
  )
  return <>{parts}</>
}
