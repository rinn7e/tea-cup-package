import React from 'react'

import {
  basicPage,
  markdownPage,
  specExtensionPage,
  specFromScratchPage,
} from '@/common/type/route'
import { Link } from '@/component/link'

export const ExamplesPage: React.FC = () => {
  const exampleItems = [
    {
      title: 'Basics ✍️',
      text: 'This example shows how to set up a minimal rich text editor with the default configuration.',
      route: { page: basicPage() },
    },
    {
      title: 'Markdown 📝',
      text: 'This example shows how you can switch between a plain markdown editor and a fancier WYSIWYG editor.',
      route: { page: markdownPage() },
    },
    {
      title: 'Extend a specification 🚀',
      text: 'This example shows how you can extend the default specification with your own mark and element definitions (like captioned image, underline, and strikethrough).',
      route: { page: specExtensionPage() },
    },
    {
      title: 'New specification from scratch 🛠️',
      text: 'This example shows how you can create a completely new document specification from scratch, such as an interactive checklist.',
      route: { page: specFromScratchPage() },
    },
  ]

  return (
    <div>
      <h1 className='page-title'>Examples</h1>
      <p className='page-description'>
        Explore what the Tea-Cup Rich Text Editor Toolkit can do. These examples
        are ported faithfully from the original Elm version.
      </p>

      <div className='examples-grid'>
        {exampleItems.map((item, idx) => (
          <Link key={idx} route={item.route} className='example-item-card'>
            <h3 className='example-item-title'>{item.title}</h3>
            <p className='example-item-desc'>{item.text}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export const ExamplesPageMemo = React.memo(ExamplesPage)
