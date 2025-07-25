import { useState, useRef } from 'react'
import { Camera, Plus, Minus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import './App.css'

interface DrinkItem {
  id: string
  name: string
  price: string
  count: number
}

function App() {
  const [menuImage, setMenuImage] = useState<string | null>(null)
  const [drinkItems, setDrinkItems] = useState<DrinkItem[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setMenuImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
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
                <div className="mt-4">
                  <img
                    src={menuImage}
                    alt="メニュー写真"
                    className="w-full max-w-md mx-auto rounded-lg shadow-md"
                  />
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
