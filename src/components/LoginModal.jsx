import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function LoginModal({ isOpen, onClose, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setLoading(false);
      onClose();
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setLoading(false);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setErrorMessage('Correo o contraseña incorrectos.');
      } else {
        setErrorMessage('Ocurrió un error al iniciar sesión.');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    try {
      const provider = new GoogleAuthProvider();
      // Forzar selección de cuenta para evitar conflictos de promesas pendientes
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "Users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        const nameParts = (user.displayName || '').split(' ');
        await setDoc(userDocRef, {
          uid: user.uid,
          name: nameParts[0] || '',
          lastname: nameParts.slice(1).join(' ') || '',
          cedula: '',
          phone: '',
          address: '',
          email: user.email.toLowerCase(),
          createdAt: serverTimestamp()
        });
      }

      onClose();
    } catch (error) {
      console.error("Error al iniciar sesión con Google:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Ventana de Google cerrada antes de completar.');
      } else if (error.code === 'auth/popup-blocked') {
        setErrorMessage('El navegador bloqueó la ventana emergente de Google.');
      } else {
        setErrorMessage('No se pudo iniciar sesión con Google.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-black font-bold text-lg transition cursor-pointer"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold uppercase tracking-widest text-slate-900">
            INICIAR SESIÓN
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ingresa a tu cuenta en Milano Shops.
          </p>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-2.5 rounded-xl mb-4 text-center">
            {errorMessage}
          </div>
        )}

        {/* Botón Google */}
        <button
          onClick={handleGoogleSignIn}
          type="button"
          className="w-full flex items-center justify-center gap-2 border border-slate-300 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition mb-4 cursor-pointer shadow-xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.37 7.37 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.63 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          CONTINUAR CON GOOGLE
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">o con correo</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
              className="w-full border border-slate-300 p-3 text-xs rounded-xl outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-slate-300 p-3 text-xs rounded-xl outline-none focus:border-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black hover:bg-slate-800 text-white font-bold py-3.5 text-xs uppercase tracking-widest rounded-xl transition shadow-lg mt-2 cursor-pointer"
          >
            {loading ? 'INICIANDO...' : 'INICIAR SESIÓN'}
          </button>
        </form>

        <div className="text-center mt-4 border-t pt-3">
          <p className="text-xs text-slate-500">
            ¿No tienes cuenta?{' '}
            <button 
              onClick={onSwitchToRegister} 
              className="text-black font-bold hover:underline cursor-pointer"
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}