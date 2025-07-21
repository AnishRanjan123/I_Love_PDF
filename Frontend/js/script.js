// Global utility functions for messages and downloads
function showMessage(message, type = "info") {
  const messageArea = document.getElementById("message-area");
  const downloadArea = document.getElementById("download-area");
  if (messageArea) {
    messageArea.textContent = message;
    messageArea.className = `message-box ${
      type === "error" ? "message-error" : "message-info"
    }`;
    messageArea.classList.remove("hidden");
  }
  if (downloadArea) {
    downloadArea.classList.add("hidden");
  }
}

function showDownload(fileName, blobUrl) {
  const messageArea = document.getElementById("message-area");
  const downloadArea = document.getElementById("download-area");
  if (downloadArea) {
    downloadArea.innerHTML = `<p>Your file is ready: <a href="${blobUrl}" download="${fileName}">Download ${fileName}</a></p>`;
    downloadArea.classList.remove("hidden");
  }
  if (messageArea) {
    messageArea.classList.add("hidden");
  }
}

function hideAllMessages() {
  const messageArea = document.getElementById("message-area");
  const downloadArea = document.getElementById("download-area");
  if (messageArea) messageArea.classList.add("hidden");
  if (downloadArea) downloadArea.classList.add("hidden");
}

// --- Common File Handling Setup for Single File Tools (Split, Compress, Edit, Protect, Word to PDF) ---
function setupSingleFileTool(pageId, processFunction, options = {}) {
  const selectButton = document.getElementById(`select-${pageId}-file`);
  const fileInput = document.getElementById(`${pageId}-file-input`);
  const uploadBox = document.getElementById(`upload-box-${pageId}`);
  const previewArea = document.getElementById(`${pageId}-preview-area`);
  const processButton = document.getElementById(`start-${pageId}-process`);
  const additionalInput = options.additionalInputId
    ? document.getElementById(options.additionalInputId)
    : null;

  let selectedFile = null;

  function renderFilePreview() {
    if (!selectedFile) {
      previewArea.innerHTML =
        '<p class="no-files-selected-text">No file selected yet.</p>';
      // Button should be disabled if no file or forced disabled by options (e.g., Word to PDF)
      processButton.disabled = options.forceButtonDisabled || true;
      return;
    }

    previewArea.innerHTML = "";
    // Enable button if a file is selected AND not forced disabled by options
    processButton.disabled = options.forceButtonDisabled || false;

    const thumbnail = document.createElement("div");
    thumbnail.classList.add("file-thumbnail");
    // Use a generic document icon or specific icon if provided in options
    const iconSrc =
      options.fileIcon ||
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23d32f2f'%3E%3Cpath d='M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z'/%3E%3C/svg%3E";

    thumbnail.innerHTML = `
            <img src="${iconSrc}" alt="Document Icon">
            <span class="file-name">${selectedFile.name}</span>
            <span class="remove-file">&times;</span>
        `;
    previewArea.appendChild(thumbnail);

    thumbnail.querySelector(".remove-file").addEventListener("click", () => {
      selectedFile = null;
      renderFilePreview();
      hideAllMessages();
    });
  }

  function addFile(file) {
    // Validate file type if allowedFileTypes are specified
    if (
      options.allowedFileTypes &&
      !options.allowedFileTypes.includes(file.type)
    ) {
      showMessage(
        `File "${
          file.name
        }" is not a supported type for this tool. Please select a ${options.allowedFileTypes
          .map((t) => t.split("/")[1])
          .join(" or ")} file.`,
        "error"
      );
      selectedFile = null;
      return;
    }

    selectedFile = file;
    renderFilePreview();
    hideAllMessages();
  }

  // Drag and Drop functionality
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    if (uploadBox) {
      // Ensure uploadBox exists on the page
      uploadBox.addEventListener(eventName, preventDefaults, false);
    }
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (uploadBox) {
    uploadBox.addEventListener(
      "dragenter",
      () => uploadBox.classList.add("drag-over"),
      false
    );
    uploadBox.addEventListener(
      "dragleave",
      () => uploadBox.classList.remove("drag-over"),
      false
    );
    uploadBox.addEventListener(
      "drop",
      (e) => {
        uploadBox.classList.remove("drag-over");
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
          addFile(files[0]); // Only take the first file for single-file tools
        }
      },
      false
    );
  }

  // Connect the custom select button to the hidden file input
  if (selectButton && fileInput) {
    selectButton.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        addFile(e.target.files[0]);
      }
      e.target.value = null; // Clear input so same file can be selected again
    });
  }

  // Add click listener for the process button
  if (processButton) {
    processButton.addEventListener("click", async () => {
      if (!selectedFile) {
        showMessage(`Please select a file to ${pageId}.`, "error");
        return;
      }
      hideAllMessages();

      // Execute the processFunction if it's provided
      if (processFunction) {
        if (additionalInput) {
          await processFunction(selectedFile, additionalInput.value);
        } else {
          await processFunction(selectedFile);
        }
      } else {
        // This branch handles cases like Word to PDF where button is just a placeholder
        showMessage(
          "This feature is not available client-side and requires a server for full functionality.",
          "error"
        );
      }
    });
  }

  renderFilePreview(); // Initial render to set button state and preview text
}

