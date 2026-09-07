import { useState } from 'react'
import { spriteUrl } from '../../../shared/pokedex'

export default function Sprite({
  id,
  shiny = false,
  size = 96,
  silhouette = false,
  alt
}: {
  id: number
  shiny?: boolean
  size?: number
  silhouette?: boolean
  alt: string
}): JSX.Element {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="sprite-fallback" style={{ width: size, height: size, fontSize: size * 0.5 }}>
        ◓
      </div>
    )
  }

  return (
    <img
      className={silhouette ? 'sprite silhouette' : 'sprite'}
      src={spriteUrl(id, shiny)}
      width={size}
      height={size}
      alt={alt}
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}
