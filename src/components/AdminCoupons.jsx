import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

export default function AdminCoupons() {
  const [activeTab, setActiveTab] = useState('gestion'); // 'gestion' o 'historial'
  const [coupons, setCoupons] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Formulario de nuevo cupón
  const [form, setForm] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: 10,
    maxUses: 50,
    expirationDate: '',
    active: true
  });

  // Cargar cupones e historial de Firestore
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Cargar Cupones
      const couponsSnap = await getDocs(collection(db, "Coupons"));
      const couponsList = couponsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCoupons(couponsList);

      // 2. Cargar Historial de Canjes
      const historyQuery = query(collection(db, "CouponHistory"), orderBy("createdAt", "desc"));
      const historySnap = await getDocs(historyQuery);
      const historyList = historySnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(historyList);

    } catch (err) {
      console.error("Error al cargar datos de cupones:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    const cleanCode = form.code.trim().toUpperCase();
    if (!cleanCode) {
      alert("Por favor ingresa un código de cupón válido.");
      return;
    }

    try {
      const couponRef = doc(db, "Coupons", cleanCode);
      await setDoc(couponRef, {
        code: cleanCode,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxUses: Number(form.maxUses),
        timesUsed: 0,
        expirationDate: form.expirationDate || 'Sin límite',
        active: form.active,
        createdAt: serverTimestamp()
      });

      alert(`¡Cupón ${cleanCode} creado con éxito!`);
      setForm({
        code: '',
        discountType: 'percentage',
        discountValue: 10,
        maxUses: 50,
        expirationDate: '',
        active: true
      });
      fetchData();
    } catch (err) {
      console.error("Error al crear cupón:", err);
      alert("Error al guardar el cupón.");
    }
  };

  const handleDeleteCoupon = async (code) => {
    if (window.confirm(`¿Estás seguro de eliminar el cupón ${code}?`)) {
      try {
        await deleteDoc(doc(db, "Coupons", code));
        fetchData();
      } catch (err) {
        console.error("Error al eliminar:", err);
      }
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      const couponRef = doc(db, "Coupons", coupon.id);
      await updateDoc(couponRef, {
        active: !coupon.active
      });
      fetchData();
    } catch (err) {
      console.error("Error al actualizar estado:", err);
    }
  };

  // 📊 CÁLCULOS TOTALES PARA EL HISTORIAL
  const totalUsdDiscount = history.reduce((acc, item) => acc + (item.discountUSD || 0), 0);
  const totalVesDiscount = history.reduce((acc, item) => acc + (item.discountVES || 0), 0);
  // Estimado en Euros usando una referencia o tasa proporcional si aplica
  const totalEurDiscount = history.reduce((acc, item) => acc + (item.discountEUR || item.discountUSD * 0.92 || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-sans space-y-8">
      
      {/* ENCABEZADO Y PESTAÑAS */}
      <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-serif font-black uppercase tracking-wider text-slate-900 mb-1">
            🎟️ Gestión y Auditoría de Cupones
          </h2>
          <p className="text-xs text-slate-500">
            Administra códigos promocionales y audita el historial financiero de descuentos aplicados.
          </p>
        </div>
        
        {/* NAVEGACIÓN DE PESTAÑAS */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('gestion')}
            className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
              activeTab === 'gestion' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚙️ Gestión de Cupones
          </button>
          <button 
            onClick={() => setActiveTab('historial')}
            className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
              activeTab === 'historial' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Historial de Canjes
          </button>
        </div>
      </div>

      {activeTab === 'gestion' ? (
        <>
          {/* FORMULARIO DE CREACIÓN */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 pb-2 border-b">
              Crear Nuevo Cupón Promocional
            </h3>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Código del Cupón</label>
                  <input 
                    type="text" 
                    name="code" 
                    placeholder="Ej: VERANO2026" 
                    value={form.code} 
                    onChange={handleChange} 
                    required 
                    className="w-full border p-3 text-xs rounded-xl uppercase outline-none focus:border-slate-900 font-black tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Tipo de Descuento</label>
                  <select 
                    name="discountType" 
                    value={form.discountType} 
                    onChange={handleChange} 
                    className="w-full border p-3 text-xs rounded-xl bg-white outline-none focus:border-slate-900 font-bold"
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto Fijo ($ USD)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Valor del Descuento</label>
                  <input 
                    type="number" 
                    name="discountValue" 
                    value={form.discountValue} 
                    onChange={handleChange} 
                    required 
                    className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Límite Máximo de Usos</label>
                  <input 
                    type="number" 
                    name="maxUses" 
                    value={form.maxUses} 
                    onChange={handleChange} 
                    required 
                    className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Fecha de Vencimiento</label>
                  <input 
                    type="date" 
                    name="expirationDate" 
                    value={form.expirationDate} 
                    onChange={handleChange} 
                    className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  name="active" 
                  id="active" 
                  checked={form.active} 
                  onChange={handleChange} 
                  className="w-4 h-4 accent-slate-900 cursor-pointer"
                />
                <label htmlFor="active" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Cupón activo y disponible para canje inmediato
                </label>
              </div>

              <button 
                type="submit" 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 text-xs font-black uppercase tracking-widest rounded-xl transition shadow-lg cursor-pointer mt-2"
              >
                Guardar y Activar Cupón
              </button>
            </form>
          </div>

          {/* LISTA DE CUPONES EXISTENTES */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 pb-2 border-b flex justify-between items-center">
              <span>Cupones Registrados en el Sistema</span>
              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[10px]">
                {coupons.length} Creados
              </span>
            </h3>

            {loading ? (
              <p className="text-xs text-slate-400 text-center py-6 animate-pulse">Cargando cupones...</p>
            ) : coupons.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No hay cupones creados todavía.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-slate-400 uppercase text-[10px]">
                      <th className="pb-3">Código</th>
                      <th className="pb-3">Descuento</th>
                      <th className="pb-3">Usos (Canjeados / Máx)</th>
                      <th className="pb-3">Vencimiento</th>
                      <th className="pb-3 text-center">Estado</th>
                      <th className="pb-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50">
                        <td className="py-3 font-black text-slate-900 uppercase">{c.code}</td>
                        <td className="py-3 font-bold text-amber-700">
                          {c.discountType === 'percentage' ? `${c.discountValue}%` : `$${c.discountValue} USD`}
                        </td>
                        <td className="py-3 text-slate-600 font-semibold">
                          {c.timesUsed || 0} / {c.maxUses}
                        </td>
                        <td className="py-3 text-slate-500">{c.expirationDate || 'Sin límite'}</td>
                        <td className="py-3 text-center">
                          <button 
                            onClick={() => handleToggleActive(c)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                              c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {c.active ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="py-3 text-right">
                          <button 
                            onClick={() => handleDeleteCoupon(c.id)}
                            className="text-rose-600 hover:text-rose-800 font-bold text-[11px] cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* SECCIÓN DE HISTORIAL Y MÉTRICAS FINANCIERAS */
        <div className="space-y-6">
          
          {/* TARJETAS DE RESUMEN FINANCIERO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-1">Total Descontado en USD</span>
              <span className="text-2xl font-black text-emerald-900">${totalUsdDiscount.toFixed(2)} USD</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-1">Total Descontado en Euros (Est.)</span>
              <span className="text-2xl font-black text-amber-900">€{totalEurDiscount.toFixed(2)} EUR</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block mb-1">Total Descontado en Bolívares (BCV)</span>
              <span className="text-2xl font-black text-blue-900">Bs. {totalVesDiscount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* TABLA DE HISTORIAL DETALLADO */}
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 pb-2 border-b flex justify-between items-center">
              <span>Bitácora de Canjes Realizados</span>
              <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[10px]">
                {history.length} Canjes Totales
              </span>
            </h3>

            {loading ? (
              <p className="text-xs text-slate-400 text-center py-6 animate-pulse">Cargando historial...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Aún no se han registrado canjes de cupones en el sistema.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-slate-400 uppercase text-[10px]">
                      <th className="pb-3">Fecha / Hora</th>
                      <th className="pb-3">Cupón Usado</th>
                      <th className="pb-3">Cliente</th>
                      <th className="pb-3">Rebaja USD</th>
                      <th className="pb-3">Rebaja Bolívares</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50">
                        <td className="py-3 text-slate-500">
                          {h.createdAt?.toDate ? h.createdAt.toDate().toLocaleString() : 'Hace un momento'}
                        </td>
                        <td className="py-3 font-black text-slate-900 uppercase">
                          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                            {h.couponCode}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-slate-700">{h.userName}</td>
                        <td className="py-3 font-black text-emerald-700">-${h.discountUSD?.toFixed(2)} USD</td>
                        <td className="py-3 font-bold text-slate-600">Bs. {h.discountVES?.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}