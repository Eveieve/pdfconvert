// Web Worker for PDF conversion that actually preserves content
importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js');

self.onmessage = async function(e) {
    const { fileData, targetFormat, fileName } = e.data;
    
    try {
        // Use PDF.js in worker context for better performance
        const pdfjsLib = globalThis.pdfjsLib;
        
        if (!pdfjsLib) {
            throw new Error('PDF.js not available in worker');
        }
        
        // Load PDF
        const pdf = await pdfjsLib.getDocument({ 
            data: new Uint8Array(fileData),
            useWorkerFetch: false,
            isEvalSupported: false,
            disableFontFace: false
        }).promise;
        
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 3.0 });
        
        // Create OffscreenCanvas for better performance
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        // White background
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render PDF
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        // Convert to blob
        const outputFormat = targetFormat === 'jpg' ? 'image/jpeg' : `image/${targetFormat}`;
        const blob = await canvas.convertToBlob({ 
            type: outputFormat,
            quality: targetFormat === 'jpg' ? 0.95 : undefined
        });
        
        // Send back the result
        self.postMessage({
            success: true,
            blob: blob,
            filename: `${fileName}.${targetFormat}`,
            type: outputFormat
        });
        
    } catch (error) {
        self.postMessage({
            success: false,
            error: error.message
        });
    }
};