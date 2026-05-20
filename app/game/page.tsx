'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const GAME_CONFIG = {
  maxLives: 3,
  initialSpawnInterval: 1400,
  minSpawnInterval: 400,
  spawnDecreaseRate: 20,
  baseSpeed: 1.8,
  speedIncreasePerLevel: 0.4,
  levelUpScore: 10,
}

type Blob = {
  id: number
  x: number
  y: number
  radius: number
  speed: number
  color: string
  emoji: string
  points: number
  opacity: number
  dying: boolean
  dyingFrame: number
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  life: number
  maxLife: number
  radius: number
}

const BLOBS = [
  { emoji: '👾', color: '#7c3aed', points: 1, radius: 32 },
  { emoji: '🛸', color: '#0891b2', points: 2, radius: 28 },
  { emoji: '☄️', color: '#dc2626', points: 1, radius: 26 },
  { emoji: '🌟', color: '#d97706', points: 3, radius: 22 },
  { emoji: '💎', color: '#059669', points: 5, radius: 20 },
]

let nextId = 0

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    blobs: [] as Blob[],
    particles: [] as Particle[],
    score: 0,
    lives: GAME_CONFIG.maxLives,
    level: 1,
    running: false,
    spawnInterval: GAME_CONFIG.initialSpawnInterval,
    frameId: 0,
    spawnTimeoutId: 0 as unknown as ReturnType<typeof setTimeout>,
    lastTime: 0,
    scoreDisplay: 0,
    combo: 0,
    comboTimer: 0,
    shakeFrames: 0,
  })

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle')
  const [displayScore, setDisplayScore] = useState(0)
  const [displayLives, setDisplayLives] = useState(GAME_CONFIG.maxLives)
  const [displayLevel, setDisplayLevel] = useState(1)
  const [bestScore, setBestScore] = useState(0)

  const getCanvasSize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    return { w, h }
  }

  const spawnBlob = useCallback(() => {
    const s = stateRef.current
    if (!s.running) return
    const { w } = getCanvasSize()
    const template = BLOBS[Math.floor(Math.random() * BLOBS.length)]
    const r = template.radius
    const blob: Blob = {
      id: nextId++,
      x: r + Math.random() * (w - r * 2),
      y: -r * 2,
      radius: r,
      speed: (GAME_CONFIG.baseSpeed + (s.level - 1) * GAME_CONFIG.speedIncreasePerLevel) * (0.8 + Math.random() * 0.4),
      color: template.color,
      emoji: template.emoji,
      points: template.points,
      opacity: 1,
      dying: false,
      dyingFrame: 0,
    }
    s.blobs.push(blob)

    const nextDelay = Math.max(
      GAME_CONFIG.minSpawnInterval,
      s.spawnInterval - s.level * GAME_CONFIG.spawnDecreaseRate
    )
    s.spawnTimeoutId = setTimeout(spawnBlob, nextDelay)
  }, [])

  const spawnParticles = (x: number, y: number, color: string, count = 8) => {
    const s = stateRef.current
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 2 + Math.random() * 4
      s.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 40,
        maxLife: 40,
        radius: 4 + Math.random() * 4,
      })
    }
  }

  const handleTap = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const s = stateRef.current
    if (!s.running) return

    let hit = false
    for (const blob of s.blobs) {
      if (blob.dying) continue
      const dx = blob.x - x
      const dy = blob.y - y
      if (Math.sqrt(dx * dx + dy * dy) < blob.radius + 12) {
        blob.dying = true
        hit = true
        s.combo++
        s.comboTimer = 60
        const pts = blob.points * (s.combo >= 3 ? 2 : 1)
        s.score += pts
        s.level = Math.floor(s.score / GAME_CONFIG.levelUpScore) + 1
        spawnParticles(blob.x, blob.y, blob.color, 10)
        setDisplayScore(s.score)
        setDisplayLevel(s.level)
        break
      }
    }
    if (!hit) {
      s.combo = 0
    }
  }, [])

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const s = stateRef.current
    const { w, h } = getCanvasSize()

    canvas.width = w
    canvas.height = h

    let shakeX = 0, shakeY = 0
    if (s.shakeFrames > 0) {
      shakeX = (Math.random() - 0.5) * 10
      shakeY = (Math.random() - 0.5) * 10
      s.shakeFrames--
    }
    ctx.save()
    ctx.translate(shakeX, shakeY)

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#0f0c29')
    grad.addColorStop(1, '#302b63')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137 + 17) % w)
      const sy = ((i * 251 + 31) % h)
      const sr = i % 3 === 0 ? 1.5 : 0.8
      ctx.beginPath()
      ctx.arc(sx, sy, sr, 0, Math.PI * 2)
      ctx.fill()
    }

    // Particles
    s.particles = s.particles.filter(p => p.life > 0)
    for (const p of s.particles) {
      const alpha = p.life / p.maxLife
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.radius * alpha, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.1
      p.life--
    }

    // Blobs
    s.blobs = s.blobs.filter(b => {
      if (b.dying) {
        b.dyingFrame++
        return b.dyingFrame < 12
      }
      return b.y - b.radius < h + 10
    })

    for (const blob of s.blobs) {
      ctx.save()
      if (blob.dying) {
        const scale = 1 + blob.dyingFrame * 0.15
        const alpha = 1 - blob.dyingFrame / 12
        ctx.globalAlpha = alpha
        ctx.translate(blob.x, blob.y)
        ctx.scale(scale, scale)
        ctx.translate(-blob.x, -blob.y)
      }

      // Glow
      const glow = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius * 1.4)
      glow.addColorStop(0, blob.color + 'aa')
      glow.addColorStop(1, blob.color + '00')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(blob.x, blob.y, blob.radius * 1.4, 0, Math.PI * 2)
      ctx.fill()

      // Emoji
      ctx.font = `${blob.radius * 1.3}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(blob.emoji, blob.x, blob.y)

      ctx.restore()

      if (!blob.dying) {
        blob.y += blob.speed

        // Reached bottom
        if (blob.y - blob.radius > h) {
          blob.dying = true
          s.lives--
          s.shakeFrames = 8
          s.combo = 0
          setDisplayLives(s.lives)
          if (s.lives <= 0) {
            s.running = false
            clearTimeout(s.spawnTimeoutId)
            setBestScore(prev => Math.max(prev, s.score))
            setGameState('over')
          }
        }
      }
    }

    // Combo text
    if (s.comboTimer > 0) {
      s.comboTimer--
      if (s.combo >= 3) {
        const alpha = Math.min(1, s.comboTimer / 20)
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#fbbf24'
        ctx.font = `bold ${28 + s.combo * 3}px system-ui`
        ctx.textAlign = 'center'
        ctx.shadowColor = '#f59e0b'
        ctx.shadowBlur = 10
        ctx.fillText(`x${s.combo} COMBO!`, w / 2, h / 2 - 20)
        ctx.restore()
      }
    }

    ctx.restore()
    s.frameId = requestAnimationFrame(draw)
  }, [])

  const startGame = useCallback(() => {
    const s = stateRef.current
    clearTimeout(s.spawnTimeoutId)
    cancelAnimationFrame(s.frameId)

    s.blobs = []
    s.particles = []
    s.score = 0
    s.lives = GAME_CONFIG.maxLives
    s.level = 1
    s.running = true
    s.spawnInterval = GAME_CONFIG.initialSpawnInterval
    s.combo = 0
    s.comboTimer = 0
    s.shakeFrames = 0

    setDisplayScore(0)
    setDisplayLives(GAME_CONFIG.maxLives)
    setDisplayLevel(1)
    setGameState('playing')

    s.spawnTimeoutId = setTimeout(spawnBlob, 500)
    s.frameId = requestAnimationFrame(draw)
  }, [spawnBlob, draw])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(stateRef.current.frameId)
      clearTimeout(stateRef.current.spawnTimeoutId)
    }
  }, [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      handleTap(e.changedTouches[i].clientX, e.changedTouches[i].clientY)
    }
  }, [handleTap])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    handleTap(e.clientX, e.clientY)
  }, [handleTap])

  const livesDisplay = Array.from({ length: GAME_CONFIG.maxLives }, (_, i) => i < displayLives ? '❤️' : '🖤')

  return (
    <div className="fixed inset-0 overflow-hidden touch-none select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onTouchStart={onTouchStart}
        onMouseDown={onMouseDown}
        style={{ touchAction: 'none' }}
      />

      {/* HUD */}
      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 pt-12 pb-3 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
          <div className="text-white text-2xl font-bold drop-shadow">
            {livesDisplay.join(' ')}
          </div>
          <div className="text-center">
            <div className="text-white text-3xl font-black drop-shadow">{displayScore}</div>
            <div className="text-purple-300 text-xs font-semibold">Niveau {displayLevel}</div>
          </div>
        </div>
      )}

      {/* Start screen */}
      {gameState === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8"
          style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
          <div className="text-6xl mb-4">👾</div>
          <h1 className="text-white text-4xl font-black mb-2 text-center">Space Tap</h1>
          <p className="text-purple-300 text-center text-lg mb-10">
            Tape sur les envahisseurs avant qu'ils atteignent le bas !
          </p>
          <div className="grid grid-cols-3 gap-3 mb-10 w-full max-w-xs">
            {BLOBS.map(b => (
              <div key={b.emoji} className="flex flex-col items-center bg-white/10 rounded-2xl p-3">
                <span className="text-3xl">{b.emoji}</span>
                <span className="text-yellow-300 text-sm font-bold mt-1">+{b.points} pt{b.points > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
          <button
            onTouchStart={(e) => { e.preventDefault(); startGame() }}
            onClick={startGame}
            className="w-full max-w-xs py-5 bg-purple-600 active:bg-purple-700 text-white text-2xl font-black rounded-3xl shadow-2xl"
            style={{ boxShadow: '0 0 30px rgba(124,58,237,0.7)' }}>
            JOUER
          </button>
          <p className="text-purple-400 text-xs mt-6">
            3 combos → points doublés !
          </p>
        </div>
      )}

      {/* Game over screen */}
      {gameState === 'over' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8"
          style={{ background: 'linear-gradient(135deg, #1a0a0a, #3d0000, #1a0a0a)' }}>
          <div className="text-6xl mb-4">💥</div>
          <h2 className="text-white text-4xl font-black mb-6">Game Over</h2>
          <div className="bg-white/10 rounded-3xl p-6 mb-8 w-full max-w-xs text-center">
            <p className="text-purple-300 text-sm mb-1">Score</p>
            <p className="text-white text-5xl font-black">{displayScore}</p>
            {displayScore >= bestScore && displayScore > 0 && (
              <p className="text-yellow-400 text-sm mt-2 font-bold">Nouveau record ! 🏆</p>
            )}
            <div className="mt-4 border-t border-white/20 pt-4">
              <p className="text-purple-300 text-sm mb-1">Meilleur score</p>
              <p className="text-white text-2xl font-bold">{bestScore}</p>
            </div>
          </div>
          <button
            onTouchStart={(e) => { e.preventDefault(); startGame() }}
            onClick={startGame}
            className="w-full max-w-xs py-5 bg-red-600 active:bg-red-700 text-white text-2xl font-black rounded-3xl shadow-2xl mb-4"
            style={{ boxShadow: '0 0 30px rgba(220,38,38,0.7)' }}>
            REJOUER
          </button>
        </div>
      )}
    </div>
  )
}
