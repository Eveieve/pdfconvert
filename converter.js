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
                // Check if PDF.js is available, if not load it
                if (typeof window.pdfjsLib === 'undefined') {
                    await this.loadPDFJS();
                }
                
                const pdfjsLib = window.pdfjsLib;
                
                // Read the file as array buffer
                const arrayBuffer = await file.arrayBuffer();
                onProgress(10);
                
                // Validate PDF file
                if (arrayBuffer.byteLength === 0) {
                    throw new Error('PDF file is empty');
                }
                
                // Load PDF document with proper configuration
                const loadingTask = pdfjsLib.getDocument({
                    data: arrayBuffer,
                    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                    cMapPacked: true,
                    standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/standard_fonts/',
                    useSystemFonts: false,
                    disableFontFace: false,
                    disableAutoFetch: false,
                    disableStream: false
                });
                
                onProgress(30);
                
                const pdf = await loadingTask.promise;
                console.log('PDF loaded successfully:', pdf.numPages, 'pages');
                
                if (pdf.numPages === 0) {
                    throw new Error('PDF has no pages');
                }
                
                onProgress(50);
                
                // Get the first page
                const page = await pdf.getPage(1);
                console.log('Page loaded successfully');
                
                onProgress(60);
                
                // Use reasonable scale to avoid memory issues
                const scale = 2.0; // Reduced scale for better performance
                const viewport = page.getViewport({ scale });
                
                console.log('Viewport dimensions:', viewport.width, 'x', viewport.height);
                
                // Create canvas with proper dimensions
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas size
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                
                // Clear canvas with white background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                onProgress(70);
                
                // Render PDF page to canvas
                const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport,
                    intent: 'display',
                    renderInteractiveForms: false,
                    optionalContentConfigPromise: null,
                    annotationMode: pdfjsLib.AnnotationMode.ENABLE_FORMS,
                };
                
                console.log('Starting PDF render...');
                const renderTask = page.render(renderContext);
                
                await renderTask.promise;
                console.log('PDF render complete');
                
                onProgress(90);
                
                // Verify canvas has content
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const hasContent = this.canvasHasContent(imageData);
                
                if (!hasContent) {
                    console.warn('Canvas appears to be blank, but proceeding with conversion');
                }
                
                // Convert canvas to blob
                const outputFormat = targetFormat === 'jpg' ? 'image/jpeg' : `image/${targetFormat}`;
                const quality = targetFormat === 'jpg' ? 0.9 : undefined;
                
                return new Promise((blobResolve, blobReject) => {
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            blobReject(new Error('Failed to generate image blob from rendered PDF'));
                            return;
                        }
                        
                        console.log('Blob generated successfully, size:', blob.size);
                        onProgress(100);
                        
                        blobResolve({
                            blob,
                            filename: `${fileName}_page1.${targetFormat}`,
                            type: outputFormat
                        });
                    }, outputFormat, quality);
                }).then(resolve).catch(reject);
                
            } catch (error) {
                console.error('PDF to image conversion error:', error);
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type
                });
                reject(new Error(`Failed to convert PDF to image: ${error.message || 'Unknown error'}`));
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
        if (typeof window.pdfjsLib !== 'undefined') return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                try {
                    // Configure PDF.js worker
                    if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
                        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                        console.log('PDF.js loaded and configured successfully');
                        resolve();
                    } else {
                        reject(new Error('PDF.js library loaded but not properly initialized'));
                    }
                } catch (error) {
                    reject(new Error(`Failed to configure PDF.js: ${error.message}`));
                }
            };
            
            script.onerror = (error) => {
                console.error('Failed to load PDF.js script:', error);
                reject(new Error('Failed to load PDF.js library from CDN'));
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