// --- Specific Page Initialization Logic ---
document.addEventListener("DOMContentLoaded", () => {
  const currentPage = window.location.pathname.split("/").pop();

  hideAllMessages(); // Clear messages on page load for any tab

  if (currentPage === "merge.html") {
    setupMergePage();
  } else if (currentPage === "edit-pdf.html") {
    setupSingleFileTool("edit", simpleEditPdf, {
      additionalInputId: "text-to-add",
      allowedFileTypes: ["application/pdf"],
    });
  } else if (currentPage === "split.html") {
    setupSingleFileTool("split", splitPdf, {
      allowedFileTypes: ["application/pdf"],
    });
  } else if (currentPage === "compress.html") {
    // No forceButtonDisabled needed here, as the button will enable with file selection
    setupSingleFileTool("compress", compressPdf, {
      allowedFileTypes: ["application/pdf"],
    });
  } else if (currentPage === "protect-pdf.html") {
    setupSingleFileTool("protect", protectPdf, {
      additionalInputId: "password-input",
      allowedFileTypes: ["application/pdf"],
    });
  } else if (currentPage === "word-to-pdf.html") {
    // --- CHANGE START ---
    // Replace 'null' with the placeholder function 'wordToPdfPlaceholder'
    setupSingleFileTool("word", wordToPdfPlaceholder, {
      fileIcon:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23d32f2f'%3E%3Cpath d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2v-7h2v7zm4 0h-2v-7h2v7z'/%3E%3C/svg%3E", // Word icon
      allowedFileTypes: [
        "application/msword", // .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      ],
      forceButtonDisabled: false, // This keeps the "Convert to PDF" button disabled
    });
  }

  // Initialize modal listeners once the DOM is loaded
  setupAuthModalListeners();
});

// --- Merge Page Logic ---
// This function handles multi-file selection and drag-reordering for merging.
async function setupMergePage() {
  const selectButton = document.getElementById("select-merge-files");
  const fileInput = document.getElementById("merge-file-input");
  const uploadBox = document.getElementById("upload-box");
  const previewArea = document.getElementById("merge-preview-area");
  const processButton = document.getElementById("start-merge-process");

  let selectedFiles = []; // To store File objects for processing and reordering

  function renderFilePreviews() {
    if (selectedFiles.length === 0) {
      previewArea.innerHTML =
        '<p class="no-files-selected-text">No files selected yet.</p>';
      processButton.disabled = true;
      return;
    }

    previewArea.innerHTML = ""; // Clear previous previews
    processButton.disabled = selectedFiles.length < 2; // Enable only if 2+ files

    selectedFiles.forEach((file, index) => {
      const thumbnail = document.createElement("div");
      thumbnail.classList.add("file-thumbnail");
      thumbnail.draggable = true; // Make thumbnails draggable
      thumbnail.dataset.index = index; // Store original index

      thumbnail.innerHTML = `
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23d32f2f'%3E%3Cpath d='M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z'/%3E%3C/svg%3E" alt="PDF Icon">
                <span class="file-name">${file.name}</span>
                <span class="remove-file">&times;</span>
            `;
      previewArea.appendChild(thumbnail);

      // Add event listener to the remove button
      thumbnail.querySelector(".remove-file").addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent drag start from bubbling
        removeFile(index);
      });
    });
    addDragAndDropListeners(); // Re-add drag-drop listeners after re-rendering
  }

  function addFiles(files) {
    Array.from(files).forEach((file) => {
      if (file.type === "application/pdf") {
        selectedFiles.push(file);
      } else {
        showMessage(
          `File "${file.name}" is not a PDF and was skipped.`,
          "error"
        );
      }
    });
    renderFilePreviews();
    hideAllMessages(); // Clear messages after adding files
  }

  function removeFile(indexToRemove) {
    selectedFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
    renderFilePreviews();
    hideAllMessages(); // Clear messages after removing files
  }

  // Prevent default drag behaviors for the upload box
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    uploadBox.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Highlight upload box on drag over/leave
  uploadBox.addEventListener(
    "dragenter",
    () => uploadBox.classList.add("drag-over"),
    false
  );
  uploadBox.addEventListener(
    "dragleave",
    () => uploadBox.classList.remove("drag-over"),
    false
  );
  uploadBox.addEventListener(
    "drop",
    (e) => {
      uploadBox.classList.remove("drag-over");
      const dt = e.dataTransfer;
      const files = dt.files;
      addFiles(files);
    },
    false
  );

  // Connect custom select button to hidden file input
  selectButton.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    addFiles(e.target.files);
    e.target.value = null; // Clear input so same files can be selected again
  });

  // --- Drag-and-Drop Reordering Logic for Thumbnails ---
  let draggedItem = null;

  function addDragAndDropListeners() {
    const thumbnails = previewArea.querySelectorAll(".file-thumbnail");
    thumbnails.forEach((item) => {
      item.addEventListener("dragstart", handleDragStart);
      item.addEventListener("dragend", handleDragEnd);
      item.addEventListener("dragover", handleDragOver);
      item.addEventListener("drop", handleDrop);
    });
  }

  function handleDragStart(e) {
    draggedItem = this;
    setTimeout(() => this.classList.add("dragging"), 0); // Add 'dragging' class after a brief delay
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", this.innerHTML); // For Firefox compatibility
    e.dataTransfer.setData("text/plain", this.dataset.index); // Store original index
  }

  function handleDragEnd(e) {
    this.classList.remove("dragging");
    draggedItem = null;
    // Reset borders for all thumbnails after drag ends
    previewArea.querySelectorAll(".file-thumbnail").forEach((item) => {
      item.style.borderLeft = "none";
      item.style.borderRight = "none";
    });
  }

  function handleDragOver(e) {
    e.preventDefault(); // This is crucial to allow a drop
    if (this === draggedItem) return; // Don't allow dropping on itself

    const bounding = this.getBoundingClientRect();
    const offset = bounding.x + bounding.width / 2; // Midpoint of the element

    // Reset borders for all thumbnails that are not being dragged
    previewArea.querySelectorAll(".file-thumbnail").forEach((item) => {
      if (item !== draggedItem) {
        item.style.borderLeft = "none";
        item.style.borderRight = "none";
      }
    });

    // Add visual indicator for drop position
    if (e.clientX > offset) {
      this.style.borderRight = "2px solid #d32f2f"; // Highlight right side
    } else {
      this.style.borderLeft = "2px solid #d32f2f"; // Highlight left side
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    if (this === draggedItem) return;

    const droppedIndex = Array.from(previewArea.children).indexOf(this); // Get actual current index
    const draggedOriginalIndex = parseInt(e.dataTransfer.getData("text/plain"));

    const [removed] = selectedFiles.splice(draggedOriginalIndex, 1);
    selectedFiles.splice(droppedIndex, 0, removed);

    renderFilePreviews(); // Re-render to reflect new order
    hideAllMessages();
  }

  // Process button click for merging
  processButton.addEventListener("click", async () => {
    if (selectedFiles.length < 2) {
      showMessage("Please select at least two PDF files to merge.", "error");
      return;
    }
    await mergePdfs(selectedFiles);
  });

  renderFilePreviews(); // Initial render to set button state and preview text
}

