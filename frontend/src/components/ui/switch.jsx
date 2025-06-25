"use client"

import * as React from "react"

const Switch = React.forwardRef(({ className = "", checked = false, onCheckedChange, disabled = false, ...props }, ref) => {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      ref={ref}
      className={`
        inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent 
        transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50 
        ${checked ? 'bg-blue-600' : 'bg-gray-200'} 
        ${className}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      {...props}
    >
      <span
        className={`
          pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg transition-transform
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  )
})

Switch.displayName = "Switch"

export { Switch } 