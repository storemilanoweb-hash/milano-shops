import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function CompleteProfileModal({ user, isOpen, onComplete }) {
  const [formData, setFormData] = useState({
    name: '',
    lastname: '',
    cedula: '',
    phone: '',
    address: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const nameParts = (user.name || user.displayName || '').split(' ');
      setFormData(prev => ({
        ...prev,
        name: nameParts[0] || '',
        lastname: nameParts.slice(1).join(' ') || ''
      }));
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userPayload = {
        uid: user.uid || user.email,
        name: formData.name.trim(),
        lastname: formData.lastname.trim(),
        cedula: formData.cedula.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        email: user.email.toLowerCase(),
        updatedAt: serverTimestamp()
      };

      // Guardamos tanto con el correo como con el UID para mantener compatibilidad total con tu app
      await setDoc(doc(db, "Users", user.email), userPayload, { merge: true });
      if (user.uid) {
        await setDoc(doc(db, "Users", user.uid), userPayload, { merge: true });
      }

      setLoading(false);
      onComplete(); 
    } catch (error) {
      console.error("Error al completar el perfil:", error);
      setLoading(false);
      alert("Hubo un error al guardar tus datos. Inténtalo de nuevo.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative border border-slate-100">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-xl">
            ✍️
          </div>
          <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">
            Completa tus Datos de Facturación
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Hola <strong>{user.name || user.displayName || 'Usuario'}</strong>. Requerimos tu Cédula y Dirección por única vez para agilizar todos tus envíos y verificaciones en Milano Shops.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nombre</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full border border-slate-200 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Apellido</label>
              <input
                type="text"
                name="lastname"
                value={formData.lastname}
                onChange={handleChange}
                required
                className="w-full border border-slate-200 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Cédula / RIF</label>
              <input
                type="text"
                name="cedula"
                value={formData.cedula}
                onChange={handleChange}
                placeholder="Ej: V-26123456"
                required
                className="w-full border border-slate-200 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Teléfono</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Ej: 04121234567"
                required
                className="w-full border border-slate-200 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Dirección de Habitación / Oficina</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="2"
              placeholder="Ej: Av. Principal, Res. Milano, Apto 4B, Caracas / Agencia MRW"
              required
              className="w-full border border-slate-200 p-2.5 text-xs rounded-xl outline-none focus:border-slate-900"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 text-xs uppercase tracking-widest rounded-xl transition shadow-lg mt-2"
          >
            {loading ? 'GUARDANDO PERFIL...' : 'GUARDAR Y CONTINUAR'}
          </button>
        </form>
      </div>
    </div>
  );
}