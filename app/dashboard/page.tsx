'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
    }
    getUser()
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
        <button onClick={handleLogout} className="text-gray-500 hover:text-red-500">
          Déconnexion
        </button>
      </header>
      <main className="px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Bonjour 👋</h1>
        <p className="text-gray-500 mb-8">Bienvenue sur votre tableau de bord</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div onClick={() => router.push('/dashboard/repas')} className="bg-white rounded-2xl p-6 shadow cursor-pointer hover:shadow-md transition">
            <div className="text-3xl mb-3">🍽️</div>
            <h2 className="font-bold text-gray-800 mb-1">Repas</h2>
            <p className="text-gray-500 text-sm">Enregistrer les repas du jour</p>
          </div>
          <div onClick={() => router.push('/dashboard/siestes')} className="bg-white rounded-2xl p-6 shadow cursor-pointer hover:shadow-md transition">
            <div className="text-3xl mb-3">😴</div>
            <h2 className="font-bold text-gray-800 mb-1">Siestes</h2>
            <p className="text-gray-500 text-sm">Suivre les heures de sommeil</p>
          </div>
          <div onClick={() => router.push('/dashboard/photos')} className="bg-white rounded-2xl p-6 shadow cursor-pointer hover:shadow-md transition">
            <div className="text-3xl mb-3">📸</div>
            <h2 className="font-bold text-gray-800 mb-1">Photos</h2>
            <p className="text-gray-500 text-sm">Partager les moments du jour</p>
          </div>
        </div>
      </main>
    </div>
  )
}