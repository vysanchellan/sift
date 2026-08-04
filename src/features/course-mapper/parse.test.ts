import { describe, expect, it } from 'vitest'

import { parseCsvLine, parseCsvOutline, parseMarkdownOutline } from './parse'

describe('parseMarkdownOutline', () => {
  it('parses a full course with sections and lessons', () => {
    const markdown = [
      '# Go Course',
      'Learn Go from scratch.',
      '',
      '## Basics',
      'Syntax and tooling.',
      '',
      '### Hello World',
      'Write your first program.',
      '',
      '### Variables',
      'Declare and use variables.',
      '',
      '## Concurrency',
      '',
      '### Goroutines',
      'Lightweight threads.',
    ].join('\n')

    const outline = parseMarkdownOutline(markdown)

    expect(outline.title).toBe('Go Course')
    expect(outline.description).toBe('Learn Go from scratch.')
    expect(outline.sections).toHaveLength(2)

    expect(outline.sections[0].title).toBe('Basics')
    expect(outline.sections[0].description).toBe('Syntax and tooling.')
    expect(outline.sections[0].lessons.map((l) => l.title)).toEqual(['Hello World', 'Variables'])
    expect(outline.sections[0].lessons[0].content).toBe('Write your first program.')

    expect(outline.sections[1].title).toBe('Concurrency')
    expect(outline.sections[1].description).toBeUndefined()
    expect(outline.sections[1].lessons).toHaveLength(1)
    expect(outline.sections[1].lessons[0].content).toBe('Lightweight threads.')
  })

  it('handles an empty course title and multi-paragraph content', () => {
    const outline = parseMarkdownOutline(
      ['## Section', '', '### Lesson', 'First paragraph.', '', 'Second paragraph.'].join('\n')
    )

    expect(outline.title).toBe('')
    expect(outline.sections[0].lessons[0].content).toBe('First paragraph. Second paragraph.')
  })

  it('returns an empty course for blank input', () => {
    const outline = parseMarkdownOutline('  \n\n  ')
    expect(outline).toEqual({ title: '', sections: [] })
  })
})

describe('parseCsvOutline', () => {
  it('groups rows into sections and lessons', () => {
    const csv = [
      'section,title,content',
      'Basics,Hello World,Write your first program.',
      'Basics,Variables,Declare variables.',
      'Concurrency,Goroutines,"Lightweight, concurrent threads."',
    ].join('\n')

    const outline = parseCsvOutline(csv, 'Go Course')

    expect(outline.title).toBe('Go Course')
    expect(outline.sections).toHaveLength(2)
    expect(outline.sections[0].title).toBe('Basics')
    expect(outline.sections[0].lessons.map((l) => l.title)).toEqual(['Hello World', 'Variables'])
    expect(outline.sections[1].lessons[0].title).toBe('Goroutines')
    expect(outline.sections[1].lessons[0].content).toBe('Lightweight, concurrent threads.')
  })

  it('skips the header row even when the title is lowercase', () => {
    const outline = parseCsvOutline(['section,title,content', 'S,Lesson,Body'].join('\n'))
    expect(outline.sections).toHaveLength(1)
    expect(outline.sections[0].lessons[0].title).toBe('Lesson')
  })
})

describe('parseCsvLine', () => {
  it('parses simple and quoted fields', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c'])
    expect(parseCsvLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd'])
    expect(parseCsvLine('a,"b""q""",c')).toEqual(['a', 'b"q"', 'c'])
  })
})
