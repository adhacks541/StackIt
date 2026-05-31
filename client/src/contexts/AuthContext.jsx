import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log(
        '🔍 AuthContext Debug - Checking auth, token exists:',
        !!token
      );

      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await api.get('api/auth/me');
        console.log(
          '🔍 AuthContext Debug - Auth check successful:',
          response.data.user.username
        );
        setUser(response.data.user);
      } else {
        console.log(
          '🔍 AuthContext Debug - No token found, user not authenticated'
        );
      }
    } catch (error) {
      console.log(
        '🔍 AuthContext Debug - Auth check failed:',
        error.response?.data?.message
      );
      // Only clear token if it's a token-related error
      if (error.response?.status === 401) {
        const errorMessage = error.response?.data?.message || '';
        if (
          errorMessage.includes('token') ||
          errorMessage.includes('expired') ||
          errorMessage.includes('Invalid')
        ) {
          console.log(
            '🔍 AuthContext Debug - Token error, clearing localStorage'
          );
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('api/auth/login', { email, password });
      const { token, user } = response.data;

      console.log(
        '🔍 AuthContext Debug - Login response token:',
        token ? token.substring(0, 20) + '...' : 'No token'
      );
      console.log('🔍 AuthContext Debug - Login response user:', user.username);

      localStorage.setItem('token', token);
      console.log('🔍 AuthContext Debug - Token saved to localStorage');

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);

      toast.success('Welcome back!');
      navigate('/questions');
      return { success: true };
    } catch (error) {
      console.log('❌ AuthContext Debug - Login error:', error.response?.data);
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const signup = async userData => {
    try {
      const response = await api.post('api/auth/signup', userData);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);

      toast.success('Account created successfully!');
      navigate('/questions');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Signup failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    console.log('🔍 AuthContext Debug - Logging out user');
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/');
  };

  const updateProfile = async userData => {
    try {
      const response = await api.put('api/auth/profile', userData);
      setUser(response.data.user);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
