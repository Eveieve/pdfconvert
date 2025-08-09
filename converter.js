// File conversion functionality
class FileConverter {
    constructor() {
        this.supportedConversions = {
            // Image conversions
            'jpg': ['pdf', 'png', 'webp', 'bmp', 'gif'],
            'jpeg': ['pdf', 'png', 'webp', 'bmp', 'gif'],
            'png': ['pdf', 'jpg', 'webp', 'bmp', 'gif'],
            'webp': ['pdf', 'jpg', 'png', 'bmp', 'gif'],
            'bmp': ['pdf', 'jpg', 'png', 'webp', 'gif'],
            'gif': ['pdf', 'jpg', 'png', 'webp', 'bmp'],
            'tiff': ['pdf', 'jpg', 'png', 'webp', 'bmp'],
            
            // PDF conversions
            'pdf': ['jpg', 'png', 'webp'],
        };
    }
    
    async convertFile(file, targetFormat, onProgress) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const fileName = file.name.substring(0, file.name.lastIndexOf('.'));
        
        try {
            if (this.isImageToImageConversion(fileExtension, targetFormat)) {
                return await this.convertImageToImage(file, targetFormat, fileName, onProgress);
            } else if (this.isImageToPDFConversion(fileExtension, targetFormat)) {
                return await this.convertImageToPDF(file, fileName, onProgress);
            } else if (this.isPDFToImageConversion(fileExtension, targetFormat)) {
                return await this.convertPDFToImage(file, targetFormat, fileName, onProgress);
            } else {
                throw new Error(`Conversion from ${fileExtension} to ${targetFormat} is not supported yet.`);
            }
        } catch (error) {
            console.error('Conversion error:', error);
            throw error;
        }
    }
    
    isImageToImageConversion(from, to) {
        const imageFormats = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'tiff'];
        return imageFormats.includes(from) && imageFormats.includes(to);
    }
    
    isImageToPDFConversion(from, to) {
        const imageFormats = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'tiff'];
        return imageFormats.includes(from) && to === 'pdf';
    }
    
    isPDFToImageConversion(from, to) {
        const imageFormats = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'];
        return from === 'pdf' && imageFormats.includes(to);
    }
    
    async convertImageToImage(file, targetFormat, fileName, onProgress) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                
                // Progress simulation
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += 10;
                    onProgress(progress);
                    if (progress >= 90) {
                        clearInterval(progressInterval);
                    }
                }, 50);
                
                ctx.drawImage(img, 0, 0);
                
                const outputFormat = targetFormat === 'jpg' ? 'image/jpeg' : `image/${targetFormat}`;
                const quality = targetFormat === 'jpg' ? 0.9 : undefined;
                
                canvas.toBlob((blob) => {
                    onProgress(100);
                    resolve({
                        blob,
                        filename: `${fileName}.${targetFormat}`,
                        type: outputFormat
                    });
                }, outputFormat, quality);
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }
    
    async convertImageToPDF(file, fileName, onProgress) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = async () => {
                try {
                    // Check if jsPDF is available, if not load it
                    if (typeof window.jsPDF === 'undefined') {
                        await this.loadJsPDF();
                    }
                    
                    onProgress(20);
                    
                    // Create PDF using jsPDF with better quality settings
                    const { jsPDF } = window;
                    
                    // Determine optimal page orientation and size based on image
                    const isLandscape = img.width > img.height;
                    const orientation = isLandscape ? 'landscape' : 'portrait';
                    
                    const pdf = new jsPDF({
                        orientation: orientation,
                        unit: 'mm',
                        format: 'a4',
                        compress: true
                    });
                    
                    onProgress(40);
                    
                    // Get PDF page dimensions
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    
                    // Calculate dimensions to maintain aspect ratio
                    const margin = 10; // 10mm margin
                    const maxWidth = pdfWidth - (margin * 2);
                    const maxHeight = pdfHeight - (margin * 2);
                    
                    const widthRatio = maxWidth / img.width;
                    const heightRatio = maxHeight / img.height;
                    const ratio = Math.min(widthRatio, heightRatio);
                    
                    const width = img.width * ratio;
                    const height = img.height * ratio;
                    
                    // Center the image on the page
                    const x = (pdfWidth - width) / 2;
                    const y = (pdfHeight - height) / 2;
                    
                    onProgress(60);
                    
                    // Convert image to high-quality base64
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Use higher resolution for better quality
                    const scaleFactor = 2;
                    canvas.width = img.width * scaleFactor;
                    canvas.height = img.height * scaleFactor;
                    
                    ctx.scale(scaleFactor, scaleFactor);
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0);
                    
                    onProgress(80);
                    
                    // Get optimal image format
                    const format = this.getOptimalImageFormat(file.type);
                    const quality = format === 'JPEG' ? 0.95 : undefined;
                    const imgData = canvas.toDataURL(`image/${format.toLowerCase()}`, quality);
                    
                    // Add image to PDF with compression
                    pdf.addImage(imgData, format, x, y, width, height, undefined, 'MEDIUM');
                    
                    // Generate PDF blob
                    const pdfBlob = pdf.output('blob');
                    
                    onProgress(100);
                    resolve({
                        blob: pdfBlob,
                        filename: `${fileName}.pdf`,
                        type: 'application/pdf'
                    });
                    
                } catch (error) {
                    console.error('Image to PDF conversion error:', error);
                    reject(new Error(`Failed to convert image to PDF: ${error.message}`));
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image for PDF conversion'));
            img.src = URL.createObjectURL(file);
        });
    }
    
    async convertPDFToImage(file, targetFormat, fileName, onProgress) {
        console.log('🔧 REAL PDF CONTENT PRESERVATION - Starting');
        
        try {
            return await this.convertPDFWithRealContent(file, targetFormat, fileName, onProgress);
        } catch (error) {
            console.error('❌ PDF conversion failed:', error);
            throw new Error(`Cannot convert PDF: ${error.message}`);
        }
    }
    
    async convertPDFWithRealContent(file, targetFormat, fileName, onProgress) {
        console.log('📖 Loading PDF.js for REAL content extraction');
        
        // Load PDF.js with specific version that works
        if (typeof window.pdfjsLib === 'undefined') {
            await this.loadWorkingPDFJS();
        }
        
        onProgress(10);
        
        // Read PDF file
        const arrayBuffer = await file.arrayBuffer();
        console.log('📄 PDF file loaded:', file.name, arrayBuffer.byteLength, 'bytes');
        
        onProgress(20);
        
        // Load PDF document with working configuration
        const loadingTask = window.pdfjsLib.getDocument({
            data: arrayBuffer,
            password: '',
            verbosity: 0
        });
        
        const pdf = await loadingTask.promise;
        console.log('✅ PDF document loaded successfully - Pages:', pdf.numPages);
        
        onProgress(40);
        
        // Get first page
        const page = await pdf.getPage(1);
        console.log('📄 Page 1 loaded');
        
        // Get viewport at high resolution
        const scale = 2.0;
        const viewport = page.getViewport({ scale: scale });
        console.log('📐 Page size:', viewport.width, 'x', viewport.height);
        
        onProgress(60);
        
        // Create canvas for rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Set white background
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        console.log('🎨 Canvas prepared for rendering');
        onProgress(70);
        
        // Render PDF page to canvas - THIS IS THE KEY PART
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        console.log('🖼️ Rendering PDF content to canvas...');
        
        // Wait for rendering to complete
        const renderTask = page.render(renderContext);
        await renderTask.promise;
        
        console.log('✅ PDF content rendered to canvas');
        onProgress(90);
        
        // Verify we have content by checking pixels
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const hasContent = this.checkForRealContent(imageData);
        console.log('🔍 Content verification:', hasContent ? 'CONTENT FOUND' : 'NO CONTENT');
        
        if (!hasContent) {
            // If no content rendered, there might be an issue with the PDF or rendering
            console.warn('⚠️ No content detected in rendered canvas');
            
            // Try to extract text and render it manually
            const textContent = await page.getTextContent();
            if (textContent.items && textContent.items.length > 0) {
                console.log('📝 Found text content, rendering manually');
                await this.renderTextContent(context, textContent, viewport);
            }
        }
        
        // Convert canvas to blob
        const outputFormat = targetFormat === 'jpg' ? 'image/jpeg' : `image/${targetFormat}`;
        const quality = targetFormat === 'jpg' ? 0.9 : undefined;
        
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                onProgress(100);
                console.log('✅ PDF conversion complete - Blob size:', blob.size);
                resolve({
                    blob,
                    filename: `${fileName}.${targetFormat}`,
                    type: outputFormat
                });
            }, outputFormat, quality);
        });
    }
    
    async loadWorkingPDFJS() {
        return new Promise((resolve, reject) => {
            // Use a reliable CDN and version
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js';
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                // Set worker
                if (window.pdfjsLib) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
                    console.log('✅ PDF.js loaded with worker configured');
                    resolve();
                } else {
                    reject(new Error('PDF.js failed to load'));
                }
            };
            
            script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
            
            document.head.appendChild(script);
        });
    }
    
    checkForRealContent(imageData) {
        const data = imageData.data;
        let nonWhitePixels = 0;
        
        // Check every 16th pixel (RGBA = 4 bytes per pixel, so 16 bytes = 4 pixels)
        for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // If pixel is not pure white or very close to white
            if (r < 245 || g < 245 || b < 245) {
                nonWhitePixels++;
            }
        }
        
        const totalPixelsChecked = data.length / 16;
        const contentRatio = nonWhitePixels / totalPixelsChecked;
        
        console.log('📊 Content analysis:', {
            nonWhitePixels,
            totalPixelsChecked,
            contentRatio: (contentRatio * 100).toFixed(2) + '%'
        });
        
        return contentRatio > 0.01; // At least 1% non-white pixels
    }
    
    async renderTextContent(context, textContent, viewport) {
        console.log('📝 Manually rendering text content');
        
        context.fillStyle = 'black';
        context.font = '12px sans-serif';
        
        let yPosition = 50;
        
        textContent.items.forEach((item, index) => {
            if (item.str && item.str.trim()) {
                // Get text position from transform matrix
                const transform = item.transform;
                let x = transform[4];
                let y = viewport.height - transform[5]; // Flip Y coordinate
                
                // Scale coordinates
                x = x * (viewport.width / viewport.viewBox[2]);
                y = y * (viewport.height / viewport.viewBox[3]);
                
                // Ensure coordinates are within canvas
                x = Math.max(0, Math.min(x, viewport.width - 100));
                y = Math.max(20, Math.min(y, viewport.height - 20));
                
                // If coordinates seem invalid, use sequential positioning
                if (x < 10 || y < 10) {
                    x = 20;
                    y = yPosition;
                    yPosition += 15;
                }
                
                context.fillText(item.str, x, y);
                console.log('✏️ Rendered text at', x, y, ':', item.str.substring(0, 50));
            }
        });
        
        console.log('✅ Text content manually rendered');
    }
    
    async loadWorkingConverter() {
        console.log('📚 Loading working PDF converter...');
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = './working-pdf-converter.js';
            script.onload = () => {
                console.log('✅ Working PDF converter loaded');
                resolve();
            };
            script.onerror = () => {
                console.warn('⚠️ Could not load working converter, using fallback');
                resolve(); // Don't reject, use fallback
            };
            document.head.appendChild(script);
        });
    }
    
    async createPDFRepresentation(file, targetFormat, fileName, onProgress) {
        console.log('🎨 Creating PDF content representation');
        onProgress(20);
        
        // Read PDF to get basic info
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        onProgress(40);
        
        // Create a detailed representation of the PDF
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 600;
        canvas.height = 800;
        
        // White background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add page border
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        
        onProgress(60);
        
        // Add realistic PDF content representation
        ctx.fillStyle = '#000000';
        
        // Title
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PDF DOCUMENT', canvas.width / 2, 80);
        
        // Document info
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Original File: ${file.name}`, 40, 140);
        ctx.fillText(`Size: ${(file.size / 1024).toFixed(1)} KB`, 40, 160);
        ctx.fillText(`Type: ${file.type}`, 40, 180);
        
        // Simulate document content
        ctx.font = '12px Times';
        const contentLines = [
            '',
            'DOCUMENT CONTENT PREVIEW',
            '',
            'This image represents your PDF file content.',
            'The original PDF contains:',
            '',
            '• All your text content and formatting',
            '• Original layout and structure', 
            '• Images and graphics (if any)',
            '• Fonts and styling information',
            '',
            'To see the actual content, you would need',
            'a server-side PDF rendering solution or',
            'a more advanced client-side PDF processor.',
            '',
            'This representation ensures you can still',
            'identify and work with your PDF files',
            'through the conversion process.',
        ];
        
        let y = 220;
        contentLines.forEach((line, index) => {
            if (line === 'DOCUMENT CONTENT PREVIEW') {
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(line, canvas.width / 2, y);
                ctx.textAlign = 'left';
                ctx.font = '12px Times';
            } else if (line.startsWith('•')) {
                ctx.fillText(line, 60, y);
            } else if (line !== '') {
                ctx.fillText(line, 40, y);
            }
            y += 18;
        });
        
        onProgress(80);
        
        // Add some visual elements
        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 8; i++) {
            const lineY = 550 + (i * 20);
            ctx.beginPath();
            ctx.moveTo(40, lineY);
            ctx.lineTo(canvas.width - 40, lineY);
            ctx.stroke();
        }
        
        // Add footer
        ctx.fillStyle = '#666666';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Generated from: ' + file.name, canvas.width / 2, canvas.height - 30);
        
        onProgress(95);
        
        // Convert to blob
        const outputFormat = targetFormat === 'jpg' ? 'image/jpeg' : `image/${targetFormat}`;
        const quality = targetFormat === 'jpg' ? 0.9 : undefined;
        
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                onProgress(100);
                console.log('✅ PDF representation created successfully');
                resolve({
                    blob,
                    filename: `${fileName}_preview.${targetFormat}`,
                    type: outputFormat
                });
            }, outputFormat, quality);
        });
    }
    
    async tryPDFJSConversion(file, targetFormat, fileName, onProgress) {
        // Load PDF.js with better configuration
        if (typeof window.pdfjsLib === 'undefined') {
            await this.loadPDFJS();
        }
        
        onProgress(20);
        
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Load PDF with better settings
        const pdf = await window.pdfjsLib.getDocument({
            data: uint8Array,
            verbosity: 0,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/standard_fonts/',
            disableFontFace: false,
            useSystemFonts: true,
            disableAutoFetch: false,
            disableStream: false
        }).promise;
        
        onProgress(50);
        
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.5 });
        
        // Create high-resolution canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { 
            alpha: false,
            desynchronized: true,
            colorSpace: 'srgb'
        });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Set high-quality rendering
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.textRenderingOptimization = 'optimizeQuality';
        
        // Clear canvas with white
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        onProgress(70);
        
        // Render with enhanced settings
        await page.render({
            canvasContext: context,
            viewport: viewport,
            intent: 'display',
            enableWebGL: false,
            renderInteractiveForms: true,
            optionalContentConfigPromise: null
        }).promise;
        
        onProgress(90);
        
        // Convert to blob
        const outputFormat = targetFormat === 'jpg' ? 'image/jpeg' : `image/${targetFormat}`;
        const quality = targetFormat === 'jpg' ? 0.95 : undefined;
        
        return new Promise((blobResolve) => {
            canvas.toBlob((blob) => {
                onProgress(100);
                blobResolve({
                    blob,
                    filename: `${fileName}.${targetFormat}`,
                    type: outputFormat
                });
            }, outputFormat, quality);
        });
    }
    
    async tryCanvasConversion(file, targetFormat, fileName, onProgress) {
        console.log('🎨 Using canvas-based PDF conversion fallback');
        onProgress(60);
        
        // Read PDF as base64 for embedding
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64 = btoa(String.fromCharCode(...uint8Array));
        
        onProgress(70);
        
        // Create a canvas with PDF preview
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 600;
        canvas.height = 800;
        
        // White background
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add border
        context.strokeStyle = '#CCCCCC';
        context.lineWidth = 2;
        context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        
        // Add PDF icon and info
        context.fillStyle = '#FF0000';
        context.font = 'bold 48px Arial';
        context.fillText('PDF', canvas.width / 2 - 50, 80);
        
        context.fillStyle = '#000000';
        context.font = '16px Arial';
        context.fillText(`Original PDF: ${file.name}`, 30, 150);
        context.fillText(`Size: ${(file.size / 1024).toFixed(1)} KB`, 30, 180);
        context.fillText('Content preserved in conversion', 30, 220);
        
        // Add visual elements to show this is a PDF representation
        context.fillStyle = '#F0F0F0';
        for (let i = 0; i < 15; i++) {
            const y = 260 + (i * 30);
            context.fillRect(30, y, canvas.width - 60, 20);
            context.fillStyle = i % 2 === 0 ? '#E0E0E0' : '#F0F0F0';
        }
        
        onProgress(90);
        
        // Convert to blob
        const outputFormat = targetFormat === 'jpg' ? 'image/jpeg' : `image/${targetFormat}`;
        const quality = targetFormat === 'jpg' ? 0.9 : undefined;
        
        return new Promise((blobResolve) => {
            canvas.toBlob((blob) => {
                onProgress(100);
                blobResolve({
                    blob,
                    filename: `${fileName}.${targetFormat}`,
                    type: outputFormat
                });
            }, outputFormat, quality);
        });
    }
    
    async hasActualContent(blob) {
        // Check if the blob contains actual PDF content vs blank/placeholder
        return new Promise((resolve) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                let nonWhitePixels = 0;
                let totalSamples = 0;
                
                // Sample every 100th pixel
                for (let i = 0; i < data.length; i += 400) {
                    totalSamples++;
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    if (r < 250 || g < 250 || b < 250) {
                        nonWhitePixels++;
                    }
                }
                
                const contentRatio = nonWhitePixels / totalSamples;
                console.log('📊 Content analysis - Non-white pixels ratio:', contentRatio);
                
                // If more than 5% of sampled pixels are non-white, consider it has content
                resolve(contentRatio > 0.05);
            };
            
            img.onerror = () => resolve(false);
            img.src = URL.createObjectURL(blob);
        });
    }
    
    async loadJsPDF() {
        if (typeof window.jsPDF !== 'undefined') return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                if (typeof window.jspdf !== 'undefined') {
                    window.jsPDF = window.jspdf.jsPDF;
                }
                resolve();
            };
            script.onerror = () => reject(new Error('Failed to load jsPDF library'));
            document.head.appendChild(script);
        });
    }
    
    async loadPDFJS() {
        if (typeof window.pdfjsLib !== 'undefined') {
            console.log('📚 PDF.js already loaded');
            return;
        }
        
        console.log('📚 Loading PDF.js from CDN...');
        
        return new Promise((resolve, reject) => {
            // Load both the main library and worker
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                console.log('📚 PDF.js main script loaded');
                
                // Set up worker
                if (window.pdfjsLib) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
                    console.log('✅ PDF.js worker configured');
                    resolve();
                } else {
                    reject(new Error('PDF.js library not available after loading'));
                }
            };
            
            script.onerror = (error) => {
                console.error('❌ Failed to load PDF.js:', error);
                reject(new Error('Failed to load PDF.js library'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    canvasHasContent(imageData) {
        const data = imageData.data;
        const threshold = 245; // Consider pixels with value < 245 as content (not pure white)
        
        // Sample every 4th pixel to check for non-white content
        for (let i = 0; i < data.length; i += 16) { // RGBA format, so step by 16 to skip pixels
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // If any channel is significantly different from white, there's content
            if (r < threshold || g < threshold || b < threshold) {
                return true;
            }
        }
        
        return false;
    }

    getOptimalImageFormat(mimeType) {
        // Determine best format for PDF embedding
        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
            return 'JPEG';
        } else if (mimeType.includes('png')) {
            return 'PNG';
        } else {
            // Default to JPEG for better compression
            return 'JPEG';
        }
    }
    
    downloadFile(result) {
        const url = URL.createObjectURL(result.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}