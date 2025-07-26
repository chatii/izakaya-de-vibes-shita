export class ImagePreprocessor {
  static async enhanceForOCR(imageData: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        this.enhanceContrast(data);
        this.reduceNoise(data, canvas.width, canvas.height);
        this.binarizeForText(data);
        
        ctx.putImageData(imageData, 0, 0);
        
        resolve(canvas.toDataURL());
      };
      img.src = imageData;
    });
  }

  static detectTextOrientation(imageData: string): Promise<'horizontal' | 'vertical'> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const orientation = this.analyzeTextOrientation(imgData);
        
        resolve(orientation);
      };
      img.src = imageData;
    });
  }

  private static enhanceContrast(data: Uint8ClampedArray): void {
    const factor = 1.5; // Contrast enhancement factor
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * factor + 128));     // Red
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128)); // Green
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128)); // Blue
    }
  }

  private static reduceNoise(data: Uint8ClampedArray, width: number, height: number): void {
    const original = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        const neighbors: number[] = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            const gray = (original[nIdx] + original[nIdx + 1] + original[nIdx + 2]) / 3;
            neighbors.push(gray);
          }
        }
        
        neighbors.sort((a, b) => a - b);
        const median = neighbors[4]; // Middle value of 9 pixels
        
        data[idx] = median;
        data[idx + 1] = median;
        data[idx + 2] = median;
      }
    }
  }

  private static binarizeForText(data: Uint8ClampedArray): void {
    const threshold = 128;
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      
      const binary = gray > threshold ? 255 : 0;
      
      data[i] = binary;     // Red
      data[i + 1] = binary; // Green
      data[i + 2] = binary; // Blue
    }
  }

  private static analyzeTextOrientation(imageData: ImageData): 'horizontal' | 'vertical' {
    const { data, width, height } = imageData;
    
    let horizontalEdges = 0;
    let verticalEdges = 0;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        // const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        const left = (data[idx - 4] + data[idx - 3] + data[idx - 2]) / 3;
        const right = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
        const horizontalGradient = Math.abs(right - left);
        
        const top = (data[(y - 1) * width * 4 + x * 4] + data[(y - 1) * width * 4 + x * 4 + 1] + data[(y - 1) * width * 4 + x * 4 + 2]) / 3;
        const bottom = (data[(y + 1) * width * 4 + x * 4] + data[(y + 1) * width * 4 + x * 4 + 1] + data[(y + 1) * width * 4 + x * 4 + 2]) / 3;
        const verticalGradient = Math.abs(bottom - top);
        
        if (horizontalGradient > 50) horizontalEdges++;
        if (verticalGradient > 50) verticalEdges++;
      }
    }
    
    return horizontalEdges > verticalEdges ? 'vertical' : 'horizontal';
  }

  static async rotateImage(imageData: string, angle: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        const radians = (angle * Math.PI) / 180;
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));
        
        canvas.width = img.width * cos + img.height * sin;
        canvas.height = img.width * sin + img.height * cos;
        
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(radians);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        resolve(canvas.toDataURL());
      };
      img.src = imageData;
    });
  }

  static async resizeForOCR(imageData: string, maxWidth: number = 1200): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL());
      };
      img.src = imageData;
    });
  }
}
