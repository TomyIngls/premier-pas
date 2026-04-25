'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Parents() {
  const [enfant, setEnfant] = useState<any>(null)
  const [repas, setRepas] = useState<any[]>([])
  const [siestes, setSiestes] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Trouver l'enfant lié au parent
      const { data: parentData } = await supabase
        .from('parents')
        .select('*, enfants(*)')
        .eq('user_id', user.id)
        .single()

      if (!parentData) { router.push('/login'); return }

      setEnfant(parentData.enfants)

      const enfantNom = parentData.enfants.nom

      // Récupérer les données du jour
      const today = new Date().toISOString().split('T')[0]

      const { data: repasData } = await supabase
        .from('repas')
        .select('*')
        .eq('enfant', enfantNom)
        .gte('date', today)

      const { data: siestesData } = await supabase
        .from('siestes')
        .select('*')
        .eq('enfant', enfantNom)
        .gte('date', today)

      const { data: photosData } = await supabase
        .from('photos')
        .select('*')
        .eq('enfant', enfantNom)
        .gte('date', today)

      setRepas(repasData || [])
      setSiestes(siestesData || [])
      setPhotos(photosData || [])
    }
    getData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold">P</div>
          <span className="font-bold text-gray-800">PremierPas</span>
        </div>
        <button onClick={handleLogout} className="text-gray-500 hover:text-red-500">Déconnexion</button>
      </header>
      <main className="px-6 py-10 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Bonjour 👋 {enfant ? `— Journée de ${enfant.nom}` : ''}
        </h1>
        <p className="text-gray-500 mb-8">Voici ce qui s'est passé aujourd'hui</p>

        {/* Repas */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="font-bold text-gray-800 mb-4">🍽️ Repas</h2>
          {repas.length === 0 ? <p className="text-gray-400">Aucun repas enregistré aujourd'hui</p> :
            repas.map((r, i) => (
              <div key={i} className="border-b py-2">
                <p className="font-medium">{r.repas}</p>
                <p className="text-gray-500 text-sm">{r.quantite} {r.note && `— ${r.note}`}</p>
              </div>
            ))
          }
        </div>

        {/* Siestes */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="font-bold text-gray-800 mb-4">😴 Siestes</h2>
          {siestes.length === 0 ? <p className="text-gray-400">Aucune sieste enregistrée aujourd'hui</p> :
            siestes.map((s, i) => (
              <div key={i} className="border-b py-2">
                <p className="font-medium">{s.heure_debut} → {s.heure_fin}</p>
                {s.note && <p className="text-gray-500 text-sm">{s.note}</p>}
              </div>
            ))
          }
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-bold text-gray-800 mb-4">📸 Photos</h2>
          {photos.length === 0 ? <p className="text-gray-400">Aucune photo partagée aujourd'hui</p> :
            <div className="grid grid-cols-2 gap-4">
              {photos.map((p, i) => (
                <div key={i}>
                  {p.photo_url && <img src={p.photo_url} alt={p.description} className="rounded-lg w-full" />}
                  {p.description && <p className="text-sm text-gray-500 mt-1">{p.description}</p>}
                </div>
              ))}
            </div>
          }
        </div>
      </main>
    </div>
  )
}