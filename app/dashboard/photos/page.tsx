'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Photos() {
  const [enfant, setEnfant] = useState('')
  const [description, setDescription] = useState('')
  const [fichier, setFichier] = useState<File | null>(null)
  const [succes, setSucces] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    let photoUrl = ''

    if (fichier) {
      const fileName = `${Date.now()}_${fichier.name}`
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, fichier)

      if (!uploadError) {
        const { data } = supabase.storage.from('photos').getPublicUrl(fileName)
        photoUrl = data.publicUrl
      }
    }

    const { error } = await supabase.from('photos').insert([
      { enfant, description, photo_url: photoUrl, date: new Date().toISOString() }
    ])

    setLoading(false)

    if (!error) {
      setSucces(true)
      setEnfant('')
      setDescription('')
      setFichier(null)
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">📸 Ajouter une photo</h1>
        {succes && <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4">Photo ajoutée ✅</div>}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ex: Activité peinture"
              className="w-full border rounded-lg px-4 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setFichier(e.target.files?.[0] || null)}
              className="w-full border rounded-lg px-4 py-2"
            />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50">
            {loading ? 'Envoi...' : 'Ajouter la photo'}
          </button>
        </form>
      </main>
    </div>
  )
}