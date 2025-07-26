import { useState, useRef, useEffect } from 'react'
import { Camera, Plus, Minus, Trash2, Upload, Scan, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { multiEngineOCR, OCRResult } from './services/ocrService'
import { ImagePreprocessor } from './services/imagePreprocessor'
import { OCRResultSelector } from './services/resultSelector'
declare global {
  interface Window {
    Tesseract: any;
  }
}


import './App.css'

interface DrinkItem {
  id: string
  name: string
  price: string
  count: number
}

interface OCRDisplayResult {
  status: 'idle' | 'success' | 'error' | 'no-items'
  message: string
  extractedText: string
  itemsFound: number
  confidence?: number
  engine?: string
}

function App() {
  const [menuImage, setMenuImage] = useState<string | null>(null)
  const [drinkItems, setDrinkItems] = useState<DrinkItem[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [ocrResult, setOcrResult] = useState<OCRDisplayResult>({
    status: 'idle',
    message: '',
    extractedText: '',
    itemsFound: 0
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      multiEngineOCR.cleanup().catch(console.warn)
    }
  }, [])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setMenuImage(e.target?.result as string)
        setOcrResult({
          status: 'idle',
          message: '',
          extractedText: '',
          itemsFound: 0
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const analyzeMenuImage = async () => {
    if (!menuImage) return

    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setOcrResult({
      status: 'idle',
      message: '画像解析を開始しています...',
      extractedText: '',
      itemsFound: 0
    })

    try {
      setAnalysisProgress(10)
      setOcrResult(prev => ({ ...prev, message: 'OCRエンジンを初期化しています...' }))
      await multiEngineOCR.initialize()

      setAnalysisProgress(20)
      setOcrResult(prev => ({ ...prev, message: '画像を前処理しています...' }))
      const orientation = await ImagePreprocessor.detectTextOrientation(menuImage)
      const enhancedImage = await ImagePreprocessor.enhanceForOCR(menuImage)

      setAnalysisProgress(40)
      setOcrResult(prev => ({ ...prev, message: '複数のOCRエンジンで解析中...' }))
      
      let ocrResults: OCRResult[] = []
      
      const mixedResults = await multiEngineOCR.recognizeText(enhancedImage, 'mixed')
      ocrResults.push(...mixedResults)

      const hasItems = ocrResults.some(result => result.items.length > 0)
      if (!hasItems && orientation === 'vertical') {
        setAnalysisProgress(60)
        setOcrResult(prev => ({ ...prev, message: '縦書きテキスト認識を試行中...' }))
        const verticalResults = await multiEngineOCR.recognizeText(enhancedImage, 'printed', { orientation: 'vertical' })
        ocrResults.push(...verticalResults)
      }

      setAnalysisProgress(80)
      setOcrResult(prev => ({ ...prev, message: '結果を分析中...' }))
      
      const filteredResults = OCRResultSelector.filterLowConfidenceResults(ocrResults, 0.1)
      const bestResult = filteredResults.length > 0 
        ? OCRResultSelector.selectBestResults(filteredResults)
        : OCRResultSelector.selectBestResults(ocrResults)

      setAnalysisProgress(100)

      if (bestResult.items.length === 0) {
        setOcrResult({
          status: 'no-items',
          message: bestResult.text.trim().length === 0 
            ? 'テキストが検出されませんでした。画像が鮮明で文字が読みやすいかご確認ください。'
            : `ドリンクアイテムが見つかりませんでした。${bestResult.engine}エンジンで解析しましたが、該当する項目を特定できませんでした。手動で追加してください。`,
          extractedText: bestResult.text,
          itemsFound: 0,
          confidence: bestResult.confidence,
          engine: bestResult.engine
        })
      } else {
        bestResult.items.forEach((item: { name: string; price: string }) => {
          const newItem: DrinkItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: item.name,
            price: item.price,
            count: 0
          }
          setDrinkItems(prev => [...prev, newItem])
        })

        setOcrResult({
          status: 'success',
          message: `${bestResult.items.length}個のドリンクアイテムを検出しました。${bestResult.engine}エンジンを使用。数量を調整してください。`,
          extractedText: bestResult.text,
          itemsFound: bestResult.items.length,
          confidence: bestResult.confidence,
          engine: bestResult.engine
        })
      }

    } catch (error: any) {
      console.error('Multi-engine OCR analysis failed:', error)
      
      let errorMessage = '高度なOCR解析中にエラーが発生しました。'
      
      if (error.message?.includes('initialize')) {
        errorMessage = 'OCRエンジンの初期化に失敗しました。ページを再読み込みしてお試しください。'
      } else if (error.message?.includes('recognize') || error.message?.includes('detection')) {
        errorMessage = '画像認識処理に失敗しました。画像形式や品質をご確認ください。'
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'ネットワークエラーが発生しました。インターネット接続をご確認ください。'
      } else if (error.message?.includes('memory') || error.message?.includes('quota')) {
        errorMessage = 'メモリ不足です。他のタブを閉じてお試しください。'
      }
      
      setOcrResult({
        status: 'error',
        message: `${errorMessage} (詳細: ${error.message})`,
        extractedText: '',
        itemsFound: 0
      })
    } finally {
      setIsAnalyzing(false)
      setAnalysisProgress(0)
    }
  }


  const addDrinkItem = () => {
    if (newItemName.trim() && newItemPrice.trim()) {
      const newItem: DrinkItem = {
        id: Date.now().toString(),
        name: newItemName.trim(),
        price: newItemPrice.trim(),
        count: 0
      }
      setDrinkItems([...drinkItems, newItem])
      setNewItemName('')
      setNewItemPrice('')
    }
  }

  const updateCount = (id: string, change: number) => {
    setDrinkItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, count: Math.max(0, item.count + change) }
          : item
      )
    )
  }

  const removeItem = (id: string) => {
    setDrinkItems(items => items.filter(item => item.id !== id))
  }

  const getTotalItems = () => {
    return drinkItems.reduce((total, item) => total + item.count, 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🍻 居酒屋ドリンクカウンター</h1>
          <p className="text-gray-600">メニュー写真から飲み物を選んで注文をまとめよう</p>
        </header>

        {/* Menu Image Upload Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              メニュー写真をアップロード
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                variant="outline"
              >
                <Upload className="w-4 h-4 mr-2" />
                写真を選択
              </Button>
              {menuImage && (
                <div className="mt-4 space-y-4">
                  <img
                    src={menuImage}
                    alt="メニュー写真"
                    className="w-full max-w-md mx-auto rounded-lg shadow-md"
                  />
                  <Button
                    onClick={analyzeMenuImage}
                    disabled={isAnalyzing}
                    className="w-full"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        画像解析中... {analysisProgress}%
                      </>
                    ) : (
                      <>
                        <Scan className="w-4 h-4 mr-2" />
                        メニューを自動解析
                      </>
                    )}
                  </Button>
                  
                  {/* OCR Result Display */}
                  {ocrResult.status !== 'idle' && (
                    <div className="mt-4 space-y-3">
                      <div className={`p-4 rounded-lg border ${
                        ocrResult.status === 'success' ? 'bg-green-50 border-green-200' :
                        ocrResult.status === 'error' ? 'bg-red-50 border-red-200' :
                        'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {ocrResult.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                          {ocrResult.status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                          {ocrResult.status === 'no-items' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                          <span className={`font-medium ${
                            ocrResult.status === 'success' ? 'text-green-800' :
                            ocrResult.status === 'error' ? 'text-red-800' :
                            'text-yellow-800'
                          }`}>
                            解析結果 {ocrResult.engine && `(${ocrResult.engine})`}
                          </span>
                        </div>
                        {ocrResult.confidence !== undefined && (
                          <p className="text-xs text-gray-600 mb-2">
                            信頼度: {Math.round(ocrResult.confidence * 100)}%
                          </p>
                        )}
                        <p className={`text-sm ${
                          ocrResult.status === 'success' ? 'text-green-700' :
                          ocrResult.status === 'error' ? 'text-red-700' :
                          'text-yellow-700'
                        }`}>
                          {ocrResult.message}
                        </p>
                      </div>
                      
                      {ocrResult.extractedText && (
                        <details className="bg-gray-50 border border-gray-200 rounded-lg">
                          <summary className="p-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100">
                            抽出されたテキストを表示 ({ocrResult.extractedText.length}文字)
                          </summary>
                          <div className="p-3 border-t border-gray-200">
                            <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                              {ocrResult.extractedText}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add New Drink Item */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>ドリンクアイテムを追加</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="ドリンク名 (例: ビール)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1 min-w-48"
              />
              <Input
                placeholder="価格 (例: ¥500)"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                className="w-32"
              />
              <Button onClick={addDrinkItem} disabled={!newItemName.trim() || !newItemPrice.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                追加
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Drink Items List */}
        {drinkItems.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                注文リスト
                <span className="text-sm font-normal text-gray-600">
                  合計: {getTotalItems()}杯
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {drinkItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">{item.name}</h3>
                      <p className="text-sm text-gray-600">{item.price}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCount(item.id, -1)}
                        disabled={item.count === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-medium text-lg">
                        {item.count}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCount(item.id, 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {drinkItems.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Camera className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">
                メニュー写真をアップロードして、ドリンクアイテムを追加してください
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App
