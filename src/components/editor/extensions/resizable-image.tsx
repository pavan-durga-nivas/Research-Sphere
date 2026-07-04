"use client"

import { useRef } from "react"
import { Image } from "@tiptap/extension-image"
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react"

/**
 * Image node with an interactive drag-to-resize handle (Word-like).
 * Persists the chosen pixel width as a `width` attribute so it survives the
 * HTML round-trip used by the save pipeline.
 */

function ResizableImageView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const { src, alt, title, width } = node.attrs as {
    src: string
    alt: string | null
    title: string | null
    width: number | null
  }

  const startResize = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const image = imgRef.current
    if (!image) return
    const startX = event.clientX
    const startWidth = image.offsetWidth

    const onMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(60, Math.round(startWidth + (moveEvent.clientX - startX)))
      updateAttributes({ width: nextWidth })
    }
    const onUp = () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  return (
    <NodeViewWrapper className="editor-image" data-drag-handle>
      <span className="editor-image__frame">
        <img
          ref={imgRef}
          src={src}
          alt={alt ?? ""}
          title={title ?? undefined}
          draggable={false}
          style={{ width: width ? `${width}px` : undefined }}
          className={selected ? "editor-image__img is-selected" : "editor-image__img"}
        />
        {editor.isEditable && (
          <span
            className="editor-image__handle"
            onMouseDown={startResize}
            role="presentation"
            aria-label="Resize image"
          />
        )}
      </span>
    </NodeViewWrapper>
  )
}

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const attr = element.getAttribute("width")
          if (attr) return Number.parseInt(attr, 10) || null
          const styleWidth = element.style.width
          return styleWidth ? Number.parseInt(styleWidth, 10) || null : null
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {}
          return { width: attributes.width, style: `width:${attributes.width}px;height:auto` }
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})
