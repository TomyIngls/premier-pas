'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Inscription() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleInscription = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Vérifier si le code enfant existe
    const { data: enfantData, error: enfantError } = await supabase
      .from('enfants')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (enfantError || !enfantData) {
      setError('Code enfant invalide. Demandez le code à la crèche.')
      return
    }

    // Créer le compte parent
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setError('Erreur lors de la création du compte.')
      return
    }

    // Lier le parent à l'enfant
    await supabase.from('parents').insert([{
      user_id: data.user?.id,
      enfant_id: enfantData.id,
      email
    }])

    router.push('/parents')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Créer un compte parent</h1>
        <p className="text-gray-500 mb-6">Entrez le code fourni par la crèche</p>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleInscription} className="space-y-4">
          <input
            type="email"
            placeholder="Votre email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
            required
          />
          <input
            type="password"
            placeholder="Créer un mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
            required
          />
          <input
            type="text"
            placeholder="Code enfant (ex: EMMA2024)"
            value={code}
            onChange={e => setCode(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 uppercase"
            required
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold">
            Créer mon compte
          </button>
        </form>
        <p className="text-center text-gray-500 mt-4">
          Déjà un compte ? <button onClick={() => router.push('/login')} className="text-blue-600">Se connecter</button>
        </p>
      </div>
    </div>
  )
}