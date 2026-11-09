import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    lastname: '',
    cedula: '',
    phone: '',
    address: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [isGoogleOnboarding, setIsGoogleOnboarding] = useState(false);
  const [googleUserObj, setGoogleUserObj] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: `${formData.name.trim()} ${formData.lastname.trim()}`
      });

      await setDoc(doc(db, "Users", user.uid), {
        uid: user.uid,
        name: formData.name.trim(),
        lastname: formData.lastname.trim(),
        cedula: formData.cedula.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        email: formData.email.trim().toLowerCase(),
        createdAt: serverTimestamp()
      });

      setLoading(false);
      onClose();
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      setLoading(false);
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage('Este correo ya se encuentra registrado.');
      } else {
        setErrorMessage('Ocurrió un error al crear la cuenta.');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "Users", user.uid);
      const userSnap = await getDoc(userDocRef);

      // CORRECCIÓN: Validamos si el documento ya existe Y tiene cédula y dirección registradas
      if (userSnap.exists() && userSnap.data().cedula && userSnap.data().address) {
        // Si ya está completo, cerramos el modal directamente sin bucles
        onClose();
      } else {
        // Si no existe o le faltan datos de facturación, se los pedimos por única vez
        const nameParts = (user.displayName || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        setGoogleUserObj(user);
        setFormData(prev => ({
          ...prev,
          name: userSnap.exists() && userSnap.data().name ? userSnap.data().name : firstName,
          lastname: userSnap.exists() && userSnap.data().lastname ? userSnap.data().lastname : lastName,
          cedula: userSnap.exists() && userSnap.data().cedula ? userSnap.data().cedula : '',
          phone: userSnap.exists() && userSnap.data().phone ? userSnap.data().phone : '',
          address: userSnap.exists() && userSnap.data().address ? userSnap.data().address : '',
          email: user.email || ''
        }));
        setIsGoogleOnboarding(true);
      }
    } catch (error) {
      console.error("Error al iniciar con Google:", error);
      setErrorMessage('No se pudo registrar con Google.');
    }
  };

  const handleGoogleOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!googleUserObj) return;

    setLoading(true);
    try {
      await setDoc(doc(db, "Users", googleUserObj.uid), {
        uid: googleUserObj.uid,
        name: formData.name.trim(),
        lastname: formData.lastname.trim(),
        cedula: formData.cedula.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        email: googleUserObj.email.toLowerCase(),
        createdAt: serverTimestamp()
      }, { merge: true });

      setLoading(false);
      setIsGoogleOnboarding(false);
      onClose();
    } catch (err) {
      console.error("Error al guardar perfil adicional de Google:", err);
      setLoading(false);
      setErrorMessage('Error al guardar la información adicional.');
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

        <div className="text-center mb-5">
          <h2 className="text-xl font-bold uppercase tracking-widest text-slate-900">
            {isGoogleOnboarding ? '¡Casi listo! Completa tu perfil' : 'REGISTRO DE USUARIO'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isGoogleOnboarding 
              ? 'Por favor ingresa tu cédula y dirección para agilizar tus futuros pagos en Milano Shops.'
              : 'Completa tus datos para agilizar tus compras en Milano Shops.'}
          </p>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-2.5 rounded-xl mb-3 text-center">
            {errorMessage}
          </div>
        )}

        {isGoogleOnboarding ? (
          <form onSubmit={handleGoogleOnboardingSubmit} className="space-y-3 text-left">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Apellido</label>
                <input type="text" name="lastname" value={formData.lastname} onChange={handleChange} required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Cédula / RIF</label>
                <input type="text" name="cedula" value={formData.cedula} onChange={handleChange} placeholder="Ej: V-26123456" required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Teléfono</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Ej: 04121234567" required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Dirección de Habitación u Oficina</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows="2" placeholder="Ej: Av. Principal, Res. Milano, Apto 4B, Caracas" required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900"></textarea>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-black hover:bg-slate-800 text-white font-bold py-3 text-xs uppercase tracking-widest rounded-xl transition shadow-lg mt-2 cursor-pointer">
              {loading ? 'GUARDANDO...' : 'FINALIZAR Y CONTINUAR'}
            </button>
          </form>
        ) : (
          <>
            <button onClick={handleGoogleSignIn} type="button" className="w-full flex items-center justify-center gap-2 border border-slate-300 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 transition mb-4 cursor-pointer">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.37 7.37 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.63 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              REGISTRARSE CON GOOGLE
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">o con correo</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <form onSubmit={handleRegister} className="space-y-3 text-left">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nombre" required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Apellido</label>
                  <input type="text" name="lastname" value={formData.lastname} onChange={handleChange} placeholder="Apellido" required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Cédula / RIF</label>
                  <input type="text" name="cedula" value={formData.cedula} onChange={handleChange} placeholder="Ej: V-26123456" required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Teléfono</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Ej: 04121234567" required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Dirección de Habitación u Oficina</label>
                <textarea name="address" value={formData.address} onChange={handleChange} rows="2" placeholder="Ej: Av. Principal, Res. Milano, Apto 4B, Caracas / Oficina MRW" required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900"></textarea>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Correo Electrónico</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="correo@ejemplo.com" required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contraseña</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Confirmar clave</label>
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-black hover:bg-slate-800 text-white font-bold py-3 text-xs uppercase tracking-widest rounded-xl transition shadow-lg mt-2 cursor-pointer">
                {loading ? 'REGISTRANDO...' : 'REGISTRARSE'}
              </button>
            </form>

            <div className="text-center mt-3 border-t pt-2">
              <p className="text-xs text-slate-500">
                ¿Ya tienes cuenta?{' '}
                <button onClick={onSwitchToLogin} className="text-black font-bold hover:underline cursor-pointer">
                  Inicia sesión
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}