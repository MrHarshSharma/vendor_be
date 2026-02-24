import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/setup';

// Create the auth context
const AuthContext = createContext(null);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (firebaseUser) {
            // User is signed in
            setUser(firebaseUser);

            // Fetch additional user data from Firestore
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              setUserData({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                ...userSnap.data(),
              });
            } else {
              // User exists in auth but not in Firestore
              setUserData({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
              });
            }

            // Clear any legacy localStorage data (migration)
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          } else {
            // User is signed out
            setUser(null);
            setUserData(null);
          }
        } catch (err) {
          console.error('Error in auth state change:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Auth state change error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Sign out function
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserData(null);
      // Clear any legacy localStorage data
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err.message);
      throw err;
    }
  };

  // Refresh user data from Firestore
  const refreshUserData = async () => {
    if (!user) return null;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const updatedData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          ...userSnap.data(),
        };
        setUserData(updatedData);
        return updatedData;
      }
      return userData;
    } catch (err) {
      console.error('Error refreshing user data:', err);
      setError(err.message);
      return null;
    }
  };

  const value = {
    user,           // Firebase Auth user object
    userData,       // Extended user data from Firestore
    loading,        // Auth state loading
    error,          // Any auth errors
    signOut,        // Sign out function
    refreshUserData, // Refresh user data from Firestore
    isAuthenticated: !!user, // Quick auth check
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