// --- PDF-LIB Function Implementations (Modified to show modal) ---

/**
 * Merges multiple PDF File objects into a single PDF.
 * @param {File[]} files An array of File objects (PDFs).
 */
async function mergePdfs(files) {
  showMessage(
    "Merging PDFs... This might take a moment, please do not close the tab.",
    "info"
  );
  try {
    const pdfDoc = await PDFLib.PDFDocument.create();
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const externalPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
      const copiedPages = await pdfDoc.copyPages(
        externalPdfDoc,
        externalPdfDoc.getPageIndices()
      );
      copiedPages.forEach((page) => pdfDoc.addPage(page));
    }
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    // --- CHANGE START ---
    // Call showAuthModal instead of showDownload
    showAuthModal(url, `merged_document_${Date.now()}.pdf`, "merge");
    // --- CHANGE END ---
  } catch (error) {
    console.error("Error merging PDFs:", error);
    showMessage(
      `Error merging PDFs: ${error.message || "An unknown error occurred."}`,
      "error"
    );
  }
}

/**
 * Adds text to the first page of a given PDF File object.
 * Triggers auth modal before final download.
 * @param {File} file The PDF File object.
 * @param {string} textToAdd The text string to add.
 */
async function simpleEditPdf(file, textToAdd) {
  showMessage("Adding text to PDF... This might take a moment.", "info");
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    if (pages.length === 0) {
      showMessage("The selected PDF has no pages to edit.", "error");
      return;
    }

    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    firstPage.drawText(textToAdd, {
      x: 50,
      y: height - 50,
      font: await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold),
      size: 30,
      color: PDFLib.rgb(0.98, 0.34, 0.11),
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    // Show authentication modal before download
    showAuthModal(url, `edited_document_${Date.now()}.pdf`, "edit");
  } catch (error) {
    console.error("Error adding text to PDF:", error);
    showMessage(
      `Error adding text to PDF: ${
        error.message || "An unknown error occurred."
      }`,
      "error"
    );
  }
}

