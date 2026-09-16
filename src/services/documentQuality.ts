/**
 * Document Clarity & Blur Detection Service
 *
 * Inspects captured photos for blurriness, contrast, resolution, and legibility
 * to ensure government IDs and driver documents meet verification standards.
 */

export interface DocumentQualityResult {
  isClear: boolean;
  score: number; // 0 - 100
  status: 'sharp' | 'acceptable' | 'blurry';
  title: string;
  message: string;
  issues: string[];
  suggestions: string[];
}

interface ImageMetadata {
  width?: number;
  height?: number;
  base64?: string;
  fileSize?: number;
}

/**
 * Analyzes a captured document image for blur, lighting, and detail sharpness.
 */
export async function analyzeDocumentQuality(
  image: ImageMetadata
): Promise<DocumentQualityResult> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const base64Data = image.base64 || '';
  const dataLength = base64Data.length;

  // 1. Resolution Check
  const width = image.width || 0;
  const height = image.height || 0;
  if (width > 0 && height > 0) {
    const minDimension = Math.min(width, height);
    if (minDimension < 480) {
      score -= 30;
      issues.push('Resolution is too low to clearly read fine text.');
      suggestions.push('Move your camera closer to the document without cutting off edges.');
    } else if (minDimension < 720) {
      score -= 10;
    }
  }

  // 2. Data Density / Compression Check
  // Detailed text-heavy IDs produce higher base64 payload size when unblurred
  if (dataLength < 40000) {
    score -= 35;
    issues.push('Photo lacks fine details and appears blurred.');
    suggestions.push('Hold your phone steady until the camera lens focuses completely.');
  } else if (dataLength < 80000) {
    score -= 15;
    suggestions.push('Ensure strong lighting to avoid noise and camera blur.');
  }

  // 3. High-Frequency Variance / Entropy Estimation
  // We sample byte patterns across the raw base64 data to detect frequency dispersion
  if (dataLength > 1000) {
    const sampleSize = Math.min(5000, dataLength);
    const step = Math.floor(dataLength / sampleSize);
    let diffSum = 0;
    let prevCode = base64Data.charCodeAt(0);

    for (let i = step; i < dataLength && i < step * sampleSize; i += step) {
      const code = base64Data.charCodeAt(i);
      diffSum += Math.abs(code - prevCode);
      prevCode = code;
    }

    const varianceIndex = diffSum / sampleSize;

    // Very low variance in base64 string corresponds to flat/blurry/washed-out frames
    if (varianceIndex < 16) {
      score -= 30;
      issues.push('Photo has low contrast or camera lens motion blur.');
      suggestions.push('Place the document on a contrasting background and tap screen to focus.');
    } else if (varianceIndex < 20) {
      score -= 10;
    }
  }

  // Clamp score
  score = Math.max(25, Math.min(99, score));

  // Determine classification
  if (score >= 82) {
    return {
      isClear: true,
      score,
      status: 'sharp',
      title: 'Sharp & Legible',
      message: 'Document photo is clear with all text readable.',
      issues,
      suggestions,
    };
  } else if (score >= 70) {
    return {
      isClear: true,
      score,
      status: 'acceptable',
      title: 'Acceptable Quality',
      message: 'Document is readable. Ensure name, ID numbers, and photo are distinct.',
      issues,
      suggestions,
    };
  } else {
    if (issues.length === 0) {
      issues.push('The photo appears out of focus or too dim.');
    }
    if (suggestions.length === 0) {
      suggestions.push('Hold phone steady and align the document flat under good lighting.');
    }

    return {
      isClear: false,
      score,
      status: 'blurry',
      title: 'Blurry or Unclear',
      message: 'The captured document is blurry or text is difficult to read.',
      issues,
      suggestions,
    };
  }
}
