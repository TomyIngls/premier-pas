'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Repas() {
  const [enfant, setEnfant] = useState('')
  const [repas, setRepas] = useState('')
  const [quantite, setQuantite] = useState('tout')
  const [note, setNote] = useState('')
  const [succes, setSucces] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('repas').insert([
      { enfant, repas, quantite, note, date: new Date().toISOString() }
    ])
    if (!error) {
      setSucces(true)
      setEnfant('')
      setRepas('')
      setQuantite('tout')
      setNote('')
      setTimeout(() => setSucces(false), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">P</div>
          <span className="font-bold text-gray-800">PremierPas</span>
        </div>
        <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-blue-600">
          ← Retour
        </button>
      </header>
      <main className="px-6 py-10 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">🍽️ Enregistrer un repas</h1>
        {succes && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4">Repas enregistré ✅</div>}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'enfant</label>
            <input
              type="text"
              value={enfant}
              onChange={e => setEnfant(e.target.value)}
              placeholder="Ex: Emma"
              className="w-full border rounded-lg px-4 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Repas</label>
            <input
              type="text"
              value={repas}
              onChange={e => setRepas(e.target.value)}
              placeholder="Ex: Purée de carottes"
              className="w-full border rounded-lg px-4 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité mangée</label>
            <select
              value={quantite}
              onChange={e => setQuantite(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
            >
              <option value="tout">Tout mangé 😊</option>
              <option value="moitie">La moitié 😐</option>
              <option value="peu">Peu mangé 😕</option>
              <option value="rien">Rien mangé 😢</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optionnel)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Remarques..."
              className="w-full border rounded-lg px-4 py-2"
              rows={3}
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold">
            Enregistrer
          </button>
        </form>
      </main>
    </div>
  )
}