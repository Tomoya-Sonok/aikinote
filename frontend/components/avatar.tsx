'use client'

import { useState } from 'react'
import { clsx } from 'clsx'

interface AvatarProps {
  src?: string | null
  alt?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  fallback?: string
  className?: string
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-20 h-20 text-2xl',
}

export function Avatar({
  src,
  alt = 'Avatar',
  size = 'md',
  fallback,
  className,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  const showImage = src && !imageError
  const showFallback = !showImage

  // Generate initials from fallback text
  const getInitials = (text: string): string => {
    return text
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div
      className={clsx(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden',
        'bg-gray-100 text-gray-600 font-medium',
        sizeClasses[size],
        className
      )}
    >
      {/* Image */}
      {showImage && (
        <>
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
          <img
            src={src}
            alt={alt}
            className={clsx(
              'w-full h-full object-cover',
              imageLoading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </>
      )}

      {/* Fallback */}
      {showFallback && (
        <div className="flex items-center justify-center w-full h-full">
          {fallback ? (
            <span className="font-semibold select-none">
              {getInitials(fallback)}
            </span>
          ) : (
            <svg
              className="w-2/3 h-2/3 text-gray-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </div>
      )}

      {/* Loading state for initial load */}
      {showImage && imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

// Preset variants for common use cases
export function UserAvatar({
  user,
  size = 'md',
  className,
}: {
  user: {
    profile_image_url?: string | null
    name?: string
    email?: string
  }
  size?: AvatarProps['size']
  className?: string
}) {
  const fallbackText = user.name || user.email || 'User'

  return (
    <Avatar
      src={user.profile_image_url}
      alt={`${fallbackText} avatar`}
      size={size}
      fallback={fallbackText}
      className={className}
    />
  )
}

// Loading avatar placeholder
export function AvatarSkeleton({
  size = 'md',
  className,
}: {
  size?: AvatarProps['size']
  className?: string
}) {
  return (
    <div
      className={clsx(
        'rounded-full bg-gray-200 animate-pulse',
        sizeClasses[size],
        className
      )}
    />
  )
}