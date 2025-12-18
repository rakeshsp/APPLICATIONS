import { useState } from 'react'
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx'
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
      let currentTextRuns = []
      let maxImageWidth = 0

      const flushText = (paragraphProps = {}) => {
        if (currentTextRuns.length > 0) {
          docChildren.push(new Paragraph({
            children: currentTextRuns,
            ...paragraphProps
          }))
          currentTextRuns = []
        }
      }

      const processNode = async (node, style = {}) => {
        if (node.nodeType === Node.TEXT_NODE) {
          // Replace newlines with spaces, collapse multiple spaces
          let text = node.textContent.replace(/\s+/g, ' ')
          if (text.trim()) {
            currentTextRuns.push(new TextRun({
              text: text,
              bold: style.bold,
              italics: style.italics,
              size: style.size || 24,
            }))
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName.toLowerCase()

          // Skip non-content tags
          if (['script', 'style', 'noscript', 'meta', 'link'].includes(tagName)) return

          const isBlock = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br', 'figcaption', 'figure', 'article', 'section', 'tr'].includes(tagName)

          // Determine styling
          const newStyle = { ...style }
          if (['b', 'strong', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dt'].includes(tagName)) newStyle.bold = true
          if (['i', 'em', 'figcaption'].includes(tagName)) newStyle.italics = true

          // Heading Sizes
          if (tagName === 'h1') newStyle.size = 32
          else if (tagName.startsWith('h')) newStyle.size = 28
          else if (tagName === 'figcaption') newStyle.size = 20

          if (isBlock) flushText()

          // Handle Images
          if (tagName === 'img') {
            flushText()

            let src = node.getAttribute('src')
            if (src) {
              // Fix URL
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

              // Ignore base64 or tiny icons if needed, but for now capture all
              if (src) {
                const imgBlob = await fetchImage(src)
                if (imgBlob) {
                  try {
                    const { width, height } = await getImageDimensions(imgBlob)
                    const arrayBuffer = await imgBlob.arrayBuffer()

                    if (width > maxImageWidth) maxImageWidth = width

                    docChildren.push(
                      new Paragraph({
                        children: [
                          new ImageRun({
                            data: arrayBuffer,
                            transformation: { width, height },
                          }),
                        ],
                        spacing: { after: 200 }
                      })
                    )
                  } catch (e) {
                    console.error("Error processing image", e)
                  }
                }
              }
            }
            return // Don't process children of img
          }

          // Handle Line Breaks
          if (tagName === 'br') {
            currentTextRuns.push(new TextRun({ break: 1 }))
          }

          // Recurse
          // Convert NodeList to Array to avoid issues during iteration if DOM changes (unlikely here but safe)
          const children = Array.from(node.childNodes)
          for (const child of children) {
            await processNode(child, newStyle)
          }

          if (isBlock) {
            // Paragraph properties for specific blocks
            let props = { spacing: { after: 200 } }
            if (tagName === 'li') document.hasList = true // Hint for list handling (simplified here)

            // Simple bullet handling fallback
            if (tagName === 'li') {
              // We'd ideally need track level, but simply flushing is better than missing text.
              // TextRun inside will be flushed.
              // For proper lists we need 'numbering' prop on Paragraph, simplified here:
              currentTextRuns.unshift(new TextRun({ text: "• " }))
            }

            flushText(props)
          }
        }
      }

      setStatus('Processing content...')
      // Start processing from body
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
