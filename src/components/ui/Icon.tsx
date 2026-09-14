interface IconProps {
  name: string
  className?: string
  filled?: boolean
}

export function Icon({ name, className = '', filled = false }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined select-none leading-none ${
        filled ? 'material-symbols-filled' : ''
      } ${className}`}
    >
      {name}
    </span>
  )
}
