import React, { useState } from 'react';
import { UserRole } from '../types';

interface UserAvatarProps {
  user?: {
    fullName?: string;
    fullNameAr?: string;
    username?: string;
    avatar?: string;
    avatar_url?: string;
    role?: UserRole | string;
  } | null;
  className?: string;
  sizeClassName?: string;
  altText?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  className = '',
  sizeClassName = 'h-9 w-9 text-xs',
  altText,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const avatarUrl = user?.avatar_url || user?.avatar;

  const initials = (() => {
    const rawName = user?.fullName || user?.username || 'US';
    const parts = rawName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return rawName.slice(0, 2).toUpperCase();
  })();

  const title = altText || `${user?.fullName || user?.username || 'User'} (${user?.role || 'Guest'})`;

  if (avatarUrl && !imageFailed) {
    return (
      <div
        className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-orange-500/30 ${sizeClassName} ${className}`}
        title={title}
      >
        <img
          src={avatarUrl}
          alt={title}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#1A1A1A] to-[#F05627] font-bold text-white shadow-xs select-none ${sizeClassName} ${className}`}
      title={title}
    >
      {initials}
    </div>
  );
};
