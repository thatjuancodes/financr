const path = require("node:path");
const { preprocessImage } = require("./preprocessImage");

const PDF_MIME_TYPES = new Set([
  "application/pdf",
]);
const IMAGE_MIME_PREFIX = "image/";

function normalizeText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function inferSourceType({ mimeType, filename }) {
  const normalizedMimeType = String(mimeType || "").toLowerCase();
  const extension = path.extname(String(filename || "")).toLowerCase();
  if (PDF_MIME_TYPES.has(normalizedMimeType) || extension === ".pdf") {
    return "pdf";
  }
  if (normalizedMimeType.startsWith(IMAGE_MIME_PREFIX)) {
    return "image";
  }
  if ([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"].includes(extension)) {
    return "image";
  }
  return null;
}

async function extractPdfText(buffer) {
  let PDFParse;
  try {
    ({ PDFParse } = require("pdf-parse"));
  } catch (_error) {
    throw new Error("PDF extraction dependencies are unavailable");
  }
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return normalizeText(result?.text || "");
  } finally {
    if (typeof parser.destroy === "function") {
      await parser.destroy();
    }
  }
}

async function extractImageText(buffer) {
  let Tesseract;
  try {
    Tesseract = require("tesseract.js");
  } catch (_error) {
    throw new Error("OCR dependencies are unavailable");
  }
  const preprocessedBuffer = await preprocessImage(buffer);
  const ocrResult = await Tesseract.recognize(preprocessedBuffer, "eng", {
    logger: () => {},
  });
  return normalizeText(ocrResult?.data?.text || "");
}

function isLowQualityPdfText(rawText) {
  const text = normalizeText(rawText);
  if (!text) {
    return true;
  }
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    return true;
  }
  const alphanumericLength = text.replace(/[^a-z0-9]/gi, "").length;
  return alphanumericLength < 24;
}

async function extractText({ buffer, mimeType, filename }) {
  const sourceType = inferSourceType({ mimeType, filename });
  if (!sourceType) {
    throw new Error("Only PDF and image uploads are supported");
  }

  if (sourceType === "pdf") {
    const rawText = await extractPdfText(buffer);
    if (isLowQualityPdfText(rawText)) {
      return {
        sourceType,
        rawText,
        quality: "low",
        errorMessage:
          "PDF text extraction returned insufficient text. OCR fallback for PDFs is not enabled yet.",
      };
    }
    return {
      sourceType,
      rawText,
      quality: "good",
      errorMessage: null,
    };
  }

  const rawText = await extractImageText(buffer);
  if (!rawText) {
    return {
      sourceType,
      rawText,
      quality: "low",
      errorMessage: "OCR did not return usable text from the uploaded image.",
    };
  }

  return {
    sourceType,
    rawText,
    quality: "good",
    errorMessage: null,
  };
}

module.exports = {
  extractText,
  inferSourceType,
};
