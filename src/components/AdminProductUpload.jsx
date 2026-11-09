import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import logoHeader from './LogoMilano.jpg';
import AdminCoupons from './AdminCoupons';

export default function AdminProductUpload() {
  const [activeAdminTab, setActiveAdminTab] = useState('dashboard'); // 'dashboard' | 'orders' | 'invoices' | 'products' | 'upload' | 'newsletter' | 'users' | 'botConfig' | 'adBanner' | 'coupons'

  // Estados
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [invoicesHistory, setInvoicesHistory] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [botRules, setBotRules] = useState([]); 

  // Estado para el filtro de órdenes (Todos, Pendientes, Concretadas)
  const [orderFilter, setOrderFilter] = useState('todos'); // 'todos' | 'pendiente' | 'concretada'

  // Estado para la Edición de Usuarios por parte del Admin
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', lastname: '', cedula: '', phone: '', address: '', role: 'customer' });

  // Estados para el formulario de Reglas del Bot
  const [keyword, setKeyword] = useState('');
  const [botReply, setBotReply] = useState('');

  // Estados para el Banner Publicitario (Monetización Header)
  const [adActive, setAdActive] = useState(false);
  const [adMediaType, setAdMediaType] = useState('image'); // 'image' | 'video'
  const [adMediaUrl, setAdMediaUrl] = useState('');
  const [adTargetUrl, setAdTargetUrl] = useState('');
  const [adAltText, setAdAltText] = useState('');
  const [adLoading, setAdLoading] = useState(false);

  // Formulario Creación de Productos
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('Dama');
  const [badgeText, setBadgeText] = useState('✨ Alta Costura');
  const [images, setImages] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Estados para EDICIÓN de Productos
  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('Dama');
  const [editBadgeText, setEditBadgeText] = useState('✨ Alta Costura');
  const [editImages, setEditImages] = useState(['', '', '']);
  
  // Modal y Clave Admin
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Pop-up personalizado de éxito
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successPopupText, setSuccessPopupText] = useState('');

  // Modal para la Nota de Entrega
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);

  // Cargar colecciones en tiempo real
  useEffect(() => {
    const unsubscribeOrders = onSnapshot(query(collection(db, "Orders"), orderBy("createdAt", "desc")), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeProducts = onSnapshot(query(collection(db, "Product"), orderBy("createdAt", "desc")), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeSubs = onSnapshot(query(collection(db, "Subscribers"), orderBy("subscribedAt", "desc")), (snapshot) => {
      setSubscribers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeInvoices = onSnapshot(query(collection(db, "DeliveryNotes"), orderBy("createdAt", "desc")), (snapshot) => {
      setInvoicesHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeUsers = onSnapshot(collection(db, "Users"), (snapshot) => {
      setUsersList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeBotRules = onSnapshot(collection(db, "ChatbotRules"), (snapshot) => {
      setBotRules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeAd = onSnapshot(doc(db, "Settings", "adBanner"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAdActive(data.active ?? false);
        setAdMediaType(data.mediaType || 'image');
        setAdMediaUrl(data.mediaUrl || '');
        setAdTargetUrl(data.targetUrl || '');
        setAdAltText(data.altText || '');
      }
    });

    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
      unsubscribeSubs();
      unsubscribeInvoices();
      unsubscribeUsers();
      unsubscribeBotRules();
      unsubscribeAd();
    };
  }, []);

  const handleSaveAdBanner = async (e) => {
    e.preventDefault();
    setAdLoading(true);

    try {
      await setDoc(doc(db, "Settings", "adBanner"), {
        active: Boolean(adActive),
        mediaType: adMediaType || 'image',
        mediaUrl: adMediaUrl.trim(),
        targetUrl: adTargetUrl.trim(),
        altText: adAltText.trim() || 'Publicidad Patrocinada',
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSuccessPopupText('¡Espacio publicitario actualizado correctamente en el Header!');
      setShowSuccessPopup(true);
    } catch (err) {
      console.error("Error al guardar publicidad:", err);
      alert("Ocurrió un error al guardar la publicidad.");
    } finally {
      setAdLoading(false);
    }
  };

  const handleSaveUserChanges = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const userRef = doc(db, "Users", editingUser.email || editingUser.id);
      await setDoc(userRef, {
        name: editUserForm.name,
        lastname: editUserForm.lastname,
        cedula: editUserForm.cedula,
        phone: editUserForm.phone,
        address: editUserForm.address,
        role: editUserForm.role
      }, { merge: true });

      setSuccessPopupText('¡Datos del usuario actualizados exitosamente!');
      setShowSuccessPopup(true);
      setEditingUser(null);
    } catch (error) {
      console.error("Error al actualizar usuario:", error);
      alert("Hubo un error al actualizar los datos del usuario.");
    }
  };

  const handleSaveBotRule = async (e) => {
    e.preventDefault();
    if (!keyword.trim() || !botReply.trim()) return;

    try {
      await addDoc(collection(db, "ChatbotRules"), {
        keyword: keyword.trim().toLowerCase(),
        reply: botReply.trim(),
        createdAt: serverTimestamp()
      });
      setKeyword('');
      setBotReply('');
      setSuccessPopupText('¡Palabra clave y respuesta guardadas exitosamente para el Chatbot!');
      setShowSuccessPopup(true);
    } catch (err) {
      console.error("Error al guardar regla del bot:", err);
      alert("No se pudo guardar la regla del chatbot.");
    }
  };

  const handleDeleteBotRule = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta regla del chatbot?')) {
      try {
        await deleteDoc(doc(db, "ChatbotRules", id));
      } catch (err) {
        console.error("Error al eliminar regla:", err);
      }
    }
  };

  const handleToggleOrderStatus = async (orderId, currentStatus) => {
    const newStatus = currentStatus === 'concretada' ? 'pendiente' : 'concretada';
    try {
      await updateDoc(doc(db, "Orders", orderId), { status: newStatus });
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      alert("No se pudo actualizar el estado de la orden.");
    }
  };

  const handleToggleFeatured = async (product) => {
    const newFeaturedState = !product.featured;
    try {
      await updateDoc(doc(db, "Product", product.id), {
        featured: newFeaturedState
      });
    } catch (err) {
      console.error("Error al actualizar favorito:", err);
      alert("No se pudo actualizar el estado destacado del producto.");
    }
  };

  const handleChangeBadge = async (productId, newBadge) => {
    try {
      await updateDoc(doc(db, "Product", productId), {
        badgeText: newBadge
      });
    } catch (err) {
      console.error("Error al actualizar insignia:", err);
      alert("No se pudo actualizar la insignia del producto.");
    }
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    const filteredImages = images.filter(img => img.trim() !== '');

    try {
      await addDoc(collection(db, "Product"), {
        name,
        description,
        price: parseFloat(price) || 0,
        categoryId,
        badgeText,
        images: filteredImages.length > 0 ? filteredImages : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop'],
        featured: false,
        createdAt: new Date()
      });

      setSuccessPopupText('¡El producto ha sido añadido al catálogo de Milano Shops con éxito!');
      setShowSuccessPopup(true);

      setName('');
      setDescription('');
      setPrice('');
      setBadgeText('✨ Alta Costura');
      setImages(['', '', '']);
    } catch (err) {
      console.error("Error al publicar:", err);
      alert('Error al publicar el producto.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este producto de Milano Shops?')) {
      try {
        await deleteDoc(doc(db, "Product", id));
      } catch (err) {
        console.error("Error al eliminar:", err);
      }
    }
  };

  const handleOpenEditModal = (prod) => {
    setEditingProduct(prod);
    setEditName(prod.name || '');
    setEditDescription(prod.description || '');
    setEditPrice(prod.price || '');
    setEditCategoryId(prod.categoryId || 'Dama');
    setEditBadgeText(prod.badgeText || '✨ Alta Costura');
    setEditImages(prod.images?.length > 0 ? [...prod.images, '', '', ''].slice(0, 3) : ['', '', '']);
    setAdminPassword('');
    setAuthError('');
    setIsPasswordModalOpen(true);
  };

  const handleVerifyAndSaveProduct = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!adminPassword) {
      setAuthError('Por favor ingresa la contraseña de administrador.');
      return;
    }

    try {
      const currentUserEmail = auth.currentUser?.email;
      if (!currentUserEmail) {
        setAuthError('No hay una sesión de administrador activa.');
        return;
      }

      await signInWithEmailAndPassword(auth, currentUserEmail, adminPassword);

      const filteredEditImages = editImages.filter(img => img.trim() !== '');
      const productRef = doc(db, "Product", editingProduct.id);

      await updateDoc(productRef, {
        name: editName,
        description: editDescription,
        price: parseFloat(editPrice) || 0,
        categoryId: editCategoryId,
        badgeText: editBadgeText,
        images: filteredEditImages.length > 0 ? filteredEditImages : ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop']
      });

      setEditingProduct(null);
      setIsPasswordModalOpen(false);
      
      setSuccessPopupText('¡Cambios guardados exitosamente! El producto ha sido actualizado en la base de datos de Milano Shops.');
      setShowSuccessPopup(true);

    } catch (err) {
      console.error(err);
      setAuthError('Contraseña incorrecta o error de validación en Firebase.');
    }
  };

  const handleOpenInvoiceModal = async (order) => {
    const correlative = `NE-2026/${Math.floor(1000 + Math.random() * 9000)}`;
    const newInvoice = {
      correlative,
      orderId: order.id,
      userName: order.userName || 'Cliente Milano',
      userEmail: order.userEmail || 'N/A',
      totalUSD: order.totalUSD || 0,
      createdAt: new Date(),
      orderData: order
    };

    try {
      await addDoc(collection(db, "DeliveryNotes"), newInvoice);
    } catch (err) {
      console.error("Error al guardar historial:", err);
    }

    setSelectedOrderForInvoice({ ...order, correlative });
  };

  const handleViewExistingInvoice = (inv) => {
    const orderObj = inv.orderData || {
      userName: inv.userName,
      userEmail: inv.userEmail,
      totalUSD: inv.totalUSD,
      cartItems: []
    };
    setSelectedOrderForInvoice({
      ...orderObj,
      correlative: inv.correlative
    });
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Cálculos analíticos
  const totalRecaudadoVal = orders
    .filter(o => o.status === 'concretada')
    .reduce((acc, o) => acc + (o.totalUSD || 0), 0);

  const concretadasCount = orders.filter(o => o.status === 'concretada').length;
  const pendientesCount = orders.filter(o => o.status !== 'concretada').length;
  const totalOrdersCount = orders.length > 0 ? orders.length : 1;
  
  const porcentajeConcretadas = Math.round((concretadasCount / totalOrdersCount) * 100);
  const porcentajePendientes = 100 - porcentajeConcretadas;

  const catDamaCount = products.filter(p => p.categoryId === 'Dama').length;
  const catCaballeroCount = products.filter(p => p.categoryId === 'Caballero').length;
  const catNinoCount = products.filter(p => p.categoryId === 'Niño' || p.categoryId === 'Niña').length;
  const catAccesoriosCount = products.filter(p => p.categoryId === 'Accesorios').length;
  const totalProductsCount = products.length > 0 ? products.length : 1;

  const displayTotalRecaudado = totalRecaudadoVal > 0 ? totalRecaudadoVal.toFixed(2) : "2731.50";
  const displayConcretadas = orders.length > 0 ? concretadasCount : 27;
  const displayPendientes = orders.length > 0 ? pendientesCount : 2;
  const displayProductsCount = products.length > 0 ? products.length : 3;

  // Filtrado de órdenes
  const filteredOrders = orders.filter(order => {
    if (orderFilter === 'pendiente') return order.status !== 'concretada';
    if (orderFilter === 'concretada') return order.status === 'concretada';
    return true; // 'todos'
  });

  return (
    <div className="w-full min-h-screen bg-[#f4f7fe] text-slate-900 font-sans antialiased flex flex-col lg:flex-row pb-20">
      
      <style>
        {`
          @media print {
            @page { size: letter portrait; margin: 0; }
            body { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
            body * { visibility: hidden; }
            #printable-area, #printable-area * { visibility: visible; }
            #printable-area {
              position: fixed !important; left: 0 !important; top: 0 !important;
              width: 100vw !important; height: 100vh !important;
              padding: 6mm 10mm !important; box-sizing: border-box !important;
              background: white !important; display: flex !important;
              flex-direction: column !important; justify-content: space-between !important;
            }
            .invoice-half { height: 48vh !important; max-height: 48vh !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; box-sizing: border-box !important; overflow: hidden !important; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      {/* 👑 SIDEBAR LATERAL PROFESIONAL (ESTILO SaaS CORPORATIVO) */}
      <aside className="w-full lg:w-72 bg-slate-950 text-slate-300 flex flex-col justify-between p-6 border-r border-slate-800 no-print">
        <div className="space-y-8">
          
          {/* Logo / Marca */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-200 flex items-center justify-center text-slate-950 font-serif font-black text-lg shadow-lg">
              M
            </div>
            <div>
              <h2 className="text-white font-serif font-black tracking-widest text-sm uppercase">Milano Shops</h2>
              <p className="text-[9px] text-amber-400 uppercase tracking-[0.2em] font-mono">Executive Panel</p>
            </div>
          </div>

          {/* Menú de Navegación Lateral */}
          <nav className="space-y-1.5">
            <p className="px-3 text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2">Módulos Principales</p>
            {[
              { id: 'dashboard', icon: '📊', title: 'Analítica General' },
              { id: 'orders', icon: '💳', title: 'Control de Pagos', badge: displayPendientes },
              { id: 'invoices', icon: '📜', title: 'Notas de Entrega' },
              { id: 'products', icon: '⚙️', title: 'Inventario Boutique' },
              { id: 'upload', icon: '➕', title: 'Publicar Producto' },
              { id: 'coupons', icon: '🎟️', title: 'Cupones & Promos' },
              { id: 'newsletter', icon: '📧', title: 'Club VIP (Suscritos)' },
              { id: 'users', icon: '👥', title: 'Gestión de Usuarios' },
              { id: 'botConfig', icon: '🤖', title: 'Entrenamiento Bot IA' },
              { id: 'adBanner', icon: '📺', title: 'Publicidad Header' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveAdminTab(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold tracking-wider transition-all duration-300 cursor-pointer ${
                  activeAdminTab === tab.id
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black scale-[1.02]'
                    : 'hover:bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{tab.icon}</span>
                  <span className="uppercase text-[10px] tracking-widest">{tab.title}</span>
                </div>
                {tab.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black ${
                    activeAdminTab === tab.id ? 'bg-slate-950 text-amber-300' : 'bg-rose-500 text-white animate-pulse'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Footer del Sidebar */}
        <div className="pt-6 border-t border-slate-800/80 px-2 mt-6">
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></div>
            <div className="overflow-hidden">
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Sesión Segura</p>
              <p className="text-[11px] font-mono font-black text-white truncate">admin@milanoshops.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 🚀 CONTENIDO PRINCIPAL DEL DASHBOARD */}
      <main className="flex-1 p-6 sm:p-10 space-y-8 overflow-y-auto">
        
        {/* Top Header Barra Superior */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-[2.5rem] shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-black uppercase tracking-[0.25em] mb-2">
              ✦ Command Center &bull; Enterprise View
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-widest uppercase text-slate-900">
              Panel Administrativo
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado del Sistema</p>
              <p className="text-xs font-mono font-black text-emerald-600">Sincronizado Cloud ☁️</p>
            </div>
          </div>
        </div>

        {/* 💎 KERNEL ANALYTICS CARDS (ESTILO SAAS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
          
          <div className="bg-white border border-slate-200/80 p-7 rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-xl hover:border-amber-400 transition-all duration-300">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Volumen Procesado</span>
                <div className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-amber-600 font-bold text-base shadow-xs">💰</div>
              </div>
              <p className="text-3xl font-mono font-black tracking-tight text-slate-900">${displayTotalRecaudado} <span className="text-xs text-amber-600 font-sans tracking-widest">USD</span></p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between font-mono text-[10px]">
              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-bold">+12.4% vs Ayer</span>
              <span className="text-slate-400 uppercase">Live Sync</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-7 rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-xl hover:border-emerald-400 transition-all duration-300">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Pagos Aprobados</span>
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600 font-bold text-base shadow-xs">✓</div>
              </div>
              <p className="text-3xl font-mono font-black tracking-tight text-emerald-600">{displayConcretadas} <span className="text-xs text-slate-500 font-sans tracking-widest">VENTAS</span></p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between font-mono text-[10px]">
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">{porcentajeConcretadas}% Tasa Éxito</span>
              <span className="text-slate-400 uppercase">Verificado</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-7 rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-xl hover:border-rose-400 transition-all duration-300">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Por Validar</span>
                <div className="w-10 h-10 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-600 font-bold text-base shadow-xs">⏳</div>
              </div>
              <p className="text-3xl font-mono font-black tracking-tight text-slate-900">{displayPendientes} <span className="text-xs text-rose-600 font-sans tracking-widest">PENDIENTES</span></p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between font-mono text-[10px]">
              <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full font-bold animate-pulse">Acción Requerida</span>
              <span className="text-slate-400 uppercase">Prioritario</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-7 rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col justify-between hover:shadow-xl hover:border-sky-400 transition-all duration-300">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Catálogo Activo</span>
                <div className="w-10 h-10 bg-sky-50 border border-sky-200 rounded-2xl flex items-center justify-center text-sky-600 font-bold text-base shadow-xs">📦</div>
              </div>
              <p className="text-3xl font-mono font-black tracking-tight text-slate-900">{displayProductsCount} <span className="text-xs text-sky-600 font-sans tracking-widest">ÍTEMS</span></p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between font-mono text-[10px]">
              <span className="text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full font-bold">Cloud Sync</span>
              <span className="text-slate-400 uppercase">Firestore</span>
            </div>
          </div>

        </div>

        {/* SECCIÓN DE CUPONES */}
        {activeAdminTab === 'coupons' && (
          <div className="no-print">
            <AdminCoupons />
          </div>
        )}

        {/* 📊 SECCIÓN: ANALÍTICA */}
        {activeAdminTab === 'dashboard' && (
          <div className="space-y-8 no-print">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <div className="bg-white border border-slate-200/80 p-8 sm:p-10 rounded-[2.5rem] shadow-xl space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
                    ✦ Rendimiento Financiero Global
                  </span>
                  <h3 className="text-2xl font-serif font-black uppercase text-slate-900 mt-3">
                    Estado de Órdenes y Validaciones
                  </h3>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-xs font-mono font-black uppercase mb-2">
                      <span className="text-emerald-700">✓ Concretadas ({concretadasCount})</span>
                      <span className="text-slate-900">{porcentajeConcretadas}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
                      <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${porcentajeConcretadas}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono font-black uppercase mb-2">
                      <span className="text-amber-700">⌛ Pendientes por Validar ({pendientesCount})</span>
                      <span className="text-slate-900">{porcentajePendientes}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
                      <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${porcentajePendientes}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Volumen Total:</p>
                    <p className="text-xl font-mono font-black text-slate-900 mt-1">${displayTotalRecaudado} USD</p>
                  </div>
                  <button onClick={() => setActiveAdminTab('orders')} className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3.5 rounded-xl transition cursor-pointer shadow">
                    Gestionar Pagos ➔
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 p-8 sm:p-10 rounded-[2.5rem] shadow-xl space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-700 bg-sky-50 px-3.5 py-1.5 rounded-full border border-sky-200">
                    ✦ Inventario Boutique
                  </span>
                  <h3 className="text-2xl font-serif font-black uppercase text-slate-900 mt-3">
                    Distribución por Categoría
                  </h3>
                </div>

                <div className="space-y-4">
                  {[
                    { label: 'Dama', count: catDamaCount, color: 'bg-indigo-500' },
                    { label: 'Caballero', count: catCaballeroCount, color: 'bg-slate-700' },
                    { label: 'Niños / Niñas', count: catNinoCount, color: 'bg-emerald-500' },
                    { label: 'Accesorios', count: catAccesoriosCount, color: 'bg-amber-500' }
                  ].map((cat, idx) => {
                    const percent = Math.round((cat.count / totalProductsCount) * 100);
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-xs font-mono font-black uppercase mb-1.5">
                          <span className="text-slate-700">{cat.label} ({cat.count} ítems)</span>
                          <span className="text-slate-900">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
                          <div className={`${cat.color} h-full rounded-full transition-all duration-1000`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Total Ítems:</p>
                    <p className="text-xl font-mono font-black text-slate-900 mt-1">{displayProductsCount} Artículos</p>
                  </div>
                  <button onClick={() => setActiveAdminTab('products')} className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3.5 rounded-xl transition cursor-pointer shadow">
                    Ver Inventario ➔
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 📺 SECCIÓN: PUBLICIDAD EN EL HEADER */}
        {activeAdminTab === 'adBanner' && (
          <div className="space-y-6 no-print max-w-4xl mx-auto">
            <div className="bg-white border border-slate-200/80 p-8 sm:p-10 rounded-[2.5rem] shadow-xl space-y-6">
              
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
                  💰 Monetización Header
                </span>
                <h3 className="text-2xl font-serif font-black uppercase text-slate-900 mt-3">
                  Gestión de Banner Publicitario
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Sube la pieza comercial que se mostrará en el encabezado principal de la web.
                </p>
              </div>

              <form onSubmit={handleSaveAdBanner} className="space-y-5">
                
                <div className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-900">Estatus del Banner</p>
                    <p className="text-[10px] text-slate-500">Activa o pausa la exhibición de la publicidad.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdActive(!adActive)}
                    className={`px-5 py-2.5 text-xs font-mono font-black uppercase rounded-xl transition cursor-pointer ${
                      adActive 
                        ? 'bg-emerald-600 text-white shadow' 
                        : 'bg-rose-100 text-rose-700 border border-rose-300'
                    }`}
                  >
                    {adActive ? '🟢 PUBLICIDAD ACTIVA' : '🔴 PAUSADA'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Tipo de Formato</label>
                    <select
                      value={adMediaType}
                      onChange={(e) => setAdMediaType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900 font-bold cursor-pointer"
                    >
                      <option value="image">🖼️ Imagen (JPG, PNG, GIF)</option>
                      <option value="video">🎥 Video Corto (MP4, WebM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Texto Alternativo (SEO)</label>
                    <input
                      type="text"
                      value={adAltText}
                      onChange={(e) => setAdAltText(e.target.value)}
                      placeholder="Ej: Anuncio Oficial Marca X"
                      className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900"
                    />
                  </div>
                </div>

                <div className="border border-dashed border-slate-300 p-5 rounded-2xl bg-slate-50 space-y-2">
                  <label className="block text-[10px] font-black uppercase text-slate-700">
                    {adMediaType === 'video' ? '🎥 Subir Archivo de Video (.mp4 - Máx 3MB)' : '🖼️ Subir Archivo de Imagen (.jpg, .png - Máx 1MB)'}
                  </label>
                  <input
                    type="file"
                    accept={adMediaType === 'video' ? "video/mp4,video/webm" : "image/png,image/jpeg,image/gif"}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const maxSize = adMediaType === 'video' ? 3 * 1024 * 1024 : 1 * 1024 * 1024;
                        if (file.size > maxSize) {
                          alert(`El archivo es demasiado pesado. El límite máximo es de ${adMediaType === 'video' ? '3 MB' : '1 MB'}.`);
                          e.target.value = '';
                          return;
                        }

                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setAdMediaUrl(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer w-full"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Enlace de Destino (Redirección al hacer Click)
                  </label>
                  <input
                    type="url"
                    value={adTargetUrl}
                    onChange={(e) => setAdTargetUrl(e.target.value)}
                    placeholder="https://instagram.com/cuenta_anunciante"
                    className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900"
                  />
                </div>

                {adMediaUrl && (
                  <div className="border border-slate-200 p-5 rounded-2xl bg-slate-50 space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-500">Previsualización en vivo:</p>
                    <div className="h-16 bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center p-1">
                      {adMediaType === 'video' ? (
                        <video src={adMediaUrl} autoPlay loop muted playsInline className="max-h-full object-contain rounded" />
                      ) : (
                        <img src={adMediaUrl} alt={adAltText} className="max-h-full object-contain rounded" />
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={adLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 text-xs uppercase tracking-widest rounded-2xl transition shadow-xl cursor-pointer"
                >
                  {adLoading ? 'Guardando...' : '💾 Guardar y Publicar Banner'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SECCIÓN: CONFIG BOT */}
        {activeAdminTab === 'botConfig' && (
          <div className="space-y-8 no-print">
            <div className="bg-white border border-slate-200/80 p-8 sm:p-10 rounded-[2.5rem] shadow-xl space-y-6 max-w-2xl mx-auto">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-200">
                  Asistente Virtual IA
                </span>
                <h3 className="text-2xl font-serif font-black uppercase text-slate-900 mt-3">
                  Configuración del Chatbot
                </h3>
              </div>

              <form onSubmit={handleSaveBotRule} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Palabra Clave o Disparador (Ej: garantia, ubicacion)
                  </label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="ej: garantia"
                    required
                    className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-indigo-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                    Respuesta del Chatbot
                  </label>
                  <textarea
                    value={botReply}
                    onChange={(e) => setBotReply(e.target.value)}
                    rows="3"
                    placeholder="Escribe el texto que responderá el asistente..."
                    required
                    className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-indigo-500 text-slate-900"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 text-xs uppercase tracking-widest rounded-2xl transition shadow-xl cursor-pointer"
                >
                  + Guardar Regla del Chatbot
                </button>
              </form>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-8 shadow-xl max-w-4xl mx-auto">
              <h4 className="text-sm font-serif font-black uppercase tracking-wider text-slate-900 mb-6">
                Reglas Activas ({botRules.length})
              </h4>

              {botRules.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No hay reglas personalizadas creadas todavía.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {botRules.map((rule) => (
                    <div key={rule.id} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[9px] font-mono font-black uppercase bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full border border-indigo-300">
                          Clave: {rule.keyword}
                        </span>
                        <p className="text-xs text-slate-700 mt-3 font-medium leading-relaxed">
                          "{rule.reply}"
                        </p>
                      </div>
                      <div className="pt-3 border-t border-slate-200 flex justify-end">
                        <button
                          onClick={() => handleDeleteBotRule(rule.id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECCIÓN: VALIDACIÓN DE COMPRAS */}
        {activeAdminTab === 'orders' && (
          <div className="space-y-6 no-print">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm">
              <h3 className="text-lg font-serif font-black uppercase tracking-wider text-slate-900">
                Control de Pagos Móviles y Notas de Entrega
              </h3>

              <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
                <button
                  onClick={() => setOrderFilter('todos')}
                  className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                    orderFilter === 'todos' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📋 Todos ({orders.length})
                </button>
                <button
                  onClick={() => setOrderFilter('pendiente')}
                  className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                    orderFilter === 'pendiente' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⌛ Pendientes ({orders.filter(o => o.status !== 'concretada').length})
                </button>
                <button
                  onClick={() => setOrderFilter('concretada')}
                  className={`flex-1 sm:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                    orderFilter === 'concretada' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✓ Concretadas ({orders.filter(o => o.status === 'concretada').length})
                </button>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12 font-bold uppercase tracking-widest">No hay compras registradas con este filtro.</p>
            ) : (
              filteredOrders.map(order => (
                <div key={order.id} className="bg-white border border-slate-200/80 p-6 sm:p-8 rounded-[2rem] shadow-xl space-y-5">
                  <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-4 gap-3">
                    <div>
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-400 mr-3">ID: {order.id.slice(0, 8)}</span>
                      <span className="text-xs font-bold text-slate-900 uppercase">{order.userName || 'Cliente Milano'}</span>
                      <span className="text-xs text-slate-500 ml-2">({order.userEmail})</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleOrderStatus(order.id, order.status)}
                        className={`px-4 py-2 text-[10px] font-mono font-black uppercase tracking-wider rounded-xl transition cursor-pointer ${
                          order.status === 'concretada'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {order.status === 'concretada' ? '✓ Compra Concretada' : '⌛ Pendiente de Validación'}
                      </button>

                      <button
                        onClick={() => handleOpenInvoiceModal(order)}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                      >
                        📄 Ver / Emitir Nota de Entrega
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                      <p className="font-bold text-slate-900 uppercase">📱 Datos del Pago Móvil (Emisor)</p>
                      <p className="text-slate-700"><strong>Banco:</strong> {order.paymentDetails?.bancoEmisor || 'N/A'}</p>
                      <p className="text-slate-700"><strong>Cédula:</strong> {order.paymentDetails?.cedulaPagador || 'N/A'}</p>
                      <p className="text-slate-700"><strong>Teléfono:</strong> {order.paymentDetails?.telefonoPagador || 'N/A'}</p>
                      <p className="text-slate-700"><strong>Referencia:</strong> {order.paymentDetails?.nroReferencia || 'N/A'}</p>
                      <p className="text-emerald-700 font-mono font-black text-sm"><strong>Monto Reportado:</strong> {order.paymentDetails?.montoBs || '0.00'} Bs.</p>

                      <div className="pt-3 border-t border-slate-200 mt-2">
                        {order.paymentDetails?.comprobanteBase64 ? (
                          <button
                            type="button"
                            onClick={() => {
                              const win = window.open();
                              win.document.write(`
                                <html>
                                  <head><title>Comprobante de Pago - Milano Shops</title></head>
                                  <body style="background:#f1f5f9; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
                                    <img src="${order.paymentDetails.comprobanteBase64}" style="max-width:90%; max-height:90vh; border-radius:12px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);" />
                                  </body>
                                </html>
                              `);
                            }}
                            className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 border border-blue-300 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-200 transition cursor-pointer"
                          >
                            <span>🖼️ Ver Comprobante</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Sin comprobante digital adjunto</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                      <p className="font-bold text-slate-900 uppercase">📦 Artículos Solicitados</p>
                      {order.cartItems?.map((it, idx) => (
                        <p key={idx} className="text-slate-700">
                          • {it.name} (x{it.quantity}) - ${((it.price || 0) * it.quantity).toFixed(2)} USD
                        </p>
                      ))}
                      <div className="pt-3 border-t border-slate-200 mt-3 flex justify-between font-mono font-black text-slate-900 text-sm">
                        <span>Total Orden:</span>
                        <span className="text-emerald-700">${(order.totalUSD || 0).toFixed(2)} USD</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SECCIÓN: HISTORIAL NOTAS DE ENTREGA */}
        {activeAdminTab === 'invoices' && (
          <div className="space-y-6 no-print">
            <h3 className="text-lg font-serif font-black uppercase tracking-wider text-slate-900">
              Historial de Notas de Entrega Emitidas
            </h3>

            {invoicesHistory.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12 font-bold uppercase tracking-widest">No se han emitido notas de entrega todavía.</p>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase font-mono text-[10px] border-b border-slate-200">
                      <th className="p-5">Correlativo</th>
                      <th className="p-5">Cliente</th>
                      <th className="p-5">Correo</th>
                      <th className="p-5">Monto Total</th>
                      <th className="p-5">Fecha de Emisión</th>
                      <th className="p-5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoicesHistory.map(inv => (
                      <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="p-5 font-mono font-black text-emerald-700">{inv.correlative}</td>
                        <td className="p-5 font-bold text-slate-900">{inv.userName}</td>
                        <td className="p-5 text-slate-500">{inv.userEmail}</td>
                        <td className="p-5 font-mono font-black text-slate-900">${(inv.totalUSD || 0).toFixed(2)} USD</td>
                        <td className="p-5 text-slate-500">
                          {inv.createdAt ? new Date(inv.createdAt.seconds * 1000).toLocaleString() : 'Reciente'}
                        </td>
                        <td className="p-5 text-center">
                          <button
                            onClick={() => handleViewExistingInvoice(inv)}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl shadow transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            👁️ Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN: GESTIÓN PRODUCTOS */}
        {activeAdminTab === 'products' && (
          <div className="space-y-6 no-print">
            <div>
              <h3 className="text-lg font-serif font-black uppercase tracking-wider text-slate-900">
                Inventario y Productos Activos
              </h3>
              <p className="text-xs text-slate-500 mt-1">Haz clic en la estrella ⭐ para elegir qué productos aparecerán en el **TOP 5** de la página de inicio.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map(prod => (
                <div key={prod.id} className="bg-white border border-slate-200/80 p-5 rounded-[2rem] shadow-xl flex flex-col justify-between relative group hover:border-amber-400 transition duration-300">
                  
                  <button
                    onClick={() => handleToggleFeatured(prod)}
                    title={prod.featured ? "Quitar del Top 5 del Index" : "Añadir al Top 5 del Index"}
                    className={`absolute top-6 right-6 z-10 p-3 rounded-2xl shadow-lg transition transform hover:scale-110 cursor-pointer ${
                      prod.featured 
                        ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-400/30 font-bold' 
                        : 'bg-slate-100 text-slate-400 hover:bg-amber-400 hover:text-slate-950 border border-slate-200'
                    }`}
                  >
                    ⭐
                  </button>

                  <div>
                    <div className="h-52 bg-slate-50 rounded-2xl mb-4 overflow-hidden flex items-center justify-center border border-slate-200 p-2">
                      <img src={prod.images?.[0]} alt="" className="max-h-full object-contain" />
                    </div>

                    <div className="flex gap-2 items-center mb-3">
                      <span className="text-[9px] font-mono font-black uppercase bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
                        {prod.categoryId}
                      </span>
                    </div>

                    <div className="mb-4">
                      <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Insignia Boutique:</label>
                      <select
                        value={prod.badgeText || '✨ Alta Costura'}
                        onChange={(e) => handleChangeBadge(prod.id, e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs font-bold rounded-xl outline-none focus:border-amber-500 text-slate-900 cursor-pointer"
                      >
                        <option value="✨ Alta Costura">✨ Alta Costura</option>
                        <option value="👑 Edición Limitada">👑 Edición Limitada</option>
                        <option value="💎 Importado VIP">💎 Importado VIP</option>
                        <option value="⭐ Exclusivo 2026">⭐ Exclusivo 2026</option>
                        <option value="🔥 Nuevo Ingreso">🔥 Nuevo Ingreso</option>
                      </select>
                    </div>

                    <h4 className="text-xs font-black uppercase text-slate-900 mt-2 line-clamp-1">{prod.name}</h4>
                    <p className="text-sm font-mono font-black text-emerald-700 mt-1">${(prod.price || 0).toFixed(2)} USD</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenEditModal(prod)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-900 text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl transition cursor-pointer"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase tracking-wider py-2.5 rounded-xl transition cursor-pointer"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECCIÓN: PUBLICAR PRODUCTO */}
        {activeAdminTab === 'upload' && (
          <div className="max-w-xl mx-auto bg-white border border-slate-200/80 p-8 sm:p-10 rounded-[2.5rem] shadow-xl space-y-6 no-print">
            <h3 className="text-2xl font-serif font-black uppercase tracking-wide text-slate-900 text-center">
              Publicar Nuevo Producto
            </h3>

            {successMsg && (
              <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-center">
                {successMsg}
              </p>
            )}

            <form onSubmit={handleSubmitProduct} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: Vestido Importado de Seda"
                  required
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Precio ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="45.00"
                    required
                    className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Categoría</label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900 cursor-pointer"
                  >
                    <option value="Dama">Dama</option>
                    <option value="Caballero">Caballero</option>
                    <option value="Niño">Niño</option>
                    <option value="Niña">Niña</option>
                    <option value="Accesorios">Accesorios</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Insignia Boutique</label>
                <select
                  value={badgeText}
                  onChange={e => setBadgeText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900 font-bold cursor-pointer"
                >
                  <option value="✨ Alta Costura">✨ Alta Costura</option>
                  <option value="👑 Edición Limitada">👑 Edición Limitada</option>
                  <option value="💎 Importado VIP">💎 Importado VIP</option>
                  <option value="⭐ Exclusivo 2026">⭐ Exclusivo 2026</option>
                  <option value="🔥 Nuevo Ingreso">🔥 Nuevo Ingreso</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Descripción</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows="3"
                  placeholder="Detalles de importación, tallas..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900"
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-slate-500">URLs de Imágenes (Hasta 3)</label>
                {images.map((img, idx) => (
                  <input
                    key={idx}
                    type="url"
                    value={img}
                    onChange={e => {
                      const newImgs = [...images];
                      newImgs[idx] = e.target.value;
                      setImages(newImgs);
                    }}
                    placeholder={`URL Imagen ${idx + 1}`}
                    className="w-full bg-slate-50 border border-slate-200 p-3 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900 mb-1"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 text-xs uppercase tracking-widest rounded-2xl transition shadow-xl cursor-pointer"
              >
                {loading ? 'Publicando...' : 'Publicar en Milano Shops'}
              </button>
            </form>
          </div>
        )}

        {/* SECCIÓN: SUSCRIPTORES */}
        {activeAdminTab === 'newsletter' && (
          <div className="space-y-6 no-print max-w-4xl mx-auto">
            <h3 className="text-lg font-serif font-black uppercase tracking-wider text-slate-900">
              Lista de Correos Suscritos (Club VIP)
            </h3>

            <div className="bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-mono text-[10px] border-b border-slate-200">
                    <th className="p-5">Correo Electrónico</th>
                    <th className="p-5">Fecha de Suscripción</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map(sub => (
                    <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-5 font-mono font-bold text-slate-900">{sub.email}</td>
                      <td className="p-5 text-slate-500">
                        {sub.subscribedAt ? new Date(sub.subscribedAt.seconds * 1000).toLocaleString() : 'Reciente'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECCIÓN: USUARIOS */}
        {activeAdminTab === 'users' && (
          <div className="space-y-6 no-print">
            <h3 className="text-lg font-serif font-black uppercase tracking-wider text-slate-900">
              Base de Datos de Usuarios Registrados y Activos
            </h3>

            {usersList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-12 font-bold uppercase tracking-widest">No hay usuarios registrados en el sistema.</p>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase font-mono text-[10px] border-b border-slate-200">
                      <th className="p-5">Nombre y Apellido</th>
                      <th className="p-5">Correo Electrónico</th>
                      <th className="p-5">Cédula</th>
                      <th className="p-5">Teléfono</th>
                      <th className="p-5">Rol</th>
                      <th className="p-5">Dirección</th>
                      <th className="p-5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map(usr => (
                      <tr key={usr.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="p-5 font-bold text-slate-900 uppercase">{usr.name || ''} {usr.lastname || usr.firstName || ''}</td>
                        <td className="p-5 text-slate-500 font-mono">{usr.email || usr.id || 'N/A'}</td>
                        <td className="p-5 font-mono font-semibold text-slate-700">{usr.cedula || usr.idNumber || 'N/A'}</td>
                        <td className="p-5 font-mono text-slate-700">{usr.phone || usr.phoneNumber || 'N/A'}</td>
                        <td className="p-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-mono font-black uppercase ${
                            usr.role === 'admin' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {usr.role === 'customer' || !usr.role || usr.role === 'cliente' ? 'CLIENTE' : usr.role}
                          </span>
                        </td>
                        <td className="p-5 text-slate-500 truncate max-w-xs">{usr.address || 'N/A'}</td>
                        <td className="p-5 text-center">
                          <button
                            onClick={() => {
                              setEditingUser(usr);
                              setEditUserForm({
                                name: usr.name || usr.firstName || '',
                                lastname: usr.lastname || usr.lastName || '',
                                cedula: usr.cedula || usr.idNumber || '',
                                phone: usr.phone || usr.phoneNumber || '',
                                address: usr.address || '',
                                role: usr.role || 'customer'
                              });
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl shadow transition inline-flex items-center gap-1 cursor-pointer"
                          >
                            ✏️ Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>

      {/* MODAL DE EDICIÓN DE USUARIO */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl relative space-y-5 my-8">
            <button onClick={() => setEditingUser(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 font-bold cursor-pointer">✕</button>

            <div>
              <h3 className="text-xl font-serif font-black uppercase text-slate-900">Corregir Datos de Usuario</h3>
              <p className="text-xs font-mono text-amber-600 mt-1">{editingUser.email}</p>
            </div>

            <form onSubmit={handleSaveUserChanges} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nombre</label>
                  <input type="text" value={editUserForm.name} onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 p-3 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Apellido</label>
                  <input type="text" value={editUserForm.lastname} onChange={(e) => setEditUserForm({...editUserForm, lastname: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Cédula</label>
                  <input type="text" value={editUserForm.cedula} onChange={(e) => setEditUserForm({...editUserForm, cedula: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 p-3 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Teléfono</label>
                  <input type="text" value={editUserForm.phone} onChange={(e) => setEditUserForm({...editUserForm, phone: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 p-3 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Rol en el Sistema</label>
                <select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({...editUserForm, role: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 p-3 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900 font-bold cursor-pointer"
                >
                  <option value="customer">Customer / Cliente</option>
                  <option value="admin">Admin / Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Dirección</label>
                <textarea rows="2" value={editUserForm.address} onChange={(e) => setEditUserForm({...editUserForm, address: e.target.value})} required className="w-full bg-slate-50 border border-slate-200 p-3 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900"></textarea>
              </div>

              <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 text-xs font-black uppercase tracking-widest rounded-2xl transition shadow-lg cursor-pointer mt-2">
                Guardar Cambios del Usuario
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE NOTA DE ENTREGA */}
      {selectedOrderForInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-[2.5rem] max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative space-y-4">
            
            <div className="flex justify-between items-center no-print border-b pb-4">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">Previsualización Nota de Entrega</span>
              <div className="flex gap-3">
                <button onClick={handlePrintPDF} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer">
                  🖨️ Imprimir / Guardar PDF
                </button>
                <button onClick={() => setSelectedOrderForInvoice(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-4 py-2.5 rounded-xl transition cursor-pointer">
                  ✕ Cerrar
                </button>
              </div>
            </div>

            <div id="printable-area" className="space-y-4 text-[10px] text-slate-900">
              <div className="invoice-half border border-slate-300 p-4 rounded-xl space-y-2 bg-white">
                <div className="flex justify-between items-center border-b pb-2">
                  <div className="flex items-center gap-2.5">
                    <img src={logoHeader} alt="Logo" className="w-10 h-10 object-cover rounded-lg" />
                    <div>
                      <h4 className="font-serif font-black uppercase text-xs">Milano Shops</h4>
                      <p className="text-[8px] text-slate-500">RIF: J-50123456-7</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-black text-emerald-700 text-xs">{selectedOrderForInvoice.correlative}</p>
                    <p className="text-[8px] text-slate-500 uppercase">NOTA DE ENTREGA</p>
                  </div>
                </div>

                <div className="flex justify-between text-[9px] bg-slate-50 p-2 rounded-xl">
                  <div>
                    <p><strong>Cliente:</strong> {selectedOrderForInvoice.userName}</p>
                    <p><strong>Correo:</strong> {selectedOrderForInvoice.userEmail}</p>
                  </div>
                  <div className="text-right">
                    <p><strong>Teléfono:</strong> {selectedOrderForInvoice.phone || selectedOrderForInvoice.paymentDetails?.telefonoPagador || 'N/A'}</p>
                    <p><strong>Fecha:</strong> {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="border-t pt-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b bg-slate-100 font-bold">
                        <th className="p-1.5">Cant.</th>
                        <th className="p-1.5">Descripción</th>
                        <th className="p-1.5 text-right">P. Unit</th>
                        <th className="p-1.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrderForInvoice.cartItems?.map((item, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-1.5">{item.quantity}</td>
                          <td className="p-1.5">{item.name}</td>
                          <td className="p-1.5 text-right">${(item.price || 0).toFixed(2)}</td>
                          <td className="p-1.5 text-right">${((item.price || 0) * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-2 border-t font-mono font-black text-xs">
                  <span>TOTAL GENERAL:</span>
                  <span>${(selectedOrderForInvoice.totalUSD || 0).toFixed(2)} USD</span>
                </div>

                <div className="text-center text-[8px] text-slate-400 pt-1 border-t">
                  <span>¡Gracias por preferir Milano Luxury! - Envíos a todo el país.</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE SEGURIDAD */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl relative space-y-5">
            <h3 className="text-xl font-serif font-black uppercase text-slate-900 text-center">
              Confirmar Contraseña
            </h3>
            <p className="text-xs text-slate-500 text-center">
              Por seguridad, ingresa tu clave para guardar los cambios del producto.
            </p>

            {authError && (
              <p className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl text-center">
                {authError}
              </p>
            )}

            <form onSubmit={handleVerifyAndSaveProduct} className="space-y-4">
              <input
                type="password"
                placeholder="Contraseña de administrador"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3.5 text-xs font-black uppercase tracking-widest rounded-2xl transition shadow-lg cursor-pointer"
                >
                  Confirmar y Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 px-5 text-xs font-bold rounded-2xl transition cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PRODUCTO */}
      {editingProduct && !isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] max-w-lg w-full p-8 shadow-2xl relative space-y-5 my-8">
            <h3 className="text-xl font-serif font-black uppercase text-slate-900 text-center">
              Editar Producto
            </h3>

            <form onSubmit={(e) => { e.preventDefault(); setIsPasswordModalOpen(true); }} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Precio ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Categoría</label>
                  <select
                    value={editCategoryId}
                    onChange={e => setEditCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900 cursor-pointer"
                  >
                    <option value="Dama">Dama</option>
                    <option value="Caballero">Caballero</option>
                    <option value="Niño">Niño</option>
                    <option value="Niña">Niña</option>
                    <option value="Accesorios">Accesorios</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Insignia Boutique</label>
                <select
                  value={editBadgeText}
                  onChange={e => setEditBadgeText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900 font-bold cursor-pointer"
                >
                  <option value="✨ Alta Costura">✨ Alta Costura</option>
                  <option value="👑 Edición Limitada">👑 Edición Limitada</option>
                  <option value="💎 Importado VIP">💎 Importado VIP</option>
                  <option value="⭐ Exclusivo 2026">⭐ Exclusivo 2026</option>
                  <option value="🔥 Nuevo Ingreso">🔥 Nuevo Ingreso</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Descripción</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows="2"
                  required
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900"
                ></textarea>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-slate-500">URLs de Imágenes</label>
                {editImages.map((img, idx) => (
                  <input
                    key={idx}
                    type="url"
                    value={img}
                    onChange={e => {
                      const newImgs = [...editImages];
                      newImgs[idx] = e.target.value;
                      setEditImages(newImgs);
                    }}
                    placeholder={`URL Imagen ${idx + 1}`}
                    className="w-full bg-slate-50 border border-slate-200 p-3 text-xs rounded-xl outline-none focus:border-amber-500 text-slate-900 mb-1"
                  />
                ))}
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3.5 text-xs font-black uppercase tracking-widest rounded-2xl transition shadow-lg cursor-pointer"
                >
                  Continuar
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 px-5 text-xs font-bold rounded-2xl transition cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP DE ÉXITO */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] max-w-sm w-full p-8 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto text-3xl font-black border border-emerald-300">
              ✓
            </div>
            <h3 className="text-xl font-serif font-black uppercase text-slate-900">¡Éxito!</h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
              {successPopupText}
            </p>
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 text-xs font-black uppercase tracking-widest rounded-2xl transition shadow-lg cursor-pointer"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}