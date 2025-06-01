// Ensure PDF.js worker is configured.
// IMPORTANT: You need to have the pdf.worker.js file (or a similar build)
// available at this path relative to your HTML file or an absolute path.
// If you downloaded PDF.js, it's usually in the `build` or `web` directory.
// For this example, we'll assume `pdf.worker.js` is in the same directory as `main.js`.
// If your `main.js` (the one from `pdfjsLib.GlobalWorkerOptions.workerSrc = 'main.js';`)
// was intended to be the worker itself, you might need to adjust this path
// or ensure the worker file is correctly named and placed.
// A common practice is to point to the worker file directly:
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';
// Or if you have it locally:
// pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.js';


document.addEventListener('DOMContentLoaded', () => {
    const lessonLinks = document.querySelectorAll('.lesson-item'); // Updated selector
    const pdfStatusMessage = document.getElementById('pdf-status-message');
    const pdfCanvas = document.getElementById('pdf-canvas');

    const pdfControlsTop = document.getElementById('pdf-controls-top');
    const prevButtonTop = document.getElementById('prev-page-top');
    const nextButtonTop = document.getElementById('next-page-top');
    const pageNumDisplayTop = document.getElementById('page-num-top');
    const pageCountDisplayTop = document.getElementById('page-count-top');

    const pdfControlsBottom = document.getElementById('pdf-controls-bottom');
    const prevButtonBottom = document.getElementById('prev-page-bottom');
    const nextButtonBottom = document.getElementById('next-page-bottom');
    const pageNumDisplayBottom = document.getElementById('page-num-bottom');
    const pageCountDisplayBottom = document.getElementById('page-count-bottom');

    if (!pdfCanvas) {
        console.error("PDF Canvas element not found!");
        return;
    }
    const ctx = pdfCanvas.getContext('2d');
    let pdfDoc = null;
    let currentPageNum = 1;
    let pageRendering = false;
    let pageNumPending = null;
    let currentlyActiveLink = null;
    const scale = 1.5;

    function renderPage(num) {
        pageRendering = true;
        // Using promise syntax for clarity
        pdfDoc.getPage(num).then(page => {
            const viewport = page.getViewport({ scale: scale });
            pdfCanvas.height = viewport.height;
            pdfCanvas.width = viewport.width;

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            const renderTask = page.render(renderContext);

            return renderTask.promise;
        }).then(() => {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        }).catch(error => {
            console.error('Error rendering page:', error);
            pdfStatusMessage.textContent = `Error rendering page ${num}.`;
            pageRendering = false; // Ensure rendering flag is reset on error
        });

        pageNumDisplayTop.textContent = num;
        pageNumDisplayBottom.textContent = num;
        updateNavButtonStates();
    }

    function queueRenderPage(num) {
        if (pageRendering) {
            pageNumPending = num;
        } else {
            renderPage(num);
        }
    }

    function updateNavButtonStates() {
        if (!pdfDoc) return; // Don't try to update if pdfDoc isn't loaded

        const isFirst = currentPageNum <= 1;
        const isLast = currentPageNum >= pdfDoc.numPages;

        if (prevButtonTop) prevButtonTop.disabled = isFirst;
        if (prevButtonBottom) prevButtonBottom.disabled = isFirst;
        if (nextButtonTop) nextButtonTop.disabled = isLast;
        if (nextButtonBottom) nextButtonBottom.disabled = isLast;
    }

    function loadPdf(url) {
        pdfStatusMessage.textContent = `Loading ${url}...`;
        // Make controls and canvas invisible while loading a new PDF
        pdfCanvas.style.display = 'none';
        if (pdfControlsTop) pdfControlsTop.style.display = 'none';
        if (pdfControlsBottom) pdfControlsBottom.style.display = 'none';


        const loadingTask = pdfjsLib.getDocument(url);
        loadingTask.promise.then(doc => {
            pdfDoc = doc;
            currentPageNum = 1;

            if (pageCountDisplayTop) pageCountDisplayTop.textContent = doc.numPages;
            if (pageCountDisplayBottom) pageCountDisplayBottom.textContent = doc.numPages;

            pdfCanvas.style.display = 'block';
            if (pdfControlsTop) pdfControlsTop.style.display = 'block';
            if (pdfControlsBottom) pdfControlsBottom.style.display = 'block';
            pdfStatusMessage.textContent = ''; // Clear loading message

            renderPage(currentPageNum);
        }).catch(reason => {
            console.error('Error loading PDF:', reason);
            pdfStatusMessage.textContent = `Error loading PDF: ${url}. Please check the file path and network.`;
            // Hide controls if PDF fails to load
            pdfCanvas.style.display = 'none';
            if (pdfControlsTop) pdfControlsTop.style.display = 'none';
            if (pdfControlsBottom) pdfControlsBottom.style.display = 'none';
        });
    }

    if (lessonLinks.length > 0) {
        lessonLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const src = link.getAttribute('data-pdf-src');
                if (!src) {
                    console.warn('Lesson link is missing data-pdf-src attribute:', link);
                    pdfStatusMessage.textContent = 'Error: PDF source not specified for this lesson.';
                    return;
                }

                if (currentlyActiveLink) {
                    currentlyActiveLink.classList.remove('active'); // Changed class name
                }
                link.classList.add('active'); // Changed class name
                currentlyActiveLink = link;

                loadPdf(src);
                window.scrollTo(0, 0); // Optional: scroll to top when loading new PDF
            });
        });
    } else {
        pdfStatusMessage.textContent = 'No lessons found in the outline.';
    }

    function setupPageNavButton(button, action) {
        if (button) {
            button.addEventListener('click', () => {
                if (!pdfDoc) return; // No PDF loaded

                if (action === 'prev' && currentPageNum > 1) {
                    currentPageNum--;
                    queueRenderPage(currentPageNum);
                } else if (action === 'next' && currentPageNum < pdfDoc.numPages) {
                    currentPageNum++;
                    queueRenderPage(currentPageNum);
                }
            });
        }
    }

    setupPageNavButton(prevButtonTop, 'prev');
    setupPageNavButton(nextButtonTop, 'next');
    setupPageNavButton(prevButtonBottom, 'prev');
    setupPageNavButton(nextButtonBottom, 'next');

    // Show lesson1.pdf by default on page load
    const firstLesson = document.querySelector('.lesson-item[data-pdf-src="lesson1.pdf"]');
    if (firstLesson) {
        firstLesson.click();
    }

    document.querySelectorAll('.take-test-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const formUrl = this.parentElement.getAttribute('data-form-url');
        if (formUrl) {
          document.getElementById('pdf-canvas').style.display = 'none';
          document.getElementById('pdf-controls-top').style.display = 'none';
          document.getElementById('pdf-controls-bottom').style.display = 'none';
          document.getElementById('pdf-status-message').style.display = 'none';
          document.getElementById('form-viewer').src = formUrl;
          document.getElementById('form-viewer').style.display = 'block';
        }
      });
    });

    // Optional: When a lesson is clicked, hide the form and show the PDF viewer again
    document.querySelectorAll('.lesson-item, .test-item').forEach(item => {
      item.addEventListener('click', function() {
        document.getElementById('form-viewer').style.display = 'none';
        document.getElementById('pdf-canvas').style.display = 'block';
        document.getElementById('pdf-controls-top').style.display = 'flex';
        document.getElementById('pdf-controls-bottom').style.display = 'flex';
        document.getElementById('pdf-status-message').style.display = 'block';
      });
    });
});
