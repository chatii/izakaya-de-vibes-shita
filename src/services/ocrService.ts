// import { PaddleOcrService } from 'paddleocr';
// import * as ort from 'onnxruntime-web';

export interface OCRResult {
  text: string;
  confidence: number;
  engine: string;
  items: Array<{ name: string; price: string }>;
}

export interface OCROptions {
  orientation?: 'horizontal' | 'vertical';
  textType?: 'printed' | 'handwritten' | 'mixed';
}

export class MultiEngineOCR {
  // private paddleOcr: PaddleOcrService | null = null;
  private tesseractWorker: any = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.initializePaddleOCR();
      
      await this.initializeTesseract();
      
      this.initialized = true;
    } catch (error) {
      console.warn('OCR initialization failed:', error);
      throw new Error('OCR engines could not be initialized');
    }
  }

  private async initializePaddleOCR(): Promise<void> {
    try {
      console.log('PaddleOCR initialization placeholder');
    } catch (error) {
      console.warn('PaddleOCR initialization failed:', error);
    }
  }

  private async initializeTesseract(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.Tesseract) {
        this.tesseractWorker = await window.Tesseract.createWorker(['jpn', 'eng'], 1);
      }
    } catch (error) {
      console.warn('Tesseract initialization failed:', error);
    }
  }

  async recognizeText(
    imageData: string, 
    textType: 'printed' | 'handwritten' | 'mixed' = 'mixed',
    options: OCROptions = {}
  ): Promise<OCRResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const results: OCRResult[] = [];

    if (textType === 'printed' || textType === 'mixed') {
      try {
        const paddleResult = await this.recognizeWithPaddleOCR(imageData, options);
        if (paddleResult) results.push(paddleResult);
      } catch (error) {
        console.warn('PaddleOCR recognition failed:', error);
      }

      try {
        const tesseractResult = await this.recognizeWithTesseract(imageData, options);
        if (tesseractResult) results.push(tesseractResult);
      } catch (error) {
        console.warn('Tesseract recognition failed:', error);
      }
    }

    if (textType === 'handwritten' || textType === 'mixed') {
      try {
        const handwritingResult = await this.recognizeHandwriting(imageData);
        if (handwritingResult) results.push(handwritingResult);
      } catch (error) {
        console.warn('Handwriting recognition failed:', error);
      }
    }

    return results.length > 0 ? results : [this.createFallbackResult()];
  }

  private async recognizeWithPaddleOCR(_imageData: string, _options: OCROptions): Promise<OCRResult | null> {
    console.log('PaddleOCR recognition placeholder');
    return null;
  }

  private async recognizeWithTesseract(imageData: string, options: OCROptions): Promise<OCRResult | null> {
    if (!this.tesseractWorker) return null;

    try {
      if (options.orientation === 'vertical') {
        await this.tesseractWorker.setParameters({
          tessedit_pageseg_mode: window.Tesseract.PSM.SINGLE_BLOCK_VERT_TEXT
        });
      } else {
        await this.tesseractWorker.setParameters({
          tessedit_pageseg_mode: window.Tesseract.PSM.SINGLE_BLOCK
        });
      }

      const result = await this.tesseractWorker.recognize(imageData);
      
      return {
        text: result.data.text,
        confidence: result.data.confidence / 100,
        engine: 'Tesseract.js',
        items: this.extractDrinkItems(result.data.text, result.data.confidence / 100)
      };
    } catch (error) {
      console.error('Tesseract recognition error:', error);
      return null;
    }
  }

  private async recognizeHandwriting(_imageData: string): Promise<OCRResult | null> {
    console.log('Handwriting recognition placeholder');
    return null;
  }

  private extractDrinkItems(text: string, _confidence: number): Array<{ name: string; price: string }> {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const items: Array<{ name: string; price: string }> = [];
    
    const drinkKeywords = [
      'ビール', 'beer', 'ビア', 'びーる', '生ビール', '生', 'draft', 'ドラフト',
      '日本酒', 'sake', '酒', 'さけ', '純米', '吟醸', '大吟醸', '特別純米',
      '焼酎', 'shochu', 'しょうちゅう', '芋', '麦', '米焼酎', '芋焼酎', '麦焼酎',
      'ハイボール', 'highball', 'サワー', 'sour', 'チューハイ', 'chuhai',
      'カクテル', 'cocktail', 'ウイスキー', 'whiskey', 'ワイン', 'wine',
      'ジュース', 'juice', 'ソフトドリンク', 'soft drink', 'コーラ', 'cola',
      'ウーロン茶', 'oolong', 'お茶', 'tea', 'コーヒー', 'coffee', '緑茶', '紅茶',
      '梅酒', 'umeshu', 'レモンサワー', 'lemon sour', 'グレープフルーツサワー',
      '水', 'water', 'みず', 'ミネラルウォーター', 'mineral water'
    ];
    
    const priceRegex = /[¥￥]?\s*(\d{1,4})\s*[円¥￥]?|(\d{1,4})\s*円/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();
      
      const hasDrinkKeyword = drinkKeywords.some(keyword => 
        lowerLine.includes(keyword.toLowerCase()) || 
        line.includes(keyword) ||
        this.fuzzyMatch(line, keyword, 0.8)
      );
      
      if (hasDrinkKeyword) {
        const priceMatch = line.match(priceRegex);
        let price = '¥500'; // Default price
        let name = line;
        
        if (priceMatch) {
          price = `¥${priceMatch[1] || priceMatch[2]}`;
          name = line.replace(priceMatch[0], '').trim();
        } else {
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
            const nextLine = lines[j];
            const nextPriceMatch = nextLine.match(priceRegex);
            if (nextPriceMatch) {
              price = `¥${nextPriceMatch[1] || nextPriceMatch[2]}`;
              break;
            }
          }
        }
        
        if (name.length > 1 && name.length < 30) {
          name = name.replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '').trim();
          if (name.length > 0) {
            items.push({ name, price });
          }
        }
      }
    }
    
    return items.slice(0, 15); // Increased limit
  }

  private fuzzyMatch(str1: string, str2: string, threshold: number): boolean {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return true;
    
    const distance = this.levenshteinDistance(longer, shorter);
    const similarity = (longer.length - distance) / longer.length;
    
    return similarity >= threshold;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private createFallbackResult(): OCRResult {
    return {
      text: '',
      confidence: 0,
      engine: 'None',
      items: []
    };
  }

  async cleanup(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
    this.initialized = false;
  }
}

export const multiEngineOCR = new MultiEngineOCR();
