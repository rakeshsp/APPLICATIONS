import { useState } from 'react'
import { Document, Packer, Paragraph, TextRun, ImageRun, PageOrientation } from 'docx'
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

  const processImageToPNG = (blob) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)

        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            resolve({
              blob: pngBlob,
              width: img.width,
              height: img.height
            })
          } else {
            reject(new Error('Canvas conversion failed'))
          }
        }, 'image/png')

        URL.revokeObjectURL(img.src)
      }
      img.onerror = (e) => {
        URL.revokeObjectURL(img.src)
        reject(e)
      }
      img.src = URL.createObjectURL(blob)
    })
  }

  // Recursive function to process nodes and capture formatting
  const processNode = async (node, style = {}) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // Sanitize
      if (text) {
        return [new TextRun({
          text: text,
          bold: style.bold,
          italics: style.italics,
          underline: style.underline ? {} : undefined,
          size: style.size || 24,
        })];
      }
      return [];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return [];

    const tagName = node.tagName.toUpperCase();
    const newStyle = { ...style };

    // Apply styles based on tags
    if (['B', 'STRONG'].includes(tagName)) newStyle.bold = true;
    if (['I', 'EM'].includes(tagName)) newStyle.italics = true;
    if (['U'].includes(tagName)) newStyle.underline = true;
    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(tagName)) {
      newStyle.bold = true;
      newStyle.size = 28; // Larger size for headings
    }
    if (tagName === 'FIGCAPTION') {
      newStyle.italics = true;
      newStyle.size = 20; // Smaller font for captions
    }


    // Handle Line Breaks
    if (tagName === 'BR') {
      return [new TextRun({ break: 1 })];
    }

    // Handle Images
    if (tagName === 'IMG') {
      let src = node.getAttribute('src');
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

        const imgBlob = await fetchImage(src);
        if (imgBlob) {
          try {
            const { blob: pngBlob, width, height } = await processImageToPNG(imgBlob);
            const arrayBuffer = await pngBlob.arrayBuffer();

            // A4 width in twips is 11906. Margins are 1000 on each side.
            const MAX_CONTENT_WIDTH_PX = (11906 - 2000) / 15;
            let finalWidth = width;
            let finalHeight = height;

            if (width > MAX_CONTENT_WIDTH_PX) {
              const scaleFactor = MAX_CONTENT_WIDTH_PX / width;
              finalWidth = MAX_CONTENT_WIDTH_PX;
              finalHeight = height * scaleFactor;
            }

            finalWidth = Math.floor(finalWidth);
            finalHeight = Math.floor(finalHeight);

            return [new ImageRun({
              data: arrayBuffer,
              transformation: {
                width: finalWidth,
                height: finalHeight,
              },
            })];
          } catch (e) {
            console.error("Error processing image", e);
          }
        }
        return [];
      }
    }

    // Process children recursively
    const runs = [];
    for (const child of node.childNodes) {
      const childRuns = await processNode(child, newStyle);
      runs.push(...childRuns);
    }

    if (tagName === 'FIGCAPTION' && runs.length > 0) {
      runs.unshift(new TextRun({ break: 1 }));
    }

    return runs;
  };

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

      const children = []
      let maxImageWidth = 0

      // Expanded selector to include figcaption and figure
      const elements = doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, img, figcaption, figure')

      setStatus(`Found ${elements.length} elements. Processing...`)

      for (const el of elements) {
        // Check if parent is one of the block tags we handle.
        const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'FIGURE', 'FIGCAPTION'];
        if (blockTags.includes(el.parentElement.tagName)) {
          if (el.tagName === 'IMG') continue;
        }



        const paragraphChildren = await processNode(el);

        if (paragraphChildren.length > 0) {
          let bullet = undefined;
          if (el.tagName === 'LI') {
            const parentTag = el.parentElement ? el.parentElement.tagName : '';
            if (parentTag === 'OL') bullet = { level: 0, type: "decimal" }; // Simple numbering
            else bullet = { level: 0 }; // Simple bullet
          }

          children.push(
            new Paragraph({
              children: paragraphChildren,
              bullet: bullet,
              spacing: { after: 200 },
              heading: (el.tagName.startsWith('H')) ? `Heading${el.tagName.charAt(1)}` : undefined
            })
          );
        }
      }

      if (children.length === 0) {
        children.push(new Paragraph({ children: [new TextRun("No content found.")] }))
      }

      setStatus('Generating Word document...')

      const wordDoc = new Document({
        sections: [{
          properties: {
            page: {
              size: {
                width: 11906, // A4 width in twips
                height: 16838, // A4 height in twips
              },
              margin: {
                top: 1000,
                right: 1000,
                bottom: 1000,
                left: 1000,
              }
            }
          },
          children: children,
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
