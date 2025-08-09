// Automated test runner for PDF content preservation
const puppeteer = require('puppeteer');

async function runContentPreservationTests() {
    console.log('🧪 Starting automated PDF content preservation tests...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        devtools: true 
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging from the page
        page.on('console', msg => {
            console.log('BROWSER:', msg.text());
        });
        
        // Navigate to test page
        await page.goto('http://localhost:8008/content-preservation-tests.html');
        
        // Wait for page to load
        await page.waitForSelector('#test-results');
        
        // Run the tests
        console.log('🚀 Running content preservation tests...');
        await page.evaluate(() => {
            return new Promise((resolve) => {
                window.testRunner = new ContentPreservationTests();
                
                // Override addResult to capture results
                const originalAddResult = window.testRunner.addResult.bind(window.testRunner);
                window.testRunner.results = [];
                
                window.testRunner.addResult = function(testName, passed, message, details) {
                    const result = { testName, passed, message, details };
                    this.results.push(result);
                    console.log(`TEST: ${testName} - ${passed ? 'PASS' : 'FAIL'} - ${message}`);
                    return originalAddResult(testName, passed, message, details);
                };
                
                // Run tests and wait for completion
                window.testRunner.runAllTests().then(() => {
                    window.testResults = window.testRunner.results;
                    resolve();
                });
            });
        });
        
        // Wait for tests to complete
        await page.waitForTimeout(30000); // Wait up to 30 seconds
        
        // Get test results
        const results = await page.evaluate(() => window.testResults || []);
        
        console.log('\n📊 TEST RESULTS:');
        console.log('================');
        
        let passedTests = 0;
        let totalTests = results.length;
        
        results.forEach(result => {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`${status}: ${result.testName}`);
            console.log(`   ${result.message}`);
            if (result.details) {
                console.log(`   Details: ${result.details}`);
            }
            console.log('');
            
            if (result.passed) passedTests++;
        });
        
        console.log(`FINAL RESULT: ${passedTests}/${totalTests} tests passed`);
        
        if (passedTests === totalTests && totalTests > 0) {
            console.log('🎉 ALL TESTS PASSED! PDF content preservation is working!');
            return true;
        } else {
            console.log('❌ SOME TESTS FAILED. PDF content preservation needs fixing.');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test runner failed:', error);
        return false;
    } finally {
        await browser.close();
    }
}

// Alternative: Simple test without puppeteer
async function runSimpleContentTest() {
    console.log('🧪 Running simple content preservation test...');
    
    try {
        // Load required modules
        const fs = require('fs').promises;
        
        // Create a simple test
        const testHTML = `
        <!DOCTYPE html>
        <html><head><title>Simple Test</title></head>
        <body>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
        <script src="working-pdf-extractor.js"></script>
        <script src="converter.js"></script>
        <script>
        async function simpleTest() {
            console.log('🧪 Simple content preservation test starting...');
            
            try {
                // Create a simple PDF
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF();
                pdf.text('TEST CONTENT PRESERVATION', 20, 30);
                pdf.text('This text should appear in converted image', 20, 50);
                const pdfBlob = pdf.output('blob');
                const pdfFile = new File([pdfBlob], 'test.pdf', { type: 'application/pdf' });
                
                // Convert it
                const converter = new FileConverter();
                const result = await converter.convertPDFToImage(pdfFile, 'png', 'test', (p) => console.log('Progress:', p));
                
                // Check if we have a result
                if (result && result.blob && result.blob.size > 1000) {
                    console.log('✅ SIMPLE TEST PASSED - Got converted image with size:', result.blob.size);
                    return true;
                } else {
                    console.log('❌ SIMPLE TEST FAILED - No proper result');
                    return false;
                }
                
            } catch (error) {
                console.log('❌ SIMPLE TEST ERROR:', error.message);
                return false;
            }
        }
        
        // Run when page loads
        window.addEventListener('load', simpleTest);
        </script>
        </body></html>
        `;
        
        await fs.writeFile('/Users/nanhee/workspace/pdfconvert/simple-test.html', testHTML);
        console.log('✅ Simple test file created. Open http://localhost:8008/simple-test.html to run it.');
        
        return true;
        
    } catch (error) {
        console.error('❌ Simple test creation failed:', error);
        return false;
    }
}

// Check if we're running in Node.js
if (typeof module !== 'undefined' && module.exports) {
    runSimpleContentTest().then(success => {
        console.log(success ? '✅ Test setup complete' : '❌ Test setup failed');
    });
} else {
    // Running in browser
    console.log('🧪 Browser test environment ready');
}