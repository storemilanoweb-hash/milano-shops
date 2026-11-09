import React, { useState, useEffect } from 'react';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import logoHeader from './LogoMilano.jpg';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  currency, 
  setCurrency, 
  user, 
  handleLogout, 
  cartCount, 
  bcvRates,
  onUpdateBcvRates 
}) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [adBanner, setAdBanner] = useState(null);

  const [rates, setRates] = useState({
    usd: bcvRates?.usd || 896.12,
    eur: bcvRates?.eur || 1004.96,
    date: new Date().toLocaleDateString('es-VE')
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAd = onSnapshot(doc(db, "Settings", "adBanner"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.active && data.mediaUrl) {
          setAdBanner(data);
        } else {
          setAdBanner(null);
        }
      } else {
        setAdBanner(null);
      }
    });
    return () => unsubscribeAd();
  }, []);

  useEffect(() => {
    const fetchBcvRealtime = async () => {
      try {
        const response = await fetch('https://rates.dolarvzla.com/bcv/current.json');
        if (response.ok) {
          const data = await response.json();
          if (data && data.current) {
            const rawDate = data.current.date || new Date().toISOString().split('T')[0];
            const [year, month, day] = rawDate.split('-');
            const formattedDate = `${day}/${month}/${year}`;

            const newRates = {
              usd: parseFloat(data.current.usd),
              eur: parseFloat(data.current.eur),
              date: formattedDate
            };

            setRates(newRates);
            if (typeof onUpdateBcvRates === 'function') {
              onUpdateBcvRates(newRates);
            }
          }
        }
      } catch (error) {
        console.error("Error al obtener la tasa oficial del BCV:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBcvRealtime();
  }, [onUpdateBcvRates]);

  const displayUsd = rates.usd.toFixed(2);
  const displayEur = rates.eur.toFixed(2);
  const userDisplayName = user?.displayName || user?.name || (user?.email?.includes('admin') ? 'Master Admin' : 'Cliente VIP');

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm font-sans">
        
        {/* MARQUESINA SUPERIOR BCV */}
        <div className="bg-slate-950 text-white text-xs py-2 overflow-hidden whitespace-nowrap relative flex items-center border-b border-slate-800">
          <style>
            {`
              @keyframes marqueeRightToLeft {
                0% { transform: translateX(100vw); }
                100% { transform: translateX(-100%); }
              }
              .animate-marquee-right {
                display: inline-flex;
                white-space: nowrap;
                animation: marqueeRightToLeft 25s linear infinite;
              }
              .animate-marquee-right:hover {
                animation-play-state: paused;
              }
              @keyframes shineSweep {
                0% { transform: translateX(-100%) rotate(25deg); }
                20%, 100% { transform: translateX(200%) rotate(25deg); }
              }
              .banner-shine-container {
                position: relative;
                overflow: hidden;
              }
              .banner-shine-container::after {
                content: '';
                position: absolute;
                top: -50%;
                left: -50%;
                width: 50%;
                height: 200%;
                background: linear-gradient(
                  to right,
                  rgba(255, 255, 255, 0) 0%,
                  rgba(255, 255, 255, 0.4) 50%,
                  rgba(255, 255, 255, 0) 100%
                );
                transform: rotate(25deg);
                animation: shineSweep 4s infinite;
                pointer-events: none;
                z-index: 5;
              }
              @keyframes goldBadgePulse {
                0%, 100% {
                  background-color: #0f172a;
                  color: #ffffff;
                  box-shadow: 0 0 0px rgba(245, 158, 11, 0);
                }
                50% {
                  background-color: #f59e0b;
                  color: #000000;
                  box-shadow: 0 0 8px rgba(245, 158, 11, 0.8);
                }
              }
              .animate-gold-badge {
                animation: goldBadgePulse 2s infinite ease-in-out;
              }
            `}
          </style>
          <div className="animate-marquee-right">
            <span className="mx-8 font-extrabold tracking-wider uppercase text-emerald-400">
              🏛️ TASA OFICIAL BCV DEL DÍA ({rates.date}): 1 USD = {displayUsd} Bs. | 1 EUR = {displayEur} Bs. | Envíos a todo el país (MRW / Zoom)
            </span>
            <span className="mx-8 font-extrabold tracking-wider uppercase text-emerald-400">
              🏛️ TASA OFICIAL BCV DEL DÍA ({rates.date}): 1 USD = {displayUsd} Bs. | 1 EUR = {displayEur} Bs. | Envíos a todo el país (MRW / Zoom)
            </span>
          </div>
        </div>

        {/* HEADER PRINCIPAL */}
        <div className="max-w-full px-4 sm:px-8 mx-auto h-24 flex items-center justify-between gap-4">
          
          <div className="flex items-center">
            <button onClick={() => setActiveTab('home')} className="focus:outline-none flex items-center flex-shrink-0 cursor-pointer">
              <img src={logoHeader} alt="Milano Header" className="h-16 md:h-20 w-auto object-contain" />
            </button>

            <nav className="hidden lg:flex items-center space-x-8 text-sm font-bold tracking-wide text-slate-800 ml-6 lg:ml-12">
              <button onClick={() => setActiveTab('home')} className={`transition-all pb-1.5 cursor-pointer ${activeTab === 'home' ? 'text-black border-b-2 border-black font-extrabold' : 'text-slate-600 hover:text-black font-semibold'}`}>INICIO</button>
              <button onClick={() => setActiveTab('about')} className={`transition-all pb-1.5 cursor-pointer ${activeTab === 'about' ? 'text-black border-b-2 border-black font-extrabold' : 'text-slate-600 hover:text-black font-semibold'}`}>NOSOTROS</button>
              <button onClick={() => setActiveTab('products')} className={`transition-all pb-1.5 cursor-pointer ${activeTab === 'products' ? 'text-black border-b-2 border-black font-extrabold' : 'text-slate-600 hover:text-black font-semibold'}`}>PRODUCTOS</button>
              <button onClick={() => setActiveTab('contact')} className={`transition-all pb-1.5 cursor-pointer ${activeTab === 'contact' ? 'text-black border-b-2 border-black font-extrabold' : 'text-slate-600 hover:text-black font-semibold'}`}>CONTACTO</button>
            </nav>
          </div>

          {/* BANNER PUBLICITARIO */}
          {adBanner && adBanner.mediaUrl && (
            <div className="hidden md:flex items-center justify-center w-[200px] lg:w-[260px] flex-shrink-0 mx-2">
              <a href={adBanner.targetUrl || '#'} target={adBanner.targetUrl ? "_blank" : "_self"} rel="noopener noreferrer" className="h-14 w-full bg-slate-50 hover:bg-slate-100 rounded-xl border border-emerald-500/60 shadow-md transition-all duration-300 flex items-center justify-center p-1 group relative cursor-pointer banner-shine-container">
                <span className="absolute top-0.5 right-1 text-[7px] font-black uppercase tracking-tighter px-1.5 py-0.2 rounded z-10 animate-gold-badge">PUBLICIDAD</span>
                {adBanner.mediaType === 'video' ? (
                  <video src={adBanner.mediaUrl} autoPlay loop muted playsInline className="max-h-full object-contain rounded-lg relative z-0" />
                ) : (
                  <img src={adBanner.mediaUrl} alt={adBanner.altText || "Anuncio"} className="max-h-full max-w-full object-contain rounded-lg relative z-0" />
                )}
              </a>
            </div>
          )}

          {/* CONTROLES DERECHOS */}
          <div className="flex items-center space-x-3 sm:space-x-4 relative flex-shrink-0">
            {user && (
              <button onClick={() => setActiveTab('admin')} className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-xs whitespace-nowrap cursor-pointer ${activeTab === 'admin' ? 'bg-slate-900 text-white' : 'bg-emerald-700 hover:bg-emerald-800 text-white'}`}>
                ⚙️ PANEL ADMIN
              </button>
            )}

            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button type="button" onClick={() => setCurrency('USD')} className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${currency === 'USD' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>USD ($)</button>
              <button type="button" onClick={() => setCurrency('VES')} className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${currency === 'VES' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>VES (Bs.)</button>
            </div>

            {user ? (
              <div className="flex items-center gap-2 sm:gap-3 relative border-l border-slate-200 pl-3">
                <div className="text-right hidden sm:block leading-tight">
                  <span className="text-[9px] text-black font-black uppercase tracking-widest block">HOLA,</span>
                  <span className="text-[11px] font-black text-emerald-700 uppercase">{userDisplayName}</span>
                </div>
                <button onClick={handleLogout} className="text-slate-500 hover:text-red-600 text-[10px] font-bold uppercase tracking-wider border border-slate-200 px-2 py-1 rounded cursor-pointer">
                  Salir
                </button>
              </div>
            ) : (
              <button onClick={() => setIsLoginOpen(true)} className="text-slate-700 hover:text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span className="hidden sm:inline">INGRESAR</span>
              </button>
            )}

            <button onClick={() => setActiveTab('cart')} className="relative text-slate-700 hover:text-black transition p-1 cursor-pointer" title="Ver Carrito">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                  {cartCount}
                </span>
              )}
            </button>

            {/* TASAS BCV */}
            <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-900 tracking-tight flex items-center gap-1 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  TASA OFICIAL BCV ({rates.date})
                </span>
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-50/80 border border-emerald-300 text-emerald-900 px-2.5 py-1 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5">
                    <span>💵</span>
                    <span>$ {displayUsd}</span>
                    <span className="text-[9px] font-normal text-emerald-700">Bs.</span>
                  </div>
                  <div className="bg-blue-50/80 border border-blue-300 text-blue-900 px-2.5 py-1 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5">
                    <span>💶</span>
                    <span>€ {displayEur}</span>
                    <span className="text-[9px] font-normal text-blue-700">Bs.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Modal de Inicio de Sesión */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
      />

      {/* Modal de Registro */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
      />
    </>
  );
}