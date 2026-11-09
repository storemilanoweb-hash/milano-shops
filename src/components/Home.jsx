import React, { useState } from 'react';
import ProductCatalog from './ProductCatalog';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function Home({ currentUser, onAddToCart, onOpenAuth, currency, exchangeRate, onNavigate }) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('');

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;

    try {
      await addDoc(collection(db, "Subscribers"), {
        email: newsletterEmail.trim(),
        subscribedAt: new Date()
      });
      setNewsletterStatus('¡Bienvenido al Club VIP de Milano Luxury!');
      setNewsletterEmail('');
      setTimeout(() => setNewsletterStatus(''), 4000);
    } catch (err) {
      console.error("Error al suscribir:", err);
      setNewsletterStatus('Ocurrió un error. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="min-h-screen bg-[#020305] text-slate-100 font-sans antialiased selection:bg-amber-400 selection:text-slate-950">
      
      {/* 🌟 1. HERO SECTION CINEMATOGRÁFICA DE ALTA COSTURA (DIRECTOR'S CUT) */}
      <section className="relative min-h-[90vh] lg:min-h-[95vh] flex items-center justify-center overflow-hidden bg-slate-950 px-4 sm:px-8 py-20">
        
        {/* 🎥 Video de Fondo de Alta Costura (Bucle Continuo y Optimizado) */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute w-full h-full object-cover object-center scale-105 filter brightness-50 contrast-125 transition-opacity duration-1000"
            poster="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1920&auto=format&fit=crop"
          >
            {/* Video enlazado de alta calidad de pasarela / alta costura */}
            <source src="https://assets.mixkit.co/videos/preview/mixkit-models-walking-on-a-runway-at-a-fashion-show-42095-large.mp4" type="video/mp4" />
            Tu navegador no soporta videos HTML5.
          </video>

          {/* Capa de Gradiente Oscuro Envolvente (Studio Vignette & Cinematic Overlay) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#020305] via-[#020305]/70 to-[#020305]/50 backdrop-blur-[2px]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-slate-950/40 to-slate-950/90"></div>
        </div>

        {/* Contenido Principal del Hero */}
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
          
          {/* Insignia Superior Dorada */}
          <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-slate-900/80 border border-amber-500/40 backdrop-blur-xl shadow-[0_0_30px_rgba(245,158,11,0.25)] animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,1)]"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-300">
              Colección Exclusiva 2026 • Milano Import
            </span>
          </div>

          {/* Título Principal de Lujo */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-amber-200 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] uppercase">
              Elegancia Sin Límites
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto font-sans font-light tracking-wide leading-relaxed bg-slate-950/50 p-4 rounded-2xl border border-white/10 backdrop-blur-md shadow-xl">
              Redefine tu presencia con nuestra selección boutique de prendas importadas. Diseños exclusivos confeccionados para los gustos más exigentes.
            </p>
          </div>

          {/* Botones de Acción (CTA Principal) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button 
              onClick={() => onNavigate('products')} 
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-[0.25em] px-9 py-4 rounded-2xl transition-all duration-300 shadow-[0_10px_30px_rgba(245,158,11,0.4)] transform hover:scale-105 cursor-pointer"
            >
              Explorar Catálogo ➔
            </button>

            <a 
              href="#nosotros" 
              className="w-full sm:w-auto bg-slate-900/80 hover:bg-slate-800/90 text-white font-black text-xs uppercase tracking-[0.25em] px-9 py-4 rounded-2xl border border-white/15 backdrop-blur-md transition-all duration-300 shadow-xl transform hover:scale-105"
            >
              Conocer Marca ✨
            </a>
          </div>

          {/* Tarjetas de Beneficios / Autoridad Inferiores */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-12 max-w-3xl mx-auto">
            
            <div className="bg-gradient-to-br from-[#121418]/90 to-[#08090b]/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center group hover:border-amber-500/40 transition duration-500">
              <span className="text-xl mb-1">🛡️</span>
              <p className="text-base font-black text-white tracking-tight">100%</p>
              <span className="text-[9px] text-amber-400 uppercase tracking-widest font-bold mt-0.5">Garantía Importada</span>
            </div>

            <div className="bg-gradient-to-br from-[#121418]/90 to-[#08090b]/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center group hover:border-emerald-500/40 transition duration-500">
              <span className="text-xl mb-1">⚡</span>
              <p className="text-base font-black text-white tracking-tight">24/48h</p>
              <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold mt-0.5">Envíos Nacionales</span>
            </div>

            <div className="bg-gradient-to-br from-[#121418]/90 to-[#08090b]/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center group hover:border-sky-500/40 transition duration-500">
              <span className="text-xl mb-1">💎</span>
              <p className="text-base font-black text-white tracking-tight">VIP</p>
              <span className="text-[9px] text-sky-400 uppercase tracking-widest font-bold mt-0.5">Atención Personalizada</span>
            </div>

          </div>

        </div>
      </section>

      {/* 2. CINTA DE TENDENCIAS Y GARANTÍAS */}
      <section className="bg-slate-900 text-white py-4 overflow-hidden border-y border-slate-800 shadow-md">
        <div className="flex justify-around items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-200 max-w-7xl mx-auto px-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">🚚</span> ENVÍOS SEGUROS A TODO EL PAÍS (MRW / ZOOM)
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-emerald-400">💳</span> PAGO MÓVIL CON VERIFICACIÓN INSTANTÁNEA
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">💎</span> PRENDAS SELECCIONADAS DE ALTA GAMA
          </div>
        </div>
      </section>

      {/* 3. CATEGORÍAS RÁPIDAS BOUTIQUE */}
      <section className="py-20 px-4 sm:px-8 max-w-7xl mx-auto bg-white text-slate-900 rounded-[2.5rem] my-10 shadow-2xl">
        <div className="text-center space-y-2 mb-12">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Encuentra Tu Estilo
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-black uppercase tracking-wider text-slate-900">
            Categorías Exclusivas
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { title: 'Dama', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop' },
            { title: 'Caballero', img: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=600&auto=format&fit=crop' },
            { title: 'Niños', img: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?q=80&w=600&auto=format&fit=crop' },
            { title: 'Accesorios', img: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=600&auto=format&fit=crop' }
          ].map((cat, idx) => (
            <button 
              key={idx} 
              onClick={() => onNavigate('products')} 
              className="relative h-72 sm:h-96 rounded-2xl overflow-hidden group border border-slate-200 shadow-md hover:shadow-2xl transition duration-500 text-left w-full cursor-pointer"
            >
              <img 
                src={cat.img} 
                alt={cat.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition duration-700" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white space-y-1">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-300 bg-slate-950/80 px-2.5 py-1 rounded border border-amber-500/30">
                  Colección
                </span>
                <h3 className="text-xl font-black uppercase tracking-wide">{cat.title}</h3>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 4. SECCIÓN SOBRE NOSOTROS */}
      <section id="nosotros" className="py-12 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="bg-[#0f1115] border border-white/10 rounded-[2.5rem] p-8 sm:p-14 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-500/30 inline-block">
              Sello de Calidad Milano
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-black uppercase tracking-wide text-white leading-tight">
              Prestigio e Importación Exclusiva
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
              Nos especializamos en conectar a nuestros clientes con las últimas tendencias internacionales. Cada pieza de nuestro catálogo pasa por un estricto proceso de selección de materiales para asegurar acabados de nivel profesional.
            </p>
            <div className="pt-2 flex items-center gap-6 text-xs font-bold text-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Diseños Exclusivos
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Garantía de Calidad
              </div>
            </div>
          </div>

          <div className="h-80 sm:h-[400px] rounded-3xl overflow-hidden border border-white/15 relative shadow-2xl">
            <img 
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1000&auto=format&fit=crop" 
              alt="Boutique Milano" 
              className="w-full h-full object-cover filter brightness-90 hover:scale-105 transition duration-700"
            />
          </div>
        </div>
      </section>

      {/* 5. TOP 5 DE NUESTRA COLECCIÓN (DESTACADOS CON ESTRELLA ⭐) */}
      <section id="catalogo" className="py-8 bg-white text-slate-900 rounded-[2.5rem] my-10 shadow-2xl max-w-7xl mx-auto px-4 sm:px-8">
        <ProductCatalog 
          currentUser={currentUser} 
          onAddToCart={onAddToCart} 
          onOpenAuth={onOpenAuth} 
          currency={currency}
          exchangeRate={exchangeRate}
          onlyFeatured={true}
          customTitle="TOP 5 DE NUESTRA COLECCIÓN 2026"
        />
      </section>

      {/* 6. BOLETÍN VIP */}
      <section className="bg-slate-950 text-white py-20 px-4 sm:px-8 mt-16 border-t border-slate-800 relative overflow-hidden">
        <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-emerald-400 bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-800/60 shadow-lg">
            Club Privado Milano
          </span>
          <h3 className="text-2xl sm:text-4xl font-serif font-black uppercase tracking-wider">
            Sé el Primero en Enterarte
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            Recibe notificaciones exclusivas sobre el ingreso de nuevos contenedores de ropa importada y promociones VIP.
          </p>

          {newsletterStatus && (
            <p className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 p-3 rounded-xl max-w-md mx-auto">
              {newsletterStatus}
            </p>
          )}

          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input 
              type="email" 
              value={newsletterEmail}
              onChange={e => setNewsletterEmail(e.target.value)}
              placeholder="Ingresa tu correo aquí..."
              required
              className="w-full bg-slate-900 border border-slate-800 p-3.5 text-xs text-white placeholder-slate-400 rounded-xl outline-none focus:border-emerald-500 transition"
            />
            <button 
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-xl transition shadow-xl cursor-pointer"
            >
              Unirme
            </button>
          </form>
        </div>
      </section>

    </div>
  );
}