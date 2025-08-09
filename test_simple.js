// Simple test to verify PDF.js works
async function testPDFJS() {
    console.log('🧪 Testing PDF.js functionality...');
    
    try {
        // Load PDF.js
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
        });
        
        if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            console.log('✅ PDF.js loaded successfully');
            
            // Test with a simple PDF URL
            const url = 'data:application/pdf;base64,JVBERi0xLjMNCiXi48/TDQoxIDAgb2JqDQo8PA0KL1R5cGUgL0NhdGFsb2cNCi9PdXRsaW5lcyAyIDAgUg0KL1BhZ2VzIDMgMCBSDQo+Pg0KZW5kb2JqDQoNCjIgMCBvYmoNCjw8DQovVHlwZSAvT3V0bGluZXMNCi9Db3VudCAwDQo+Pg0KZW5kb2JqDQoNCjMgMCBvYmoNCjw8DQovVHlwZSAvUGFnZXMNCi9Db3VudCAxDQovS2lkcyBbNCAwIFJdDQo+Pg0KZW5kb2JqDQoNCjQgMCBvYmoNCjw8DQovVHlwZSAvUGFnZQ0KL1BhcmVudCAzIDAgUg0KL1Jlc291cmNlcyA8PA0KL0ZvbnQgPDwNCi9GMSAvRm9udA0KPj4NCj4+DQovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQ0KL0NvbnRlbnRzIDUgMCBSDQo+Pg0KZW5kb2JqDQoNCjUgMCBvYmoNCjw8DQovTGVuZ3RoIDQ0DQo+Pg0Kc3RyZWFtDQpCVA0KL0YxIDEyIFRmDQo3MiA3MjAgVGQNCihIZWxsbyBXb3JsZCEpIFRqDQpFVA0KZW5kc3RyZWFtDQplbmRvYmoNCg0KeHJlZg0KMCA2DQowMDAwMDAwMDAwIDY1NTM1IGYgDQowMDAwMDAwMDA5IDAwMDAwIG4gDQowMDAwMDAwMDc0IDAwMDAwIG4gDQowMDAwMDAwMTIwIDAwMDAwIG4gDQowMDAwMDAwMTc5IDAwMDAwIG4gDQowMDAwMDAwMzY0IDAwMDAwIG4gDQp0cmFpbGVyDQo8PA0KL1NpemUgNg0KL1Jvb3QgMSAwIFINCj4+DQpzdGFydHhyZWYNCjQ1Ng0KJSVFT0Y=';
            
            const pdf = await window.pdfjsLib.getDocument(url).promise;
            const page = await pdf.getPage(1);
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const viewport = page.getViewport({scale: 1.5});
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            console.log('✅ Test PDF rendered successfully');
            document.body.appendChild(canvas);
            
        } else {
            console.error('❌ PDF.js not loaded');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testPDFJS);
} else {
    testPDFJS();
}