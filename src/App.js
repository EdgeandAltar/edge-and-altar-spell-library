import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import Admin from './pages/Admin';
import SpellLibrary from './pages/SpellLibrary';
import SpellDetail from './pages/SpellDetail';
import Subscribe from './pages/Subscribe';
import Success from './pages/Success';
import ManageSpells from './pages/ManageSpells';
import EditSpell from './pages/EditSpell';
import NotFound from './pages/NotFound';
import SpellQuiz from './pages/SpellQuiz';
import SpellJournal from './pages/SpellJournal';
import IngredientPantry from './pages/IngredientPantry';
import Favorites from './pages/Favorites';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setIsAdmin(userDoc.data().isAdmin || false);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#7D5E4F'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Navigation user={user} isAdmin={isAdmin} />
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" /> : <Login />} 
        />
        <Route 
          path="/signup" 
          element={user ? <Navigate to="/" /> : <Signup />} 
        />
        <Route 
          path="/" 
          element={user ? <Home /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/admin" 
          element={user ? <Admin /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/library" 
          element={user ? <SpellLibrary /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/spell/:id" 
          element={user ? <SpellDetail /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/subscribe" 
          element={user ? <Subscribe /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/success" 
          element={user ? <Success /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/manage-spells" 
          element={user ? <ManageSpells /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/edit-spell/:id" 
          element={user ? <EditSpell /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/quiz" 
          element={user ? <SpellQuiz /> : <Navigate to="/login" />} 
        />
        <Route 
  path="/journal" 
  element={user ? <SpellJournal /> : <Navigate to="/login" />} 
/>
<Route 
  path="/pantry" 
  element={user ? <IngredientPantry /> : <Navigate to="/login" />} 
/>
<Route 
  path="/favorites" 
  element={user ? <Favorites /> : <Navigate to="/login" />} 
/>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;