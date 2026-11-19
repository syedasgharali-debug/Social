import React, { useId } from 'react';
import { Platform, AdPlatform } from '../../types';

export type SocialBrandKey = Platform | AdPlatform | 'google_auth';

interface SocialLogoProps {
  platform: SocialBrandKey;
  size?: number;
  className?: string;
}

/**
 * Authentic, high-precision official vector brand logos for all 10 social networks,
 * ad platforms (Meta, TikTok, Google Ads), and Google Auth. Zero dummy letter badges.
 */
export function SocialLogo({ platform, size = 18, className = '' }: SocialLogoProps) {
  const uid = useId().replace(/:/g, '');

  switch (platform) {
    case 'instagram': {
      const gradId = `ig-grad-${uid}`;
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="Instagram"
        >
          <defs>
            <linearGradient id={gradId} x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F58529" />
              <stop offset="35%" stopColor="#DD2A7B" />
              <stop offset="70%" stopColor="#8134AF" />
              <stop offset="100%" stopColor="#515BD4" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="6" fill={`url(#${gradId})`} />
          <rect x="5.6" y="5.6" width="12.8" height="12.8" rx="3.8" stroke="#FFFFFF" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="3.1" stroke="#FFFFFF" strokeWidth="1.7" />
          <circle cx="16.1" cy="7.9" r="1.05" fill="#FFFFFF" />
        </svg>
      );
    }

    case 'tiktok':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="TikTok"
        >
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#0F172A" />
          <path
            d="M14.2 6.2c.65 1.12 1.72 1.9 3 2.02v2.15a5.15 5.15 0 0 1-3-.97v4.37a4.08 4.08 0 1 1-4.08-4.08c.26 0 .51.03.75.08v2.2a1.92 1.92 0 1 0 1.24 1.8V6.2h2.09Z"
            fill="#25F4EE"
            transform="translate(-0.6 -0.45)"
          />
          <path
            d="M14.2 6.2c.65 1.12 1.72 1.9 3 2.02v2.15a5.15 5.15 0 0 1-3-.97v4.37a4.08 4.08 0 1 1-4.08-4.08c.26 0 .51.03.75.08v2.2a1.92 1.92 0 1 0 1.24 1.8V6.2h2.09Z"
            fill="#FE2C55"
            transform="translate(0.6 0.45)"
          />
          <path
            d="M14.2 6.2c.65 1.12 1.72 1.9 3 2.02v2.15a5.15 5.15 0 0 1-3-.97v4.37a4.08 4.08 0 1 1-4.08-4.08c.26 0 .51.03.75.08v2.2a1.92 1.92 0 1 0 1.24 1.8V6.2h2.09Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'linkedin':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="LinkedIn"
        >
          <rect x="2" y="2" width="20" height="20" rx="4.5" fill="#0A66C2" />
          <path
            d="M7.6 10.2v7.2H5.3v-7.2h2.3ZM6.45 6.5a1.34 1.34 0 1 1 0 2.68 1.34 1.34 0 0 1 0-2.68Zm5.12 3.7v1c.48-.74 1.25-1.22 2.47-1.22 1.84 0 3.16 1.2 3.16 3.74v3.68h-2.3v-3.36c0-.95-.34-1.6-1.22-1.6-.68 0-1.08.45-1.26.9-.06.16-.08.38-.08.6v3.46h-2.3v-7.2h2.3-.77Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'x':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="X"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#0F172A" />
          <path
            d="M15.48 6.25h2.14l-4.68 5.34 5.5 7.16h-4.3l-3.37-4.4-3.85 4.4H4.78l5-5.72-5.28-6.78h4.42l3.05 4.02 3.51-4.02Zm-.75 11.24h1.18L8.24 7.45H6.97l7.76 10.04Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'facebook':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="Facebook"
        >
          <circle cx="12" cy="12" r="10" fill="#1877F2" />
          <path
            d="M15.65 15.27 16.1 12.4h-2.76v-1.86c0-.79.38-1.56 1.62-1.56h1.26V6.53s-1.14-.2-2.23-.2c-2.28 0-3.77 1.38-3.77 3.88v2.2H7.68v2.86h2.54v6.92a10.2 10.2 0 0 0 3.12 0v-6.92h2.31Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'youtube':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="YouTube"
        >
          <path
            d="M21.58 7.19a2.51 2.51 0 0 0-1.77-1.78C18.25 5 12 5 12 5s-6.25 0-7.81.41a2.51 2.51 0 0 0-1.77 1.78C2 8.76 2 12 2 12s0 3.24.42 4.81a2.51 2.51 0 0 0 1.77 1.78C5.75 19 12 19 12 19s6.25 0 7.81-.41a2.51 2.51 0 0 0 1.77-1.78C22 15.24 22 12 22 12s0-3.24-.42-4.81Z"
            fill="#FF0000"
          />
          <path d="M10 15.15 15.2 12 10 8.85v6.3Z" fill="#FFFFFF" />
        </svg>
      );

    case 'pinterest':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="Pinterest"
        >
          <circle cx="12" cy="12" r="10" fill="#E60023" />
          <path
            d="M12.2 6.2c-3.17 0-4.96 2.13-4.96 4.46 0 1.09.58 2.44 1.51 2.87.14.07.22.04.25-.1l.24-.97c.03-.11.01-.2-.07-.3-.31-.38-.55-1.08-.55-1.73 0-1.67 1.27-3.28 3.43-3.28 1.87 0 3.17 1.27 3.17 3.09 0 2.06-1.04 3.49-2.4 3.49-.75 0-1.31-.62-1.13-1.38.22-.91.63-1.88.63-2.54 0-.59-.31-1.07-.96-1.07-.76 0-1.37.79-1.37 1.84 0 .67.23 1.13.23 1.13l-.92 3.89c-.24 1.02-.04 2.41-.01 2.54.02.08.11.1.16.04.07-.1 1-1.25 1.31-2.38l.49-1.87c.25.48.98.89 1.76.89 2.31 0 3.98-2.12 3.98-4.76 0-2.53-2.06-4.43-4.79-4.43Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'threads':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="Threads"
        >
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#111827" />
          <path
            d="M15.4 11.4c-.08-.04-.16-.08-.24-.11-.14-2.1-1.32-3.3-3.34-3.32h-.04c-1.2 0-2.21.51-2.83 1.44l1.13.78c.46-.7 1.16-.85 1.7-.85h.03c.72 0 1.27.21 1.62.62.26.3.43.71.51 1.23-.65-.11-1.35-.14-2.1-.1-2.1.12-3.45 1.34-3.36 3.04.05.87.48 1.61 1.22 2.1.62.41 1.43.61 2.27.56 1.11-.06 1.98-.48 2.58-1.26.46-.59.75-1.36.88-2.33.53.32.92.74 1.13 1.24.37.86.39 2.28-.76 3.43-1.01 1.01-2.23 1.45-4.07 1.46-2.04-.02-3.59-.67-4.6-1.94-.94-1.19-1.43-2.89-1.45-5.05.02-2.16.51-3.86 1.45-5.05 1.01-1.27 2.56-1.92 4.6-1.94 2.06.02 3.63.68 4.67 1.96.51.63.9 1.41 1.16 2.33l1.33-.35c-.32-1.13-.8-2.09-1.45-2.88-1.3-1.6-3.22-2.43-5.7-2.45h-.02c-2.47.02-4.37.85-5.64 2.46-1.14 1.44-1.73 3.42-1.75 5.9v.02c.02 2.48.61 4.46 1.75 5.9 1.27 1.61 3.17 2.44 5.64 2.46h.02c2.2-.02 3.74-.59 5.01-1.85 1.65-1.64 1.61-3.68 1.06-4.96-.37-.86-1.07-1.56-2.01-2.01Zm-3.45 4.02c-.93.05-1.89-.37-1.94-1.25-.04-.66.47-1.39 1.97-1.48.18-.01.35-.02.52-.02.53 0 1.02.05 1.48.15-.17 2.09-1.17 2.55-2.03 2.6Z"
            fill="#FFFFFF"
            transform="scale(0.82) translate(2.6 2.6)"
          />
        </svg>
      );

    case 'bluesky':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="Bluesky"
        >
          <rect x="2" y="2" width="20" height="20" rx="6" fill="#0285FF" />
          <path
            d="M7.55 7.42c1.66 1.25 3.45 3.78 4.45 5.15 1-1.37 2.79-3.9 4.45-5.15 1.15-.87 3.01-1.54 3.01.58 0 .42-.24 3.55-.39 4.06-.5 1.76-2.31 2.21-3.92 1.94 2.82.48 3.54 2.07 1.99 3.66-2.94 3.01-4.23-.76-4.55-1.72-.06-.18-.09-.26-.09-.19 0-.07-.03.01-.09.19-.32.96-1.61 4.73-4.55 1.72-1.55-1.59-.83-3.18 1.99-3.66-1.61.27-3.42-.18-3.92-1.94-.15-.51-.39-3.64-.39-4.06 0-2.12 1.86-1.45 3.01-.58Z"
            fill="#FFFFFF"
            transform="scale(0.86) translate(1.9 2.1)"
          />
        </svg>
      );

    case 'gbp':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="Google Business Profile"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#1A73E8" />
          <path
            d="M5.8 9.2 6.8 6.4h10.4l1 2.8c0 1.22-.94 2.1-2.08 2.1-.88 0-1.64-.55-1.96-1.34a2.1 2.1 0 0 1-2.16 1.34 2.1 2.1 0 0 1-2.16-1.34c-.32.79-1.08 1.34-1.96 1.34-1.14 0-2.08-.88-2.08-2.1Z"
            fill="#FFFFFF"
          />
          <path d="M6.8 11.9v5.7h10.4v-5.7H6.8Z" fill="#DCEBFF" />
          <path
            d="M12.02 14.3h2.35c-.11.73-.76 1.72-2.35 1.72-1.36 0-2.46-1.12-2.46-2.5 0-1.38 1.1-2.5 2.46-2.5.77 0 1.29.33 1.59.62l1.08-1.04A3.8 3.8 0 0 0 12.02 9.5a4 4 0 1 0 0 8c2.3 0 3.84-1.62 3.84-3.9 0-.26-.03-.46-.07-.66h-3.77v1.36Z"
            fill="#1A73E8"
            transform="scale(0.58) translate(9.1 11.4)"
          />
        </svg>
      );

    case 'meta':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="Meta"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" fill="#0668E1" />
          <path
            d="M7.3 15.6c-1.26 0-2.1-1.06-2.1-2.66 0-2.14 1.36-4.54 3.1-4.54 1.22 0 2.12.92 3.16 2.52l.54.83.54-.83c1.04-1.6 1.94-2.52 3.16-2.52 1.74 0 3.1 2.4 3.1 4.54 0 1.6-.84 2.66-2.1 2.66-1.16 0-2.02-.82-3.22-2.7l-.48-.75-.48.75c-1.2 1.88-2.06 2.7-3.22 2.7Zm1.02-5.68c-.84 0-1.66 1.55-1.66 2.98 0 .74.34 1.18.78 1.18.58 0 1.12-.58 2.02-2.02l.42-.68-.26-.42c-.55-.84-.9-1.04-1.3-1.04Zm7.36 0c-.4 0-.75.2-1.3 1.04l-.26.42.42.68c.9 1.44 1.44 2.02 2.02 2.02.44 0 .78-.44.78-1.18 0-1.43-.82-2.98-1.66-2.98Z"
            fill="#FFFFFF"
          />
        </svg>
      );

    case 'google':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="Google Ads"
        >
          <path
            d="M3.45 17.55 9.8 6.55a2.1 2.1 0 0 1 3.64 2.1L7.09 19.65a2.1 2.1 0 0 1-3.64-2.1Z"
            fill="#FBBC05"
          />
          <path
            d="M20.55 17.55 14.2 6.55a2.1 2.1 0 0 0-3.64 2.1l6.35 11a2.1 2.1 0 0 0 3.64-2.1Z"
            fill="#4285F4"
          />
          <circle cx="5.27" cy="18.6" r="2.15" fill="#34A853" />
        </svg>
      );

    case 'google_auth':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`shrink-0 ${className}`}
          aria-label="Google"
        >
          <path
            d="M21.8 12.23c0-.72-.06-1.41-.18-2.08H12v3.94h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.05-4.4 3.05-7.5Z"
            fill="#4285F4"
          />
          <path
            d="M12 22c2.76 0 5.07-.91 6.76-2.47l-3.3-2.56c-.91.61-2.08.98-3.46.98-2.66 0-4.91-1.8-5.71-4.21H2.88v2.64A10 10 0 0 0 12 22Z"
            fill="#34A853"
          />
          <path
            d="M6.29 13.74a6.01 6.01 0 0 1 0-3.48V7.62H2.88a10 10 0 0 0 0 8.76l3.41-2.64Z"
            fill="#FBBC05"
          />
          <path
            d="M12 6.05c1.5 0 2.85.52 3.91 1.53l2.93-2.93C17.06 2.99 14.75 2 12 2a10 10 0 0 0-9.12 5.62l3.41 2.64c.8-2.41 3.05-4.21 5.71-4.21Z"
            fill="#EA4335"
          />
        </svg>
      );
  }
}
