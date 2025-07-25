import { useState, useRef } from 'react'
import { Camera, Plus, Minus, Trash2, Upload, Scan, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Tesseract from 'tesseract.js'
import './App.css'

interface DrinkItem {
  id: string
  name: string
  price: string
  count: number
}

interface OCRResult {
  status: 'idle' | 'success' | 'error' | 'no-items'
  message: string
  extractedText: string
  itemsFound: number
}

function App() {
  const [menuImage, setMenuImage] = useState<string | null>(null)
  const [drinkItems, setDrinkItems] = useState<DrinkItem[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [ocrResult, setOcrResult] = useState<OCRResult>({
    status: 'idle',
    message: '',
    extractedText: '',
    itemsFound: 0
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const result = await Tesseract.recognize(
        menuImage,
        'jpn+eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setAnalysisProgress(Math.round(m.progress * 100))
            }
          }
        }
      )

      const text = result.data.text
      const extractedItems = extractDrinkItems(text)
      
      if (extractedItems.length === 0) {
        setOcrResult({
          status: 'no-items',
          message: 'ドリンクアイテムが見つかりませんでした。手動で追加してください。',
          extractedText: text,
          itemsFound: 0
        })
      } else {
        extractedItems.forEach(item => {
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
          message: `${extractedItems.length}個のドリンクアイテムを追加しました！`,
          extractedText: text,
          itemsFound: extractedItems.length
        })
      }

    } catch (error) {
      console.error('OCR analysis failed:', error)
      setOcrResult({
        status: 'error',
        message: `画像解析に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        extractedText: '',
        itemsFound: 0
      })
    } finally {
      setIsAnalyzing(false)
      setAnalysisProgress(0)
    }
  }

  const extractDrinkItems = (text: string): { name: string; price: string }[] => {
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    const items: { name: string; price: string }[] = []
    
    const drinkKeywords = [
      'ビール', 'beer', 'ハイボール', 'highball', 'サワー', 'sour', 'チューハイ', 'chuhai',
      'ワイン', 'wine', '日本酒', 'sake', '焼酎', 'shochu', 'ウイスキー', 'whiskey',
      'カクテル', 'cocktail', 'ジュース', 'juice', 'ソフトドリンク', 'soft drink',
      'コーラ', 'cola', 'ウーロン茶', 'oolong', 'お茶', 'tea', 'コーヒー', 'coffee'
    ]
    
    const priceRegex = /[¥￥]?\s*(\d{1,4})\s*[円¥￥]?/
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const lowerLine = line.toLowerCase()
      
      const hasDrinkKeyword = drinkKeywords.some(keyword => 
        lowerLine.includes(keyword.toLowerCase()) || line.includes(keyword)
      )
      
      if (hasDrinkKeyword) {
        const priceMatch = line.match(priceRegex)
        let price = '¥500'
        let name = line
        
        if (priceMatch) {
          price = `¥${priceMatch[1]}`
          name = line.replace(priceMatch[0], '').trim()
        } else {
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
            const nextLine = lines[j]
            const nextPriceMatch = nextLine.match(priceRegex)
            if (nextPriceMatch) {
              price = `¥${nextPriceMatch[1]}`
              break
            }
          }
        }
        
        if (name.length > 1 && name.length < 20) {
          name = name.replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '').trim()
          if (name.length > 0) {
            items.push({ name, price })
          }
        }
      }
    }
    
    return items.slice(0, 10)
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
                            解析結果
                          </span>
                        </div>
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