/**
 * Splits a PDF into individual page PDFs and packages them into a ZIP file.
 * Triggers auth modal before final download.
 * Requires JSZip library to be loaded in the HTML.
 * @param {File} file The PDF File object to split.
 */
async function splitPdf(file) {
  showMessage(
    "Splitting PDF into individual pages and zipping... This might take a moment.",
    "info"
  );
  try {
    if (typeof JSZip === "undefined") {
      throw new Error(
        "JSZip library not found. Please ensure 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js' is included in your HTML."
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pageCount = pdfDoc.getPages().length;

    if (pageCount === 0) {
      showMessage("The selected PDF has no pages to split.", "error");
      return;
    }

    const zip = new JSZip();
    const baseFileName = file.name.replace(/\.pdf$/i, "");

    for (let i = 0; i < pageCount; i++) {
      const newPdfDoc = await PDFLib.PDFDocument.create();
      const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [i]);
      newPdfDoc.addPage(copiedPage);
      const pdfBytes = await newPdfDoc.save();
      const pageFileName = `${baseFileName}_page_${i + 1}.pdf`;
      zip.file(pageFileName, pdfBytes);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const zipUrl = URL.createObjectURL(zipBlob);

    // Show authentication modal before download
    showAuthModal(zipUrl, `${baseFileName}_split_pages.zip`, "split");
  } catch (error) {
    console.error("Error splitting PDF:", error);
    showMessage(
      `Error splitting PDF: ${error.message || "An unknown error occurred."}`,
      "error"
    );
  }
}

/**
 * Compresses a PDF by re-saving it with default or modified image quality.
 * Triggers auth modal before final download.
 * @param {File} file The PDF File object to compress.
 */
async function compressPdf(file) {
  showMessage(
    "Attempting to compress PDF... This may take a moment. Significant size reduction is not guaranteed client-side.",
    "info"
  );
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pdfBytes = await pdfDoc.save({ use: ["FlateCompress"] });

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    // Optional: Compare sizes for user feedback (for message only, not for modal)
    const originalSize = file.size;
    const newSize = pdfBytes.byteLength;
    const sizeReduction = originalSize - newSize;
    const percentageReduction = ((sizeReduction / originalSize) * 100).toFixed(
      2
    );

    let msg = `PDF re-saved. Original size: ${(originalSize / 1024).toFixed(
      2
    )} KB, New size: ${(newSize / 1024).toFixed(2)} KB.`;
    if (sizeReduction > 0) {
      msg += ` Size reduced by ${percentageReduction}%.`;
    } else if (sizeReduction < 0) {
      msg += ` Size increased by ${Math.abs(
        percentageReduction
      )}% (this can happen if original was heavily optimized).`;
    } else {
      msg += ` No significant size change.`;
    }
    showMessage(msg, "info");

    // Show authentication modal before download
    showAuthModal(url, `compressed_document_${Date.now()}.pdf`, "compress");
  } catch (error) {
    console.error("Error compressing PDF:", error);
    showMessage(
      `Error compressing PDF: ${error.message || "An unknown error occurred."}`,
      "error"
    );
  }
}

/**
 * Protects a PDF with a password.
 * Triggers auth modal before final download.
 * @param {File} file The PDF File object to protect.
 * @param {string} password The password to apply.
 */
async function protectPdf(file, password) {
  if (!password) {
    showMessage("Please enter a password to protect the PDF.", "error");
    return;
  }
  showMessage(
    "Protecting PDF with password... This might take a moment.",
    "info"
  );
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

    const pdfBytes = await pdfDoc.save({
      userPassword: password,
      ownerPassword: password,
    });

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    // Show authentication modal before download
    showAuthModal(url, `protected_document_${Date.now()}.pdf`, "protect");
  } catch (error) {
    console.error("Error protecting PDF:", error);
    showMessage(
      `Error protecting PDF: ${error.message || "An unknown error occurred."}`,
      "error"
    );
  }
}

