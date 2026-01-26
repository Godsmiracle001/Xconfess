import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
id: string;
username: string;
email: string;
}

export function useAuth() {
const [user, setUser] = useState<User | null>(null);
const [isLoading, setIsLoading] = useState(true);
const router = useRouter();

useEffect(() => {
checkAuth();
}, []);

const checkAuth = async () => {
const token = localStorage.getItem('accessToken');

if (!token) {
  setIsLoading(false);
  return;
}

try {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.ok) {
    const userData = await response.json();
    setUser(userData);
  } else {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  }
} catch (error) {
  console.error('Auth check failed:', error);
} finally {
  setIsLoading(false);
}
};

const logout = () => {
localStorage.removeItem('accessToken');
localStorage.removeItem('user');
setUser(null);
router.push('/login');
};

return { user, isLoading, logout, checkAuth };
}
