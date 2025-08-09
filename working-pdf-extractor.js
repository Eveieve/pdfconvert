// WORKING PDF Content Extractor that actually preserves content
class WorkingPDFExtractor {
    
    async convertPDFToImageWithContent(file, targetFormat, fileName, onProgress) {
        console.log('🚀 WORKING PDF EXTRACTOR - Starting content preservation');
        
        try {
            // Step 1: Load PDF.js properly
            await this.loadPDFJSProperly();
            onProgress(10);
            
            // Step 2: Parse PDF and extract content
            const pdfData = await this.extractPDFContent(file);
            onProgress(40);
            
            // Step 3: Render content to canvas
            const canvas = await this.renderContentToCanvas(pdfData);
            onProgress(80);
            
            // Step 4: Convert to image
            const result = await this.convertCanvasToImage(canvas, targetFormat, fileName);
            onProgress(100);
            
            console.log('✅ PDF content successfully preserved and converted');
            return result;
            
        } catch (error) {
            console.error('❌ Working PDF extractor failed:', error);
            throw error;
        }
    }
    
    async loadPDFJSProperly() {
        if (window.pdfjsLib) {
            console.log('✅ PDF.js already loaded');
            return;
        }
        
        console.log('📚 Loading PDF.js properly...');
        
        return new Promise((resolve, reject) => {
            // Use Mozilla's official CDN with a version that actually works
            const script = document.createElement('script');
            script.src = 'https://mozilla.github.io/pdf.js/build/pdf.js';
            script.crossOrigin = 'anonymous';
            
            script.onload = async () => {
                // Wait for pdfjsLib to be available
                let attempts = 0;
                while (!window.pdfjsLib && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                
                if (window.pdfjsLib) {
                    // Configure worker with Mozilla's CDN
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.js';
                    console.log('✅ PDF.js loaded from Mozilla CDN');
                    resolve();
                } else {
                    reject(new Error('PDF.js failed to initialize'));
                }
            };
            
            script.onerror = () => {
                // Fallback to different CDN
                console.log('🔄 Trying fallback CDN...');
                this.loadFallbackPDFJS().then(resolve).catch(reject);
            };
            
            document.head.appendChild(script);
        });
    }
    
    async loadFallbackPDFJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.min.js';
            
            script.onload = () => {
                if (window.pdfjsLib || window.PDFJS) {
                    const lib = window.pdfjsLib || window.PDFJS;
                    window.pdfjsLib = lib;
                    
                    if (lib.GlobalWorkerOptions) {
                        lib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js';
                    }
                    console.log('✅ PDF.js loaded from fallback CDN');
                    resolve();
                } else {
                    reject(new Error('Fallback PDF.js failed to load'));
                }
            };
            
            script.onerror = () => reject(new Error('All PDF.js CDNs failed'));
            document.head.appendChild(script);
        });
    }
    
    async extractPDFContent(file) {
        console.log('📖 Extracting PDF content...');
        
        const arrayBuffer = await file.arrayBuffer();
        
        // Load PDF document
        const loadingTask = window.pdfjsLib.getDocument({
            data: arrayBuffer,
            verbosity: 0,
            cMapUrl: 'https://unpkg.com/pdfjs-dist@2.16.105/cmaps/',
            cMapPacked: true
        });
        
        const pdf = await loadingTask.promise;
        console.log('📄 PDF loaded - Pages:', pdf.numPages);
        
        // Get first page
        const page = await pdf.getPage(1);
        
        // Extract text content with positioning
        const textContent = await page.getTextContent();
        console.log('📝 Text items extracted:', textContent.items.length);
        
        // Get page dimensions
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Try to render the page as well
        let renderedContent = null;
        try {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = viewport.width;
            tempCanvas.height = viewport.height;
            
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            
            await page.render({
                canvasContext: tempCtx,
                viewport: viewport
            }).promise;
            
            renderedContent = tempCanvas;
            console.log('✅ PDF page rendered successfully');
            
        } catch (renderError) {
            console.warn('⚠️ PDF rendering failed, will use text extraction:', renderError.message);
        }
        
        return {
            textContent: textContent,
            viewport: viewport,
            renderedCanvas: renderedContent,
            pageInfo: {
                width: viewport.width,
                height: viewport.height,
                numPages: pdf.numPages
            }
        };
    }
    
    async renderContentToCanvas(pdfData) {
        console.log('🎨 Rendering PDF content to canvas...');
        
        const scale = 2.0;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = pdfData.viewport.width * scale;
        canvas.height = pdfData.viewport.height * scale;
        
        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // If we have a rendered canvas from PDF.js, use it
        if (pdfData.renderedCanvas) {
            console.log('🖼️ Using PDF.js rendered content');
            ctx.scale(scale, scale);
            ctx.drawImage(pdfData.renderedCanvas, 0, 0);
            ctx.scale(1/scale, 1/scale);
        } else {
            // Fallback: render text content manually
            console.log('📝 Manually rendering text content');
            await this.renderTextManually(ctx, pdfData.textContent, pdfData.viewport, scale);
        }
        
        // Verify we have content
        const hasContent = this.verifyCanvasContent(canvas);
        console.log('🔍 Canvas content verification:', hasContent ? 'CONTENT FOUND' : 'NO CONTENT');
        
        if (!hasContent) {
            // Last resort: create a representation with the extracted text
            console.log('🔄 Creating text representation as last resort');
            await this.createTextRepresentation(ctx, pdfData, scale);
        }
        
        return canvas;
    }
    
    async renderTextManually(ctx, textContent, viewport, scale) {
        console.log('✏️ Rendering text manually with positioning');
        
        ctx.scale(scale, scale);
        ctx.fillStyle = '#000000';
        ctx.font = '12px serif';
        
        let renderedCount = 0;
        
        textContent.items.forEach((item, index) => {
            if (item.str && item.str.trim()) {
                try {
                    // Get position from transform matrix
                    const transform = item.transform;
                    let x = transform[4];
                    let y = viewport.height - transform[5]; // Flip Y coordinate
                    
                    // Ensure valid coordinates
                    if (x >= 0 && x < viewport.width && y >= 0 && y < viewport.height) {
                        ctx.fillText(item.str, x, y);
                        renderedCount++;
                    }
                } catch (textError) {
                    console.warn('⚠️ Error rendering text item:', textError);
                }
            }
        });
        
        ctx.scale(1/scale, 1/scale);
        console.log(`✅ Manually rendered ${renderedCount} text items`);
    }
    
    async createTextRepresentation(ctx, pdfData, scale) {
        console.log('📄 Creating text representation');
        
        ctx.save();
        ctx.scale(scale, scale);
        
        // Clear and create representation
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, pdfData.viewport.width, pdfData.viewport.height);
        
        // Draw border
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, 10, pdfData.viewport.width - 20, pdfData.viewport.height - 20);
        
        // Extract all text and display it
        ctx.fillStyle = '#000000';
        ctx.font = '14px Arial';
        
        let allText = '';
        pdfData.textContent.items.forEach(item => {
            if (item.str && item.str.trim()) {
                allText += item.str + ' ';
            }
        });
        
        if (allText.trim()) {
            ctx.font = 'bold 16px Arial';
            ctx.fillText('EXTRACTED PDF CONTENT:', 20, 40);
            
            ctx.font = '12px Arial';
            const words = allText.trim().split(' ');
            let line = '';
            let y = 70;
            const lineHeight = 16;
            const maxWidth = pdfData.viewport.width - 40;
            
            words.forEach(word => {
                const testLine = line + word + ' ';
                const metrics = ctx.measureText(testLine);
                
                if (metrics.width > maxWidth && line !== '') {
                    ctx.fillText(line, 20, y);
                    line = word + ' ';
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            });
            
            if (line) {
                ctx.fillText(line, 20, y);
            }
            
            console.log(`✅ Created text representation with ${words.length} words`);
        } else {
            ctx.fillText('PDF file processed (no text content extracted)', 20, 40);
        }
        
        ctx.restore();
    }
    
    verifyCanvasContent(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let nonWhitePixels = 0;
        const sampleSize = Math.min(data.length, 10000); // Sample first 10K pixels
        
        for (let i = 0; i < sampleSize; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            if (r < 240 || g < 240 || b < 240) {
                nonWhitePixels++;
            }
        }
        
        const contentRatio = nonWhitePixels / (sampleSize / 4);
        console.log(`📊 Content analysis: ${nonWhitePixels} non-white pixels, ratio: ${(contentRatio * 100).toFixed(2)}%`);
        
        return contentRatio > 0.01; // At least 1% content
    }
    
    async convertCanvasToImage(canvas, targetFormat, fileName) {
        console.log('💾 Converting canvas to image...');
        
        const outputFormat = targetFormat === 'jpg' ? 'image/jpeg' : `image/${targetFormat}`;
        const quality = targetFormat === 'jpg' ? 0.9 : undefined;
        
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                console.log('✅ Image created:', blob.size, 'bytes');
                resolve({
                    blob,
                    filename: `${fileName}.${targetFormat}`,
                    type: outputFormat
                });
            }, outputFormat, quality);
        });
    }
}

// Make it globally available
window.WorkingPDFExtractor = WorkingPDFExtractor;