// --- Authentication Modal Logic ---
let currentDownloadUrl = null;
let currentDownloadFileName = null;
let currentToolName = null;

function setupAuthModalListeners() {
  const modal = document.getElementById("auth-modal");
  const emailInput = document.getElementById("modal-email");
  const passwordInput = document.getElementById("modal-password");
  const submitButton = document.getElementById("modal-submit-button");
  const downloadButton = document.getElementById("modal-download-button");
  const modalErrorMessage = document.getElementById("modal-error-message");
  const closeModalButton = document.getElementById("close-modal");

  // Regex for email validation (basic example)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Regex for password validation: At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;

  // Function to check validation and enable/disable submit button
  function checkValidationAndToggleSubmitButton() {
    const emailValid = emailRegex.test(emailInput.value.trim());
    const passwordValid = passwordRegex.test(passwordInput.value.trim());
    submitButton.disabled = !(emailValid && passwordValid);
    modalErrorMessage.classList.add("hidden"); // Hide error message while typing
  }

  // Attach listeners for input changes
  emailInput.addEventListener("input", checkValidationAndToggleSubmitButton);
  passwordInput.addEventListener("input", checkValidationAndToggleSubmitButton);

  // Event listener for the Submit button
  submitButton.addEventListener("click", () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!emailRegex.test(email)) {
      modalErrorMessage.textContent = "Invalid email format.";
      modalErrorMessage.classList.remove("hidden");
      return;
    }

    if (!passwordRegex.test(password)) {
      modalErrorMessage.textContent =
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.";
      modalErrorMessage.classList.remove("hidden");
      return;
    }

    // If validation passes (client-side only for this demo)
    modalErrorMessage.textContent =
      "Authentication successful! Click Download to get your file.";
    modalErrorMessage.classList.remove("hidden");
    submitButton.classList.add("hidden"); // Hide submit button
    downloadButton.classList.remove("hidden"); // Show download button
    downloadButton.focus(); // Give focus to download button for accessibility
  });

  // Event listener for the Download button
  downloadButton.addEventListener("click", () => {
    // Trigger the actual download
    if (currentDownloadUrl && currentDownloadFileName) {
      showDownload(currentDownloadFileName, currentDownloadUrl);
    } else {
      showMessage("Error: No file prepared for download.", "error");
    }
    modal.classList.remove("visible"); // Hide modal after download button is clicked
    // Clear stored URLs/filenames after successful download trigger
    currentDownloadUrl = null;
    currentDownloadFileName = null;
    currentToolName = null;
  });

  // Event listener for closing modal (click outside or on close button)
  modal.addEventListener("click", function handler(e) {
    if (e.target === modal || e.target === closeModalButton) {
      modal.classList.remove("visible");
      // Remove the handler to prevent multiple listeners being added if setupAuthModalListeners is called multiple times (though it should only be once)
      modal.removeEventListener("click", handler);
      // Reset modal state
      emailInput.value = "";
      passwordInput.value = "";
      modalErrorMessage.classList.add("hidden");
      submitButton.classList.remove("hidden"); // Show submit button again
      submitButton.disabled = true; // Disable it initially
      downloadButton.classList.add("hidden"); // Hide download button
    }
  });
}

// Function to control modal visibility and set its content
function showAuthModal(url, fileName, toolName) {
  currentDownloadUrl = url;
  currentDownloadFileName = fileName;
  currentToolName = toolName;

  const modal = document.getElementById("auth-modal");
  const modalTitle = document.getElementById("modal-title");
  const emailInput = document.getElementById("modal-email");
  const passwordInput = document.getElementById("modal-password");
  const submitButton = document.getElementById("modal-submit-button");
  const downloadButton = document.getElementById("modal-download-button");
  const modalErrorMessage = document.getElementById("modal-error-message");

  // Reset fields and messages to initial state when showing modal
  emailInput.value = "";
  passwordInput.value = "";
  modalErrorMessage.textContent = "";
  modalErrorMessage.classList.add("hidden");
  submitButton.classList.remove("hidden"); // Ensure submit is visible
  submitButton.disabled = true; // Ensure submit is disabled initially
  downloadButton.classList.add("hidden"); // Ensure download is hidden

  modalTitle.textContent = `Download Your ${
    toolName.charAt(0).toUpperCase() + toolName.slice(1)
  }d PDF`;

  modal.classList.add("visible"); // Make modal visible
}
