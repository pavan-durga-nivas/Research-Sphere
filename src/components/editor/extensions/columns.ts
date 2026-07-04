import { Node, mergeAttributes } from "@tiptap/core"

/**
 * Multi-column layout for the editor.
 *
 * A `columns` block contains 2+ `column` nodes, each holding regular block
 * content. Rendered as a CSS grid (see `.editor-columns` in globals.css).
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columns: {
      /** Insert a multi-column block with `count` columns (2 or 3). */
      setColumns: (count?: number) => ReturnType
    }
  }
}

export const Column = Node.create({
  name: "column",
  content: "block+",
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "column", class: "editor-column" }),
      0,
    ]
  },
})

export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,}",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      count: {
        default: 2,
        parseHTML: (element) => Number(element.getAttribute("data-count")) || 2,
        renderHTML: (attributes) => ({
          "data-count": attributes.count,
          style: `--editor-cols:${attributes.count}`,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "columns", class: "editor-columns" }),
      0,
    ]
  },

  addCommands() {
    return {
      setColumns:
        (count = 2) =>
        ({ chain }) => {
          const columns = Array.from({ length: Math.max(2, count) }, () => ({
            type: "column",
            content: [{ type: "paragraph" }],
          }))
          return chain()
            .insertContent({ type: "columns", attrs: { count }, content: columns })
            .run()
        },
    }
  },
})
