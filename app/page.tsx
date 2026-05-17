'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <span className="font-bold text-gray-800">PremierPas</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/game')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold">
              🎮 Jouer
            </button>
            <button onClick={() => router.push('/login')} className="px-4 py-2 text-blue-600 hover:underline">
              Connexion
            </button>
            <button onClick={() => router.push('/login')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Essai gratuit
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center px-6 py-20">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Le lien entre la crèche et les parents 👶
        </h1>
        <p className="text-xl text-gray-500 mb-8">
          Repas, siestes, photos — les parents suivent la journée de leur enfant en temps réel.
        </p>
        <button onClick={() => router.push('/login')} className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700">
          Demander une démo gratuite
        </button>
      </section>

      {/* Features */}
      <section className="px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl p-6 shadow">
          <div className="text-3xl mb-3">🍽️</div>
          <h3 className="font-bold text-gray-800 mb-1">Repas en temps réel</h3>
          <p className="text-gray-500 text-sm">Les parents savent exactement ce qu'a mangé leur enfant.</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow">
          <div className="text-3xl mb-3">💤</div>
          <h3 className="font-bold text-gray-800 mb-1">Suivi des siestes</h3>
          <p className="text-gray-500 text-sm">Heure d'endormissement et de réveil notifiée instantanément.</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow">
          <div className="text-3xl mb-3">📸</div>
          <h3 className="font-bold text-gray-800 mb-1">Photos du jour</h3>
          <p className="text-gray-500 text-sm">Les moments précieux partagés directement sur l'app.</p>
        </div>
      </section>
    </main>
  )
}