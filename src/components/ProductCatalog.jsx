import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function ProductCatalog({ currentUser, onAddToCart, onOpenAuth, currency, exchangeRate, onlyFeatured = false, customTitle = "Nuestros Productos" }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedImages, setSelectedImages] = useState({});

  const [modalProduct, setModalProduct] = useState(null);
  const [modalActiveImage, setModalActiveImage] = useState('');

  // Estados para la Vista Previa Rápida (Quick View)
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewActiveIndex, setQuickViewActiveIndex] = useState(0);

  // 💶 TASA BCV EUR EN TIEMPO REAL (RESPALDO Y OBTENCIÓN)
  const [bcvEurRate, setBcvEurRate] = useState(991.25); // Respaldo con la tasa exacta vista en pantalla

  useEffect(() => {
    const fetchEurRate = async () => {
      try {
        const response = await fetch('https://rates.dolarvzla.com/bcv/current.json');
        if (response.ok) {
          const data = await response.json();
          if (data && data.current && data.current.eur) {
            setBcvEurRate(parseFloat(data.current.eur));
          }
        }
      } catch (err) {
        console.warn("Usando tasa EUR de respaldo:", err);
      }
    };
    fetchEurRate();
  }, []);

  // ESTADO PARA EL TOAST FLOTANTE PROFESIONAL
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Función para disparar notificaciones Toast elegantes
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3500);
  };

  useEffect(() => {
    const q = query(collection(db, "Product"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleThumbnailClick = (productId, imgUrl) => {
    setSelectedImages(prev => ({ ...prev, [productId]: imgUrl }));
  };

  const openImageModal = (product) => {
    const currentImg = selectedImages[product.id] || product.images?.[0];
    setModalProduct(product);
    setModalActiveImage(currentImg);
  };

  const handleOpenQuickView = (product) => {
    setQuickViewProduct(product);
    setQuickViewActiveIndex(0);
  };

  const handleAddToCartWithToast = (product) => {
    onAddToCart(product);
    triggerToast(`¡"${product.name}" ha sido añadido al carrito con éxito! 🛒`);
  };

  // 💶 CÁLCULO ESTRICTO EN BOLÍVARES USANDO LA TASA DEL EURO BCV
  const formatPrice = (priceUSD) => {
    if (currency === 'VES') {
      const priceVES = priceUSD * bcvEurRate;
      return `${priceVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`;
    }
    return `$${priceUSD.toFixed(2)} USD`;
  };

  const baseProducts = onlyFeatured 
    ? products.filter(p => p.featured === true)
    : products;

  const filteredProducts = selectedCategory === 'Todos'
    ? baseProducts
    : baseProducts.filter(p => p.categoryId === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-sans relative">
      
      {/* NOTIFICACIÓN TOAST FLOTANTE */}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 transform ${
        showToast ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-95 pointer-events-none'
      }`}>
        <div className="bg-slate-900/95 text-white border border-slate-700/80 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3">
          <span className="w-7 h-7 bg-emerald-500 text-slate-950 rounded-xl flex items-center justify-center font-black text-xs shadow-inner">
            ✓
          </span>
          <p className="text-xs font-bold tracking-wide">
            {toastMessage}
          </p>
        </div>
      </div>

      <div className="text-center space-y-2 mb-10">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Colección Exclusiva 2026 (Tasa EUR BCV: {bcvEurRate} Bs.)
        </span>
        <h2 className="text-3xl font-serif font-black uppercase tracking-wider text-slate-900">
          {customTitle}
        </h2>
      </div>

      {/* Categorías estilo Filtro Boutique */}
      <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-12">
        {['Todos', 'Dama', 'Caballero', 'Niño', 'Niña', 'Accesorios'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-300 transform active:scale-95 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white shadow-lg scale-105'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* VISTA SKELETON / SHIMMER MIENTRAS CARGA */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between animate-pulse">
              <div>
                <div className="h-72 w-full bg-slate-200/70 rounded-xl mb-4 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.8s_infinite]"></div>
                </div>

                <div className="flex justify-center gap-2 mb-4">
                  <div className="w-9 h-9 bg-slate-200/70 rounded-lg"></div>
                  <div className="w-9 h-9 bg-slate-200/70 rounded-lg"></div>
                  <div className="w-9 h-9 bg-slate-200/70 rounded-lg"></div>
                </div>

                <div className="h-4 w-20 bg-slate-200/70 rounded mb-3"></div>
                <div className="h-4 w-3/4 bg-slate-200/70 rounded mb-2"></div>

                <div className="space-y-1.5 mb-4">
                  <div className="h-3 w-full bg-slate-200/50 rounded"></div>
                  <div className="h-3 w-5/6 bg-slate-200/50 rounded"></div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                <div className="h-5 w-20 bg-slate-200/70 rounded"></div>
                <div className="h-8 w-24 bg-slate-200/70 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-slate-50 rounded-2xl border border-slate-200 max-w-xl mx-auto">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            {onlyFeatured ? 'No hay productos marcados con estrella ⭐ en el Top 5 aún.' : 'No hay productos disponibles en esta categoría.'}
          </p>
          {onlyFeatured && (
            <p className="text-[11px] text-slate-400">Ve al Panel Admin y presiona la estrella amarilla en tus productos preferidos.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredProducts.map(product => {
            const currentDisplayImage = selectedImages[product.id] || product.images?.[0];
            const activeBadge = product.badgeText || '✨ Alta Costura';

            return (
              <div key={product.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group relative hover:-translate-y-1">
                <div>
                  <div
                    onClick={() => openImageModal(product)}
                    className="h-72 w-full bg-slate-50 rounded-xl mb-4 overflow-hidden relative cursor-pointer flex items-center justify-center border border-slate-100 p-2"
                  >
                    <span className="absolute top-3 left-3 z-20 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shadow-md bg-slate-950 text-amber-300 border-amber-400/40 backdrop-blur-xs">
                      {activeBadge}
                    </span>

                    <img
                      src={currentDisplayImage}
                      alt={product.name}
                      loading="lazy"
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-500"
                    />
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenQuickView(product);
                      }}
                      className="absolute inset-x-4 bottom-3 bg-slate-900/90 hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg backdrop-blur-xs flex items-center justify-center gap-1.5 cursor-pointer z-10 active:scale-95"
                    >
                      👁️ Vista Rápida
                    </button>
                  </div>

                  <div className="flex justify-center gap-2 mb-4">
                    {product.images?.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleThumbnailClick(product.id, img)}
                        className={`w-9 h-9 border rounded-lg overflow-hidden p-0.5 bg-slate-50 flex items-center justify-center transition cursor-pointer ${
                          currentDisplayImage === img ? 'border-emerald-600 ring-2 ring-emerald-600/30' : 'border-slate-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="thumb" loading="lazy" className="max-h-full max-w-full object-contain" />
                      </button>
                    ))}
                  </div>

                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-extrabold px-2.5 py-0.5 uppercase tracking-wider rounded-md inline-block mb-2 border border-emerald-200">
                    {product.categoryId || 'General'}
                  </span>

                  <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900 mb-1 line-clamp-1">
                    {product.name}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                  <span className="text-sm font-black text-slate-900">
                    {formatPrice(product.price || 0)}
                  </span>

                  {currentUser ? (
                    <button
                      onClick={() => handleAddToCartWithToast(product)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold px-3.5 py-2 uppercase tracking-wider rounded-lg transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 flex items-center gap-1.5 cursor-pointer group/btn"
                    >
                      <span className="group-hover/btn:scale-125 transition-transform duration-300">🛒</span>
                      <span>Añadir</span>
                    </button>
                  ) : (
                    <button
                      onClick={onOpenAuth}
                      className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold px-3 py-2 uppercase tracking-wider rounded-lg transition-all duration-300 active:scale-95 shadow-md cursor-pointer"
                    >
                      Iniciar Sesión
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE VISTA PREVIA RÁPIDA (QUICK VIEW) */}
      {quickViewProduct && (
        <div onClick={() => setQuickViewProduct(null)} className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl relative grid grid-cols-1 md:grid-cols-2 gap-6 items-center border border-slate-200">
            
            <button 
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-800 w-8 h-8 rounded-full flex items-center justify-center font-bold transition cursor-pointer z-10"
            >
              ✕
            </button>

            <div className="space-y-3">
              <div className="h-72 bg-slate-50 border rounded-2xl overflow-hidden flex items-center justify-center p-2 shadow-inner relative">
                <span className="absolute top-3 left-3 z-20 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shadow-md bg-slate-950 text-amber-300 border-amber-400/40">
                  {quickViewProduct.badgeText || '✨ Alta Costura'}
                </span>

                <img 
                  src={quickViewProduct.images?.[quickViewActiveIndex] || quickViewProduct.images?.[0]} 
                  alt={quickViewProduct.name} 
                  loading="lazy"
                  className="max-h-full object-contain"
                />
              </div>

              {quickViewProduct.images && quickViewProduct.images.length > 1 && (
                <div className="flex gap-2 justify-center overflow-x-auto pb-1">
                  {quickViewProduct.images.map((imgUrl, imgIdx) => (
                    imgUrl ? (
                      <button
                        key={imgIdx}
                        onClick={() => setQuickViewActiveIndex(imgIdx)}
                        className={`w-14 h-14 rounded-xl border-2 overflow-hidden bg-slate-50 flex items-center justify-center transition p-1 cursor-pointer ${
                          quickViewActiveIndex === imgIdx ? 'border-slate-900 ring-2 ring-slate-900/20' : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt="" loading="lazy" className="max-h-full object-contain" />
                      </button>
                    ) : null
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
                  {quickViewProduct.categoryId}
                </span>
                <h3 className="text-xl font-serif font-black uppercase text-slate-900 mt-2">
                  {quickViewProduct.name}
                </h3>
                <p className="text-xl font-black text-emerald-700 mt-1">
                  {formatPrice(quickViewProduct.price || 0)}
                </p>
                {currency === 'VES' && (
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                    Ref: ${(quickViewProduct.price || 0).toFixed(2)} USD (Tasa EUR BCV: {bcvEurRate} Bs.)
                  </p>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {quickViewProduct.description || 'Sin descripción detallada para este artículo.'}
              </p>

              <div className="pt-2 border-t flex flex-col gap-2">
                {currentUser ? (
                  <button
                    onClick={() => {
                      handleAddToCartWithToast(quickViewProduct);
                      setQuickViewProduct(null);
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 text-xs uppercase tracking-widest rounded-xl transition-all duration-300 shadow-xl active:scale-95 cursor-pointer flex items-center justify-center gap-2 group/btn"
                  >
                    <span className="group-hover/btn:scale-125 transition-transform duration-300">🛒</span>
                    <span>Agregar al Carrito Ahora</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setQuickViewProduct(null);
                      onOpenAuth();
                    }}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-3.5 text-xs uppercase tracking-widest rounded-xl transition-all duration-300 active:scale-95 shadow-xl cursor-pointer"
                  >
                    Iniciar Sesión para Comprar
                  </button>
                )}
                
                <button
                  onClick={() => setQuickViewProduct(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 text-xs uppercase tracking-wider rounded-xl transition-all duration-300 active:scale-95 cursor-pointer"
                >
                  Seguir Viendo Catálogo
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal Clásico de Detalle de Imagen */}
      {modalProduct && (
        <div onClick={() => setModalProduct(null)} className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={e => e.stopPropagation()} className="bg-white max-w-3xl w-full p-8 rounded-2xl shadow-2xl relative flex flex-col md:grid md:grid-cols-2 gap-8 items-center border border-slate-200">
            <button onClick={() => setModalProduct(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 font-bold text-xl cursor-pointer">✕</button>

            <div className="h-80 w-full bg-slate-50 border rounded-xl flex items-center justify-center p-3 relative">
              <span className="absolute top-3 left-3 z-20 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shadow-md bg-slate-950 text-amber-300 border-amber-400/40">
                {modalProduct.badgeText || '✨ Alta Costura'}
              </span>

              <img src={modalActiveImage} alt="" loading="lazy" className="max-h-full object-contain" />
            </div>

            <div className="w-full space-y-4">
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                {modalProduct.categoryId}
              </span>
              <h3 className="text-lg font-black uppercase tracking-wide text-slate-900">{modalProduct.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{modalProduct.description}</p>
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="text-2xl font-black text-slate-900">{formatPrice(modalProduct.price || 0)}</p>
                {currency === 'VES' && (
                  <p className="text-[10px] text-slate-500 font-bold">
                    Ref: ${(modalProduct.price || 0).toFixed(2)} USD (Tasa EUR BCV: {bcvEurRate} Bs.)
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {modalProduct.images?.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setModalActiveImage(img)}
                    className={`w-12 h-12 border-2 rounded-lg p-1 bg-slate-50 flex items-center justify-center cursor-pointer transition ${modalActiveImage === img ? 'border-slate-900 ring-2 ring-slate-900/20' : 'border-slate-200 opacity-70 hover:opacity-100'}`}
                  >
                    <img src={img} alt="" loading="lazy" className="max-h-full object-contain" />
                  </button>
                ))}
              </div>

              {currentUser ? (
                <button
                  onClick={() => { handleAddToCartWithToast(modalProduct); setModalProduct(null); }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 text-xs uppercase tracking-widest rounded-lg shadow-md hover:shadow-lg active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 group/btn"
                >
                  <span className="group-hover/btn:scale-125 transition-transform duration-300">🛒</span>
                  <span>Añadir al Carrito</span>
                </button>
              ) : (
                <button
                  onClick={() => { setModalProduct(null); onOpenAuth(); }}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-3 text-xs uppercase tracking-widest rounded-lg shadow-md active:scale-95 transition-all duration-300 cursor-pointer"
                >
                  Iniciar Sesión para Comprar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}