import Home from './components/Home';
import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from './firebase';
import { collection, onSnapshot, query, doc, setDoc, getDoc, where } from 'firebase/firestore';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

// Importación de componentes y vistas
import Navbar from './components/Navbar.jsx'; // NAVBAR DINÁMICO CON BANNER PUBLICITARIO
import AdminProductUpload from './components/AdminProductUpload.jsx';
import ProductCatalog from './components/ProductCatalog.jsx';
import CheckoutView from './components/CheckoutView.jsx';
import CompleteProfileModal from './components/CompleteProfileModal.jsx'; // MODAL GLOBAL DE PERFIL
import ChatbotWidget from './components/ChatbotWidget.jsx'; // CHATBOT FLOTANTE
import logoFooter from './components/LogoMilanoInvertido.png';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartSideTab, setCartSideTab] = useState('cart'); // 'cart' | 'history'
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Estado para el modal global de perfil incompleto
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  
  // Selección de Moneda
  const [currency, setCurrency] = useState('USD'); // 'USD' | 'VES'

  // ESTADO DINÁMICO DE TASAS BCV (CON RESPALDO Y ACTUALIZACIÓN AUTOMÁTICA)
  const [bcvData, setBcvData] = useState({
    usd: 883.40,
    eur: 925.10,
    date: new Date().toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    loading: true
  });

  // Tasa activa usada para los cálculos del carrito y productos
  const exchangeRate = bcvData.usd;

  // Estado para el pop-up de bienvenida
  const [welcomePopup, setWelcomePopup] = useState(null);

  // Historial de compras del usuario activo
  const [userOrders, setUserOrders] = useState([]);

  // Estados para la Suscripción del Footer
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('');

  // Estado y efecto para el rebote (bounce) dinámico del carrito
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const totalCartCount = cart.reduce((a, b) => a + b.quantity, 0);

  useEffect(() => {
    if (totalCartCount > 0) {
      setIsCartBouncing(true);
      const timer = setTimeout(() => {
        setIsCartBouncing(false);
      }, 400); // Duración exacta de la animación
      return () => clearTimeout(timer);
    }
  }, [totalCartCount]);

  // CONSUMO DE API OFICIAL BCV CON RESPALDO (SIEMPRE AL DÍA)
  useEffect(() => {
    const fetchBcvRates = async () => {
      try {
        const response = await fetch('https://rates.dolarvzla.com/bcv/current.json');
        if (response.ok) {
          const data = await response.json();
          if (data && data.current) {
            const rawDate = data.current.date || new Date().toISOString().split('T')[0];
            const [year, month, day] = rawDate.split('-');
            const formattedDate = `${day}/${month}/${year}`;

            setBcvData({
              usd: parseFloat(data.current.usd),
              eur: parseFloat(data.current.eur),
              date: formattedDate,
              loading: false
            });
            return;
          }
        }
        throw new Error("Fallo en Endpoint Principal");
      } catch (primaryError) {
        console.warn("Reintentando con API de Respaldo BCV...", primaryError);

        try {
          const backupRes = await fetch('https://datos.cromstudio.com.ve/tasa');
          if (backupRes.ok) {
            const backupData = await backupRes.json();
            setBcvData({
              usd: parseFloat(backupData.tasas.USD),
              eur: parseFloat(backupData.tasas.EUR),
              date: backupData.fecha_valor || new Date().toLocaleDateString('es-VE'),
              loading: false
            });
            return;
          }
        } catch (backupError) {
          console.error("Error en todas las APIs de tasa BCV:", backupError);
        }

        setBcvData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchBcvRates();
  }, []);

  // OBSERVADOR GLOBAL DE AUTENTICACIÓN Y VALIDACIÓN DE PERFIL EN FIRESTORE
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "Users", user.email || user.uid);
          const userSnap = await getDoc(userDocRef);

          let userData = {
            uid: user.uid,
            name: user.displayName || user.email.split('@')[0],
            email: user.email
          };

          if (userSnap.exists()) {
            const data = userSnap.data();
            userData = { ...userData, ...data };
            
            if (!data.cedula || !data.address) {
              setShowCompleteProfileModal(true);
            } else {
              setShowCompleteProfileModal(false);
            }
          } else {
            setShowCompleteProfileModal(true);
          }

          setCurrentUser(userData);
          if (user.email === "admin@milanoshops.com" || userData?.role === 'admin') {
            setIsAdmin(true);
          }
        } catch (err) {
          console.error("Error al verificar perfil en Firestore:", err);
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
        setShowCompleteProfileModal(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Protección de ruta privada
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('home');
    }
  }, [activeTab, isAdmin]);

  // Cargar Carrito e Histórico desde Firestore
  useEffect(() => {
    if (!currentUser || !currentUser.email) {
      setCart([]);
      setUserOrders([]);
      return;
    }
    const cartRef = doc(db, "Carts", currentUser.email);
    const unsubscribeCart = onSnapshot(cartRef, (docSnap) => {
      if (docSnap.exists()) {
        setCart(docSnap.data().items || []);
      } else {
        setCart([]);
      }
    });

    const qOrders = query(collection(db, "Orders"), where("userEmail", "==", currentUser.email));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserOrders(ordersData);
    });

    return () => {
      unsubscribeCart();
      unsubscribeOrders();
    };
  }, [currentUser]);

  const saveCartToFirestore = async (newCartItems) => {
    if (!currentUser || !currentUser.email) return;
    try {
      const cartRef = doc(db, "Carts", currentUser.email);
      await setDoc(cartRef, { items: newCartItems }, { merge: true });
    } catch (error) {
      console.error("Error al guardar el carrito:", error);
    }
  };

  const addToCart = (product) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      let updatedCart;
      if (existing) {
        updatedCart = prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      } else {
        updatedCart = [...prev, { ...product, quantity: 1 }];
      }
      saveCartToFirestore(updatedCart);
      return updatedCart;
    });
    setCartSideTab('cart');
    setIsCartOpen(true);
  };

  const removeFromCart = (id) => {
    setCart(prev => {
      const updatedCart = prev.filter(item => item.id !== id);
      saveCartToFirestore(updatedCart);
      return updatedCart;
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => {
      const updatedCart = prev.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      });
      saveCartToFirestore(updatedCart);
      return updatedCart;
    });
  };

  const cartTotalUSD = cart.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
  const cartTotalVES = cartTotalUSD * exchangeRate;

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail) return;

    try {
      await setDoc(doc(db, "Subscribers", newsletterEmail), {
        email: newsletterEmail,
        subscribedAt: new Date()
      });
      setNewsletterStatus('¡Gracias por unirte a Milano Luxury!');
      setNewsletterEmail('');
      setTimeout(() => setNewsletterStatus(''), 5000);
    } catch (error) {
      console.error("Error al suscribir:", error);
      setNewsletterStatus('Hubo un error. Intenta de nuevo.');
    }
  };

  const handleUserLogin = (user, isSuperUser) => {
    setCurrentUser(user);
    setIsAdmin(isSuperUser);
    setIsAuthOpen(false);

    setWelcomePopup(`¡Bienvenido de nuevo, ${user.name || 'Usuario'}!`);
    setTimeout(() => setWelcomePopup(null), 4000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setActiveTab('home');
    setCart([]);
    setWelcomePopup(null);
    signOut(auth);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col relative">
      
      {/* Estilos CSS para el rebote del carrito */}
      <style>
        {`
          @keyframes cartBounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.35); }
          }
          .animate-cart-bounce {
            animation: cartBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
          }
        `}
      </style>

      {/* NAVBAR DINÁMICO */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currency={currency}
        setCurrency={setCurrency}
        user={currentUser}
        handleLogout={handleLogout}
        cartCount={totalCartCount}
        bcvRates={{ usd: bcvData.usd, eur: bcvData.eur }}
        onUpdateBcvRates={(newRates) => {
          setBcvData(prev => ({ ...prev, usd: newRates.usd, eur: newRates.eur }));
        }}
      />

      {/* Contenido Dinámico Protegido */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <Home 
            currentUser={currentUser} 
            onAddToCart={addToCart} 
            onOpenAuth={() => setIsAuthOpen(true)} 
            currency={currency}
            exchangeRate={exchangeRate}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'products' && (
          <ProductCatalog 
            currentUser={currentUser} 
            onAddToCart={addToCart} 
            onOpenAuth={() => setIsAuthOpen(true)} 
            currency={currency}
            exchangeRate={exchangeRate}
          />
        )}
        {activeTab === 'checkout' && (
          <CheckoutView 
            cart={cart} 
            cartTotal={cartTotalUSD} 
            currentUser={currentUser} 
            onBackToCatalog={() => setActiveTab('products')} 
            onClearCart={() => saveCartToFirestore([])} 
          />
        )}
        {activeTab === 'about' && <AboutView />}
        {activeTab === 'contact' && <ContactView />}
        {activeTab === 'admin' && (
          isAdmin ? <AdminProductUpload /> : <Home currentUser={currentUser} onAddToCart={addToCart} onOpenAuth={() => setIsAuthOpen(true)} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black text-white pt-16 pb-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <div className="mb-4">
              <img src={logoFooter} alt="Milano Footer" className="h-16 md:h-20 w-auto object-contain" />
            </div>
            <p className="text-gray-400 text-xs leading-relaxed">
              Moda e importaciones de alta gama en Venezuela. Estilo único e inigualable.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-200">Navegación</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li><button onClick={() => setActiveTab('home')} className="hover:text-white transition cursor-pointer">Inicio</button></li>
              <li><button onClick={() => setActiveTab('products')} className="hover:text-white transition cursor-pointer">Nuestros Productos</button></li>
              <li><button onClick={() => setActiveTab('about')} className="hover:text-white transition cursor-pointer">Quiénes Somos</button></li>
              <li><button onClick={() => setActiveTab('contact')} className="hover:text-white transition cursor-pointer">Contacto</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-200">Envíos y Pagos</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Envíos por MRW y Zoom.<br />Aceptamos Pago Móvil, Zelle y Efectivo.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-200">Suscripción</h4>
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Tu correo" 
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required 
                  className="bg-gray-900 border border-gray-800 px-3 py-2 text-xs text-white w-full focus:outline-none focus:border-gray-600" 
                />
                <button type="submit" className="bg-white text-black px-4 text-xs font-bold uppercase hover:bg-gray-200 transition cursor-pointer">
                  Unirme
                </button>
              </div>
              {newsletterStatus && (
                <p className={`text-[11px] ${newsletterStatus.includes('Gracias') ? 'text-green-400' : 'text-red-400'}`}>
                  {newsletterStatus}
                </p>
              )}
            </form>
          </div>
        </div>
      </footer>

      {/* CARRITO LATERAL (DRAWER VIP) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-md flex justify-end transition-all">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-6 relative font-sans">
            
            {/* ENCABEZADO Y SELECTOR DE PESTAÑAS VIP */}
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button 
                    onClick={() => setCartSideTab('cart')} 
                    className={`px-4 py-2 text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer ${
                      cartSideTab === 'cart' 
                        ? 'bg-slate-900 text-white shadow-md' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    🛍️ Tu Carrito ({totalCartCount})
                  </button>
                  <button 
                    onClick={() => setCartSideTab('history')} 
                    className={`px-4 py-2 text-xs font-black tracking-wider uppercase rounded-xl transition-all cursor-pointer ${
                      cartSideTab === 'history' 
                        ? 'bg-slate-900 text-white shadow-md' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    📜 Histórico
                  </button>
                </div>
                
                <button 
                  onClick={() => setIsCartOpen(false)} 
                  className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white transition flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* PESTAÑA 1: TU CARRITO */}
              {cartSideTab === 'cart' && (
                <>
                  {cart.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                      <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto text-2xl">
                        🛒
                      </div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Tu Carrito está Vacío</h4>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">Explora nuestro catálogo exclusivo e integra tus piezas favoritas de Milano Shops.</p>
                      <button 
                        onClick={() => { setIsCartOpen(false); setActiveTab('products'); }}
                        className="bg-slate-900 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-slate-800 transition shadow-lg mt-2 inline-block cursor-pointer"
                      >
                        Ver Productos
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                      {cart.map(item => (
                        <div key={item.id} className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex gap-3.5 items-center hover:border-slate-300 transition shadow-xs">
                          <img src={item.images?.[0] || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300'} alt={item.name} className="w-16 h-20 object-cover bg-white rounded-xl border" />
                          
                          <div className="flex-1">
                            <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200/60">
                              {item.categoryId || 'Boutique'}
                            </span>
                            <h4 className="text-xs font-black uppercase text-slate-900 mt-1 line-clamp-1">{item.name}</h4>
                            <p className="text-xs font-extrabold text-slate-900 mt-0.5">
                              {currency === 'VES' 
                                ? `${((item.price || 0) * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.` 
                                : `$${(item.price || 0).toFixed(2)} USD`}
                            </p>

                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden shadow-2xs">
                                <button onClick={() => updateQuantity(item.id, -1)} className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-black text-xs transition cursor-pointer">-</button>
                                <span className="px-3 text-xs font-black text-slate-900">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-black text-xs transition cursor-pointer">+</button>
                              </div>
                            </div>
                          </div>

                          <button 
                            onClick={() => removeFromCart(item.id)} 
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Eliminar producto"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* PESTAÑA 2: HISTÓRICO DE COMPRAS */}
              {cartSideTab === 'history' && (
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  {userOrders.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                      <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto text-2xl">
                        📜
                      </div>
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Sin Compras Registradas</h4>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">Tus órdenes realizadas y estatus de despacho aparecerán aquí en tiempo real.</p>
                    </div>
                  ) : (
                    [...userOrders]
                      .sort((a, b) => {
                        if (a.status === 'concretada' && b.status !== 'concretada') return 1;
                        if (a.status !== 'concretada' && b.status === 'concretada') return -1;
                        const dateA = a.createdAt?.seconds || 0;
                        const dateB = b.createdAt?.seconds || 0;
                        return dateB - dateA;
                      })
                      .map(order => (
                        <div key={order.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 hover:border-slate-300 transition shadow-xs">
                          <div className="flex justify-between items-center text-[10px] border-b pb-2">
                            <span className="font-bold text-slate-500 uppercase">
                              📅 {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'Reciente'}
                            </span>
                            {order.status === 'concretada' ? (
                              <span className="text-emerald-800 font-black bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                                ✓ Concretada
                              </span>
                            ) : (
                              <span className="text-amber-800 font-black bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                                ⌛ En Verificación
                              </span>
                            )}
                          </div>

                          <div className="space-y-1">
                            {order.cartItems?.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-xs text-slate-800 font-medium">
                                <span>{it.name} <span className="text-slate-400 font-bold">x{it.quantity}</span></span>
                                <span className="font-bold text-slate-900">${((it.price || 0) * it.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs">
                            <span className="font-bold text-slate-500 uppercase text-[10px]">Monto Total:</span>
                            <span className="font-black text-slate-900 text-sm">${order.totalUSD?.toFixed(2)} USD</span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>

            {/* PIE DEL CARRITO */}
            {cartSideTab === 'cart' && cart.length > 0 && (
              <div className="border-t border-slate-200 pt-4 space-y-3 bg-white mt-2">
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Estabilidad USD:</span>
                    <span className="text-lg font-black text-slate-900">${cartTotalUSD.toFixed(2)} USD</span>
                  </div>
                  {currency === 'VES' && (
                    <div className="flex justify-between items-baseline text-xs text-emerald-700 font-bold pt-1 border-t border-dashed">
                      <span>Equivalente BCV:</span>
                      <span>{cartTotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.</span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => { setIsCartOpen(false); setActiveTab('checkout'); }} 
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  Proceder al Pago ➔
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal Autenticación */}
      {isAuthOpen && (
        <AuthModal onClose={() => setIsAuthOpen(false)} onLogin={handleUserLogin} />
      )}

      {/* Modal Global de Perfil Incompleto */}
      <CompleteProfileModal
        user={currentUser}
        isOpen={showCompleteProfileModal}
        onComplete={() => setShowCompleteProfileModal(false)}
      />

      {/* CHATBOT FLOTANTE INTELIGENTE */}
      <ChatbotWidget exchangeRate={exchangeRate} bcvDate={bcvData.date} />

    </div>
  );
}

function AboutView() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <h2 className="text-3xl font-serif font-bold uppercase tracking-widest mb-6">Quiénes Somos</h2>
      <p className="text-gray-600 text-sm leading-relaxed mb-8">En Milano Web ofrecemos prendas y accesorios importados con estándares de lujo para brindar siempre la máxima elegancia y estilo.</p>
    </div>
  );
}

function ContactView() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <h2 className="text-3xl font-serif font-bold uppercase tracking-widest text-center mb-6">Contacto</h2>
      <form onSubmit={(e) => { e.preventDefault(); alert("Mensaje enviado"); }} className="space-y-4">
        <input type="text" placeholder="Nombre" required className="w-full border p-3 text-xs rounded-xl" />
        <input type="email" placeholder="Correo" required className="w-full border p-3 text-xs rounded-xl" />
        <textarea placeholder="Mensaje" rows="4" required className="w-full border p-3 text-xs rounded-xl"></textarea>
        <button type="submit" className="w-full bg-slate-900 text-white py-3 text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer">Enviar</button>
      </form>
    </div>
  );
}

function AuthModal({ onClose, onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [error, setError] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const checkAdminRole = async (userEmail) => {
    try {
      const userDoc = await getDoc(doc(db, "Users", userEmail));
      if (userDoc.exists()) {
        return userDoc.data().role === 'admin';
      }
    } catch (err) {
      console.error("Error al verificar el rol de administrador:", err);
    }
    return false;
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError('');

    if (!isRegister) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const isSuperUser = await checkAdminRole(user.email);
        
        const userDoc = await getDoc(doc(db, "Users", user.email));
        const userData = userDoc.exists() ? userDoc.data() : {};

        onLogin({ 
          name: userData.fullName || userData.name || user.displayName || 'Cliente Milano', 
          email: user.email,
          ...userData 
        }, isSuperUser);
      } catch (err) {
        console.error(err);
        setError('Error en las credenciales. Verifica tu correo o contraseña.');
      }
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!captchaVerified) {
      setError('Por favor marca la casilla de verificación (No soy un robot).');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const fullName = `${firstName} ${lastName}`.trim() || 'Cliente Milano';

      const userPayload = {
        uid: user.uid,
        name: firstName,
        lastname: lastName,
        firstName,
        lastName,
        fullName,
        cedula,
        email,
        phone,
        address,
        role: 'customer',
        createdAt: new Date()
      };

      await setDoc(doc(db, "Users", email), userPayload);
      await setDoc(doc(db, "Users", user.uid), userPayload);

      onLogin({ name: fullName, email, phone, firstName, lastName, cedula, address }, false);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está registrado.');
      } else {
        setError('Error al registrar el usuario. Revisa los datos.');
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoadingGoogle(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const isSuperUser = await checkAdminRole(user.email);

      const userDoc = await getDoc(doc(db, "Users", user.email));
      const userData = userDoc.exists() ? userDoc.data() : {};

      onLogin({ 
        name: userData.fullName || userData.name || user.displayName || 'Cliente Milano', 
        email: user.email,
        ...userData
      }, isSuperUser);
    } catch (err) {
      console.error("Detalle del error de Google Auth:", err.code, err.message);
      
      if (err.code === 'auth/popup-closed-by-user') {
        setError('La ventana de Google se cerró antes de completar el inicio de sesión.');
      } else {
        setError(`Error con Google (${err.code || 'desconocido'}). Intenta de nuevo.`);
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full p-6 shadow-2xl relative rounded-xl max-h-[90vh] overflow-y-auto font-sans">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black font-bold cursor-pointer">✕</button>
        
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold uppercase tracking-widest text-slate-900">
            {isRegister ? 'Registro de Usuario' : 'Iniciar Sesión'}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isRegister ? 'Crea tu cuenta para agilizar tus compras.' : 'Accede a tu cuenta de Milano Shops.'}
          </p>
        </div>

        {error && <p className="text-red-500 text-xs mb-3 text-center font-medium bg-red-50 p-2 rounded-lg">{error}</p>}
        
        <button 
          type="button" 
          disabled={loadingGoogle}
          onClick={handleGoogleLogin} 
          className="w-full border border-gray-300 py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2 mb-4 text-slate-700 disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.37 7.37 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.63 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          {loadingGoogle ? 'Conectando con Google...' : 'Continuar con Google'}
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">o con correo</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          {isRegister && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre</label>
                  <input type="text" placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-black" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Apellido</label>
                  <input type="text" placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-black" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Cédula / RIF</label>
                  <input type="text" placeholder="Ej: V-26123456" value={cedula} onChange={(e) => setCedula(e.target.value)} required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-black" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Teléfono</label>
                  <input type="text" placeholder="Ej: 04121234567" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-black" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Dirección de Habitación u Oficina</label>
                <textarea rows="2" placeholder="Av. Principal, Res. Milano, Apto 4B / Sucursal MRW" value={address} onChange={(e) => setAddress(e.target.value)} required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-black"></textarea>
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Correo Electrónico</label>
            <input type="email" placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-black" />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contraseña</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-black" />
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Confirmar Contraseña</label>
                <input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full border border-slate-300 p-2.5 text-xs rounded-xl outline-none focus:border-black" />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="captcha" checked={captchaVerified} onChange={(e) => setCaptchaVerified(e.target.checked)} className="rounded border-gray-300 cursor-pointer" />
                <label htmlFor="captcha" className="text-xs text-slate-600 select-none cursor-pointer">No soy un robot (Verificación)</label>
              </div>
            </>
          )}

          <button type="submit" className="w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 transition shadow-lg mt-2 cursor-pointer">
            {isRegister ? 'Registrarme' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="text-center mt-4 border-t pt-3">
          <button 
            type="button" 
            onClick={() => { setIsRegister(!isRegister); setError(''); }} 
            className="text-xs text-slate-600 hover:text-black font-semibold cursor-pointer"
          >
            {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </div>
      </div>
    </div>
  );
}