import { useState } from 'react'
import { Document, Packer, Paragraph, TextRun, ImageRun, InternalHyperlink, BookmarkStart, BookmarkEnd } from 'docx'
import { saveAs } from 'file-saver'
import './App.css'

function App() {
  const [url, setUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState('')

  const fetchUrl = async (targetUrl) => {
    const response = await fetch(`http://localhost:3000/api/fetch?url=${encodeURIComponent(targetUrl)}`)
    if (!response.ok) throw new Error('Failed to fetch URL')
    return await response.text()
  }

  const fetchImage = async (imageUrl) => {
    try {
      const response = await fetch(`http://localhost:3000/api/fetch?url=${encodeURIComponent(imageUrl)}`)
      if (!response.ok) return null
      return await response.blob()
    } catch (e) {
      console.error("Failed to fetch image", imageUrl, e)
      return null
    }
  }

  const getImageDimensions = (blob) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
        URL.revokeObjectURL(img.src)
      }
      img.onerror = reject
      img.src = URL.createObjectURL(blob)
    })
  }

  const handleConvert = async () => {
    if (!url) {
      alert('Please enter a URL')
      return
    }

    setIsProcessing(true)
    setStatus('Fetching page...')
    try {
      const html = await fetchUrl(url)

      setStatus('Parsing content...')
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      const docChildren = []
      let currentRunDescriptors = []
      let maxImageWidth = 0

      const flushText = (paragraphProps = {}) => {
        if (currentRunDescriptors.length > 0) {

          const fullText = currentRunDescriptors.filter(d => d.type === 'text').map(d => d.text).join('')
          const captionMatch = fullText.match(/^(Fig(?:ure)?\.?)\s*(\d+)/i)
          let bookmarkId = null

          if (captionMatch) {
            const num = captionMatch[2]
            bookmarkId = `fig-${num}`
          }

          let finalChildren = []

          if (bookmarkId) {
            finalChildren.push(new BookmarkStart({ id: bookmarkId, name: bookmarkId }))
          }

          for (const desc of currentRunDescriptors) {
            if (desc.type === 'break') {
              finalChildren.push(new TextRun({ break: 1 }))
            } else if (desc.type === 'image') {
              finalChildren.push(new ImageRun({
                data: desc.data,
                transformation: { width: desc.width, height: desc.height }
              }))
            } else if (desc.type === 'text') {
              const textContent = desc.text
              const linkRegex = /(Fig(?:ure)?\.?\s*)(\d+)/gi

              let lastIndex = 0
              let match
              let runParts = []

              while ((match = linkRegex.exec(textContent)) !== null) {
                const [fullMatch, prefix, num] = match

                if (match.index > lastIndex) {
                  runParts.push(new TextRun({
                    text: textContent.slice(lastIndex, match.index),
                    bold: desc.style.bold,
                    italics: desc.style.italics,
                    size: desc.style.size || 24,
                  }))
                }

                const isSelfReference = bookmarkId && bookmarkId === `fig-${num}` && match.index === 0

                if (isSelfReference) {
                  runParts.push(new TextRun({
                    text: fullMatch,
                    bold: desc.style.bold,
                    italics: desc.style.italics,
                    size: desc.style.size || 24,
                  }))
                } else {
                  runParts.push(new InternalHyperlink({
                    children: [
                      new TextRun({
                        text: fullMatch,
                        bold: desc.style.bold,
                        italics: desc.style.italics,
                        color: "0563C1",
                        underline: {
                          type: "single"
                        },
                        size: desc.style.size || 24,
                      })
                    ],
                    anchor: `fig-${num}`
                  }))
                }

                lastIndex = linkRegex.lastIndex
              }

              if (lastIndex < textContent.length) {
                runParts.push(new TextRun({
                  text: textContent.slice(lastIndex),
                  bold: desc.style.bold,
                  italics: desc.style.italics,
                  size: desc.style.size || 24,
                }))
              }

              if (runParts.length > 0) {
                finalChildren.push(...runParts)
              } else {
                finalChildren.push(new TextRun({
                  text: textContent,
                  bold: desc.style.bold,
                  italics: desc.style.italics,
                  size: desc.style.size || 24,
                }))
              }
            }
          }

          if (bookmarkId) {
            finalChildren.push(new BookmarkEnd({ id: bookmarkId }))
          }

          docChildren.push(new Paragraph({
            children: finalChildren,
            ...paragraphProps
          }))
          currentRunDescriptors = []
        }
      }

      const processNode = async (node, style = {}) => {
        if (node.nodeType === Node.TEXT_NODE) {
          let text = node.textContent.replace(/\s+/g, ' ')
          if (text.trim()) {
            currentRunDescriptors.push({
              type: 'text',
              text: text,
              style: style
            })
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName.toLowerCase()

          if (['script', 'style', 'noscript', 'meta', 'link'].includes(tagName)) return

          const isBlock = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br', 'figcaption', 'figure', 'article', 'section', 'tr'].includes(tagName)

          const newStyle = { ...style }
          if (['b', 'strong', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dt'].includes(tagName)) newStyle.bold = true
          if (['i', 'em', 'figcaption'].includes(tagName)) newStyle.italics = true

          if (tagName === 'h1') newStyle.size = 32
          else if (tagName.startsWith('h')) newStyle.size = 28
          else if (tagName === 'figcaption') newStyle.size = 20

          if (isBlock) flushText()

          if (tagName === 'img') {
            flushText()

            let src = node.getAttribute('src')
            if (src) {
              if (src.startsWith('/')) {
                const urlObj = new URL(url)
                src = `${urlObj.origin}${src}`
              } else if (!src.startsWith('http')) {
                const urlObj = new URL(url)
                src = new URL(src, urlObj.href).href
              }
              if (src.includes('epos.myesr.org') && src.includes('/media/')) {
                try {
                  const urlObj = new URL(src);
                  urlObj.search = '';
                  src = urlObj.toString();
                } catch (e) { /* ignore */ }
              }

              if (src) {
                const imgBlob = await fetchImage(src)
                if (imgBlob) {
                  try {
                    const { width, height } = await getImageDimensions(imgBlob)
                    const arrayBuffer = await imgBlob.arrayBuffer()

                    if (width > maxImageWidth) maxImageWidth = width

                    currentRunDescriptors.push({
                      type: 'image',
                      data: arrayBuffer,
                      width: width,
                      height: height
                    })
                    flushText()
                  } catch (e) {
                    console.error("Error processing image", e)
                  }
                }
              }
            }
            return
          }

          if (tagName === 'br') {
            currentRunDescriptors.push({ type: 'break' })
          }

          const children = Array.from(node.childNodes)
          for (const child of children) {
            await processNode(child, newStyle)
          }

          if (isBlock) {
            let props = { spacing: { after: 200 } }

            if (tagName === 'li') {
              // Native docx lists provide proper indentation. 
              // We use 'level: 0' for standard indentation.
              const parentTag = node.parentElement ? node.parentElement.tagName.toLowerCase() : 'ul'
              if (parentTag === 'ol') {
                props.bullet = { level: 0 }
              } else {
                props.bullet = { level: 0 }
              }
            }
            flushText(props)
          }
        }
      }

      setStatus('Processing content...')
      await processNode(doc.body)
      flushText()

      if (docChildren.length === 0) {
        docChildren.push(new Paragraph({ children: [new TextRun("No content found.")] }))
      }

      setStatus('Generating Word document...')

      const calculatedWidthTwips = Math.max(11906, (maxImageWidth * 15) + 3000)

      const wordDoc = new Document({
        sections: [{
          properties: {
            page: {
              size: {
                width: calculatedWidthTwips,
                height: 16838,
              },
              margin: {
                top: 1000, right: 1000, bottom: 1000, left: 1000,
              }
            }
          },
          children: docChildren,
        }],
      })

      const blob = await Packer.toBlob(wordDoc)
      saveAs(blob, 'epos-extracted.docx')
      setStatus('Done!')

    } catch (error) {
      console.error(error)
      alert('Error: ' + error.message)
      setStatus('Error occurred.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      <h1>EPOS HTML to Word</h1>
      <div className="card">
        <p>Enter the EPOS webpage URL:</p>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://epos.myesr.org/..."
          style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ccc' }}
        />
        <button onClick={handleConvert} disabled={isProcessing}>
          {isProcessing ? 'Processing...' : 'Convert to Word'}
        </button>
        {status && <p style={{ marginTop: '10px' }}>{status}</p>}
      </div>
    </>
  )
}

export default App
