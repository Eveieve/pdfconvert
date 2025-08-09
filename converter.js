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
        return new Promise(async (resolve, reject) => {
            try {
                // Step 1: Load PDF.js with extensive debugging
                onProgress(5);
                console.log('🔧 Starting PDF conversion for:', file.name, file.size, 'bytes');
                
                if (typeof window.pdfjsLib === 'undefined') {
                    console.log('📚 Loading PDF.js library...');
                    await this.loadPDFJS();
                }
                
                if (!window.pdfjsLib) {
                    throw new Error('PDF.js failed to load - library not available');
                }
                
                console.log('✅ PDF.js loaded successfully');
                onProgress(10);
                
                // Step 2: Read and validate file
                const arrayBuffer = await file.arrayBuffer();
                console.log('📖 File read as ArrayBuffer:', arrayBuffer.byteLength, 'bytes');
                
                if (arrayBuffer.byteLength === 0) {
                    throw new Error('PDF file is empty');
                }
                
                // Check if it's actually a PDF
                const uint8Array = new Uint8Array(arrayBuffer);
                const header = Array.from(uint8Array.slice(0, 8)).map(b => String.fromCharCode(b)).join('');
                console.log('📄 File header:', header);
                
                if (!header.startsWith('%PDF-')) {
                    throw new Error('File does not appear to be a valid PDF');
                }
                
                onProgress(20);
                
                // Step 3: Configure PDF.js with minimal options for debugging
                console.log('⚙️ Configuring PDF.js...');
                const loadingTask = window.pdfjsLib.getDocument({
                    data: arrayBuffer,
                    verbosity: 1, // Enable verbose logging
                    disableAutoFetch: true,
                    disableStream: true,
                    disableFontFace: true, // Disable custom fonts to avoid CORS issues
                    useSystemFonts: true
                });
                
                onProgress(30);
                
                // Step 4: Load PDF document
                console.log('📋 Loading PDF document...');
                const pdf = await loadingTask.promise;
                console.log('✅ PDF loaded - Pages:', pdf.numPages, 'Fingerprint:', pdf.fingerprints[0]);
                
                if (pdf.numPages === 0) {
                    throw new Error('PDF has no pages');
                }
                
                onProgress(40);
                
                // Step 5: Get first page
                console.log('📑 Loading page 1...');
                const page = await pdf.getPage(1);
                console.log('✅ Page loaded successfully');
                
                const viewport = page.getViewport({ scale: 1.5 });
                console.log('📐 Page dimensions:', viewport.width, 'x', viewport.height);
                
                onProgress(50);
                
                // Step 6: Create and configure canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { alpha: false });
                
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                
                // Fill with white background first
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                console.log('🎨 Canvas created:', canvas.width, 'x', canvas.height);
                onProgress(60);
                
                // Step 7: Render PDF to canvas with minimal config
                console.log('🖼️ Starting PDF rendering...');
                const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };
                
                const renderTask = page.render(renderContext);
                
                // Wait for rendering with timeout
                const timeoutPromise = new Promise((_, timeoutReject) => {
                    setTimeout(() => timeoutReject(new Error('PDF rendering timeout')), 10000);
                });
                
                await Promise.race([renderTask.promise, timeoutPromise]);
                console.log('✅ PDF rendering completed');
                
                onProgress(80);
                
                // Step 8: Verify canvas content
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                console.log('🔍 Checking canvas content...');
                
                let hasContent = false;
                const data = imageData.data;
                
                // Check for any non-white pixels
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1]; 
                    const b = data[i + 2];
                    
                    // If any pixel is not white, we have content
                    if (r < 250 || g < 250 || b < 250) {
                        hasContent = true;
                        break;
                    }
                }
                
                console.log('📊 Canvas has content:', hasContent);
                
                if (!hasContent) {
                    // Try a different approach - add some debug content to see if canvas works
                    ctx.fillStyle = '#000000';
                    ctx.font = '20px Arial';
                    ctx.fillText('PDF Content Should Appear Here', 50, 50);
                    ctx.fillText(`Original PDF: ${file.name}`, 50, 80);
                    ctx.fillText(`Size: ${file.size} bytes, Pages: ${pdf.numPages}`, 50, 110);
                    console.warn('⚠️ No PDF content detected, added debug text');
                }
                
                onProgress(90);
                
                // Step 9: Convert to image blob
                const outputFormat = targetFormat === 'jpg' ? 'image/jpeg' : `image/${targetFormat}`;
                const quality = targetFormat === 'jpg' ? 0.9 : undefined;
                
                console.log('💾 Converting to blob format:', outputFormat);
                
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Failed to create image blob'));
                        return;
                    }
                    
                    console.log('✅ Conversion complete! Blob size:', blob.size);
                    onProgress(100);
                    
                    resolve({
                        blob,
                        filename: `${fileName}_page1.${targetFormat}`,
                        type: outputFormat
                    });
                }, outputFormat, quality);
                
            } catch (error) {
                console.error('❌ PDF conversion failed:', error);
                console.error('Stack trace:', error.stack);
                reject(new Error(`PDF conversion failed: ${error.message}`));
            }
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
            const script = document.createElement('script');
            // Use a more reliable version
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                console.log('📚 PDF.js script loaded from CDN');
                
                // Wait a moment for the library to initialize
                setTimeout(() => {
                    try {
                        if (typeof window.pdfjsLib === 'undefined') {
                            // Try alternative global name
                            if (typeof window.pdfjsWorker !== 'undefined') {
                                window.pdfjsLib = window.pdfjsWorker;
                            } else {
                                throw new Error('PDF.js library not found in global scope');
                            }
                        }
                        
                        // Configure worker with fallback
                        if (window.pdfjsLib.GlobalWorkerOptions) {
                            // Disable worker for now to avoid CORS issues
                            window.pdfjsLib.GlobalWorkerOptions.workerSrc = null;
                            window.pdfjsLib.disableWorker = true;
                            console.log('✅ PDF.js configured (worker disabled for compatibility)');
                        }
                        
                        console.log('✅ PDF.js ready:', !!window.pdfjsLib);
                        resolve();
                        
                    } catch (error) {
                        console.error('❌ PDF.js configuration failed:', error);
                        reject(new Error(`PDF.js configuration failed: ${error.message}`));
                    }
                }, 100);
            };
            
            script.onerror = (error) => {
                console.error('❌ Failed to load PDF.js from CDN:', error);
                reject(new Error('Failed to load PDF.js library - CDN unavailable'));
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