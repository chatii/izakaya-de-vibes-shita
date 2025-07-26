import { OCRResult } from './ocrService';

export class OCRResultSelector {
  static selectBestResults(results: OCRResult[]): OCRResult {
    if (results.length === 0) {
      return {
        text: '',
        confidence: 0,
        engine: 'None',
        items: []
      };
    }

    if (results.length === 1) {
      return results[0];
    }

    return results.reduce((best, current) => {
      const bestScore = this.calculateScore(best);
      const currentScore = this.calculateScore(current);
      return currentScore > bestScore ? current : best;
    });
  }

  private static calculateScore(result: OCRResult): number {
    let score = 0;

    score += result.confidence * 0.4;

    score += Math.min(result.items.length / 10, 1) * 0.3;

    score += this.analyzeTextQuality(result.text) * 0.3;

    return score;
  }

  private static analyzeTextQuality(text: string): number {
    if (!text || text.trim().length === 0) return 0;

    let qualityScore = 0;

    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    if (japaneseRegex.test(text)) {
      qualityScore += 0.3;
    }

    const priceRegex = /[¥￥]\s*\d+|(\d+)\s*円/g;
    const priceMatches = text.match(priceRegex);
    if (priceMatches && priceMatches.length > 0) {
      qualityScore += Math.min(priceMatches.length / 5, 0.3);
    }

    const drinkKeywords = [
      'ビール', 'beer', '日本酒', 'sake', '焼酎', 'shochu', 'ハイボール', 'highball',
      'サワー', 'sour', 'チューハイ', 'chuhai', 'カクテル', 'cocktail', 'ワイン', 'wine',
      'ジュース', 'juice', 'コーラ', 'cola', 'お茶', 'tea', 'コーヒー', 'coffee'
    ];

    const keywordCount = drinkKeywords.reduce((count, keyword) => {
      return count + (text.toLowerCase().includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);

    qualityScore += Math.min(keywordCount / 10, 0.4);

    return Math.min(qualityScore, 1);
  }

  static combineResults(results: OCRResult[]): OCRResult {
    if (results.length === 0) {
      return this.selectBestResults([]);
    }

    const combinedText = results.map(r => r.text).join('\n');
    
    const allItems = results.flatMap(r => r.items);
    const uniqueItems = this.deduplicateItems(allItems);

    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
    const avgConfidence = totalConfidence / results.length;

    const engines = results.map(r => r.engine).filter(e => e !== 'None').join(' + ');

    return {
      text: combinedText,
      confidence: avgConfidence,
      engine: engines || 'Combined',
      items: uniqueItems
    };
  }

  private static deduplicateItems(items: Array<{ name: string; price: string }>): Array<{ name: string; price: string }> {
    const seen = new Set<string>();
    const unique: Array<{ name: string; price: string }> = [];

    for (const item of items) {
      const key = `${item.name.toLowerCase()}-${item.price}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique;
  }

  static filterLowConfidenceResults(results: OCRResult[], minConfidence: number = 0.1): OCRResult[] {
    return results.filter(result => result.confidence >= minConfidence);
  }

  static rankResultsByRelevance(results: OCRResult[]): OCRResult[] {
    return results
      .map(result => ({
        ...result,
        score: this.calculateScore(result)
      }))
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...result }) => result);
  }
}
