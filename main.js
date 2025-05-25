document.addEventListener('DOMContentLoaded', function () {
    // PDF.js worker configuration
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

    const lessonLinks = document.querySelectorAll('.course-sidebar .lesson-link');
    const pdfStatusMessage = document.getElementById('pdf-status-message');
    const pdfCanvas = document.getElementById('pdf-canvas');

    // Navigation controls elements (assuming top controls are also present from previous HTML)
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

    // **Critical Check**: Ensure all required HTML elements are present
    if (!lessonLinks.length) {
        console.error("No lesson links found. Ensure your HTML has elements matching '.course-sidebar .lesson-link'.");
        if (pdfStatusMessage) pdfStatusMessage.textContent = "Initialization Error: Lesson links not found on the page.";
        return; // Stop execution if essential elements are missing
    }
    if (!pdfStatusMessage) {
        console.error("PDF status message element with ID 'pdf-status-message' not found in HTML.");
        // Cannot display status to user if this element is missing
        return; 
    }
    if (!pdfCanvas) {
        console.error("PDF canvas element with ID 'pdf-canvas' not found in HTML.");
        pdfStatusMessage.textContent = "Initialization Error: PDF display area (canvas) not found.";
        return;
    }
    if (!pdfControlsTop || !pdfControlsBottom || !prevButtonTop || !nextButtonTop || !pageNumDisplayTop || !pageCountDisplayTop || !prevButtonBottom || !nextButtonBottom || !pageNumDisplayBottom || !pageCountDisplayBottom) {
        console.error("One or more PDF navigation control elements are missing from the HTML.");
        if(pdfStatusMessage) pdfStatusMessage.textContent = "Initialization Error: PDF navigation controls missing.";
        return;
    }

    const ctx = pdfCanvas.getContext('2d');
    let currentlyActiveLink = null;
    let pdfDoc = null;
    let currentPageNum = 1; 
    let pageRendering = false;
    let pageNumPending = null;
    const scale = 1.5; // Adjust scale as needed

    function renderPage(num) {
        pageRendering = true;
        if (!pdfDoc) {
            console.error("renderPage called but pdfDoc is not loaded.");
            pdfStatusMessage.textContent = "Error: PDF document not loaded. Cannot render page.";
            pageRendering = false;
            return;
        }
        pdfDoc.getPage(num).then(function(page) {
            const viewport = page.getViewport({ scale: scale });
            pdfCanvas.height = viewport.height;
            pdfCanvas.width = viewport.width;

            const renderContext = { canvasContext: ctx, viewport: viewport };
            const renderTask = page.render(renderContext);

            renderTask.promise.then(function() {
                pageRendering = false;
                if (pageNumPending !== null) {
                    renderPage(pageNumPending);
                    pageNumPending = null;
                }
            }).catch(function(error) {
                console.error('Error rendering page: ', error);
                pdfStatusMessage.textContent = `Error rendering page ${num}.`;
                pageRendering = false;
            });
        }).catch(function(error) {
            console.error('Error getting page: ', error);
            pdfStatusMessage.textContent = `Error getting page ${num} from PDF.`;
            pageRendering = false;
        });
        // Update page number display for both top and bottom controls
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
        if (!pdfDoc) return;
        const isFirstPage = (currentPageNum <= 1);
        let isLastPageOfCurrentPdf = (currentPageNum >= pdfDoc.numPages);
        let nextLessonLink = null;

        if (currentlyActiveLink) {
            const allLinks = Array.from(lessonLinks);
            const currentLessonIndex = allLinks.indexOf(currentlyActiveLink);
            if (currentLessonIndex > -1 && currentLessonIndex < allLinks.length - 1) {
                nextLessonLink = allLinks[currentLessonIndex + 1];
            }
        }

        prevButtonTop.disabled = isFirstPage;
        prevButtonBottom.disabled = isFirstPage;

        if (isLastPageOfCurrentPdf) {
            if (nextLessonLink) {
                nextButtonTop.textContent = 'Next Lesson';
                nextButtonBottom.textContent = 'Next Lesson';
                nextButtonTop.disabled = false;
                nextButtonBottom.disabled = false;
            } else { // Last page of the last lesson
                nextButtonTop.textContent = 'Next';
                nextButtonBottom.textContent = 'Next';
                nextButtonTop.disabled = true;
                nextButtonBottom.disabled = true;
            }
        } else { // Not on the last page of the current PDF
            nextButtonTop.textContent = 'Next';
            nextButtonBottom.textContent = 'Next';
            nextButtonTop.disabled = false; // Will be true if pdfDoc.numPages is 1 and currentPageNum is 1
            nextButtonBottom.disabled = false; // Same as above
            // Further refinement if pdfDoc.numPages is 1
            if (pdfDoc.numPages === 1 && !nextLessonLink) {
                 nextButtonTop.disabled = true;
                 nextButtonBottom.disabled = true;
            } else if (pdfDoc.numPages === 1 && nextLessonLink) {
                nextButtonTop.textContent = 'Next Lesson';
                nextButtonBottom.textContent = 'Next Lesson';
            }
        }
    }

    function onPrevPage() {
        if (currentPageNum <= 1) return;
        currentPageNum--;
        queueRenderPage(currentPageNum);
    }

    function onNextPage() {
        if (!pdfDoc) return;

        if (currentPageNum < pdfDoc.numPages) {
            currentPageNum++;
            queueRenderPage(currentPageNum);
        } else { // On the last page of the current PDF
            if (currentlyActiveLink) {
                const allLinks = Array.from(lessonLinks);
                const currentLessonIndex = allLinks.indexOf(currentlyActiveLink);
                if (currentLessonIndex > -1 && currentLessonIndex < allLinks.length - 1) {
                    // There is a next lesson, simulate a click on it
                    allLinks[currentLessonIndex + 1].click();
                }
            }
        }
    }

    prevButtonTop.addEventListener('click', onPrevPage);
    nextButtonTop.addEventListener('click', onNextPage);
    prevButtonBottom.addEventListener('click', onPrevPage);
    nextButtonBottom.addEventListener('click', onNextPage);

    function loadPdf(url) {
        pdfStatusMessage.textContent = `Loading: ${url.split('/').pop()}...`;
        pdfCanvas.style.display = 'none'; 
        pdfControlsTop.style.display = 'none';
        pdfControlsBottom.style.display = 'none';

        pdfjsLib.getDocument(url).promise.then(function(pdfDoc_) {
            pdfDoc = pdfDoc_;
            currentPageNum = 1; 
            pdfCanvas.style.display = 'block'; 
            pdfStatusMessage.textContent = ''; // Clear loading message
            renderPage(currentPageNum);
            pageCountDisplayTop.textContent = pdfDoc.numPages;
            pageCountDisplayBottom.textContent = pdfDoc.numPages;
            pdfControlsTop.style.display = 'block';
            pdfControlsBottom.style.display = 'block';
            updateNavButtonStates(); // Initial state for buttons
        }).catch(function(error) {
            console.error(`Error loading PDF from URL: ${url}`, error);
            pdfStatusMessage.textContent = `Error loading: ${url.split('/').pop()}. Please check that the file exists at the specified path and the server can access it.`;
            pdfCanvas.style.display = 'none';
            pdfControlsTop.style.display = 'none';
            pdfControlsBottom.style.display = 'none';
        });
    }

    lessonLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault(); 

            const pdfSrc = this.getAttribute('data-pdf-src');
            if (!pdfSrc) {
                console.error("Clicked lesson link is missing 'data-pdf-src' attribute.", this);
                pdfStatusMessage.textContent = "Error: PDF source not specified for this lesson.";
                return;
            }
            
            if (currentlyActiveLink) {
                currentlyActiveLink.classList.remove('active-lesson');
            }
            this.classList.add('active-lesson');
            currentlyActiveLink = this;

            loadPdf(pdfSrc); 
        });
    });
});
