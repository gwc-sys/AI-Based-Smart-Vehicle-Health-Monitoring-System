// hooks/useAuth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Define types for user and auth context
interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

// Mock API functions (replace with your actual API calls)
const mockApi = {
  register: async (name: string, email: string, password: string): Promise<User> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock validation
    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }
    
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    
    // Check if user already exists (mock)
    const existingUsers = await AsyncStorage.getItem('users');
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    
    if (users.some((u: User) => u.email === email)) {
      throw new Error('User already exists with this email');
    }
    
    // Create new user
    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      createdAt: new Date().toISOString()
    };
    
    // Save to "database" (AsyncStorage)
    users.push(newUser);
    await AsyncStorage.setItem('users', JSON.stringify(users));
    
    return newUser;
  },
  
  login: async (email: string, password: string): Promise<User> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock login validation
    const existingUsers = await AsyncStorage.getItem('users');
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    
    const user = users.find((u: User) => u.email === email);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // In a real app, you'd verify password here
    // For mock, we'll accept any password
    
    return user;
  }
};

const useAuth = (): AuthContextType => {                    
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async (): Promise<void> => {
    try {
      setLoading(true);
      const savedUser = await AsyncStorage.getItem('currentUser');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate inputs
      if (!name.trim() || !email.trim() || !password) {
        throw new Error('All fields are required');
      }
      
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      
      if (!email.includes('@') || !email.includes('.')) {
        throw new Error('Please enter a valid email address');
      }
      
      // Call registration API
      const newUser = await mockApi.register(name.trim(), email.trim().toLowerCase(), password);
      
      // Save user session
      await AsyncStorage.setItem('currentUser', JSON.stringify(newUser));
      
      // Update state
      setUser(newUser);
      
      // Show success message (optional - you might want to handle this in the component)
      if (Platform.OS === 'web') {
        alert('Account created successfully!');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err; // Re-throw to be caught in the component
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      if (!email.trim() || !password) {
        throw new Error('Email and password are required');
      }
      
      const loggedInUser = await mockApi.login(email.trim().toLowerCase(), password);
      
      await AsyncStorage.setItem('currentUser', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      await AsyncStorage.removeItem('currentUser');
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userData: Partial<User>): Promise<void> => {
    try {
      if (!user) throw new Error('No user logged in');
      
      const updatedUser = { ...user, ...userData };
      await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
      // Update in users list
      const existingUsers = await AsyncStorage.getItem('users');
      if (existingUsers) {
        const users = JSON.parse(existingUsers);
        const updatedUsers = users.map((u: User) => 
          u.id === user.id ? updatedUser : u
        );
        await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
      }
      
      setUser(updatedUser);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      setError(errorMessage);
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateUser
  };
};

export default useAuth;