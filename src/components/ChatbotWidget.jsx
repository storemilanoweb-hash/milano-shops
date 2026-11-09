import React, { useState, useRef, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import logoMilano from './LogoMilano.jpg';

export default function ChatbotWidget({ exchangeRate, bcvDate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      sender: 'bot', 
      text: '¡Hola! Bienvenido a Milano Shops. ¿En qué puedo ayudarte hoy sobre nuestros precios, horarios, tasas BCV o métodos de pago?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null); // <--- 1. Referencia para el campo de texto

  // 💶 TASA BCV EUR EN TIEMPO REAL PARA EL CHATBOT
  const [bcvEurRate, setBcvEurRate] = useState(991.25);

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
        console.warn("Usando tasa EUR de respaldo en chatbot:", err);
      }
    };
    fetchEurRate();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // <--- 2. Efecto para posicionar el cursor automáticamente al abrir el chat
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100); // Pequeño retardo para asegurar que la animación del modal haya terminado
    }
  }, [isOpen]);

  const handleUserMessageSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    const lowerMsg = userMessage.toLowerCase();
    
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    let botReply = null;

    try {
      // 1. CONSULTAR PRIMERO LAS REGLAS DINÁMICAS GUARDADAS EN FIRESTORE (ChatbotRules)
      const rulesSnapshot = await getDocs(collection(db, "ChatbotRules"));
      if (!rulesSnapshot.empty) {
        const rules = rulesSnapshot.docs.map(doc => doc.data());
        const matchedRule = rules.find(rule => 
          rule.keyword && lowerMsg.includes(rule.keyword.trim().toLowerCase())
        );
        if (matchedRule) {
          botReply = matchedRule.reply;
        }
      }

      // 2. SI NO HAY REGLA PERSONALIZADA, EVALUAR LOS FILTROS PREDETERMINADOS
      if (!botReply) {
        if (lowerMsg.includes('precio') || lowerMsg.includes('producto') || lowerMsg.includes('ropa') || lowerMsg.includes('vestido') || lowerMsg.includes('catalogo')) {
          const querySnapshot = await getDocs(collection(db, "Product"));
          if (!querySnapshot.empty) {
            let productList = [];
            querySnapshot.forEach((docSnap) => {
              const data = docSnap.data();
              productList.push(`• ${data.name}: $${data.price} USD`);
            });
            botReply = `Aquí tienes algunas de nuestras piezas disponibles en Milano Shops:\n\n${productList.slice(0, 4).join('\n')}\n\n¡Puedes ver el catálogo completo en la sección de Productos!`;
          } else {
            botReply = "Actualmente estamos actualizando nuestro inventario boutique. ¡Revisa la sección de Productos en breve!";
          }
        } 
        else if (lowerMsg.includes('bcv') || lowerMsg.includes('tasa') || lowerMsg.includes('dolar') || lowerMsg.includes('euro') || lowerMsg.includes('bs')) {
          const usdRate = exchangeRate ? exchangeRate.toFixed(2) : '897.54';
          const eurRate = bcvEurRate ? bcvEurRate.toFixed(2) : '1001.19';
          const fechaVigente = bcvDate || '09/11/2026';

          botReply = `🏛️ *Tasas Oficiales del BCV (${fechaVigente}):*\n\n` +
                     `🇺🇸 **Dólar BCV:** ${usdRate} Bs.\n` +
                     `🇪🇺 **Euro BCV:** ${eurRate} Bs.`;
        } 
        else if (lowerMsg.includes('pago') || lowerMsg.includes('movil') || lowerMsg.includes('zelle') || lowerMsg.includes('banco') || lowerMsg.includes('efectivo')) {
          botReply = "💳 Aceptamos Pago Móvil (Banco de Venezuela), Zelle y efectivo. Al realizar tu compra en el carrito, podrás reportar tu pago móvil adjuntando el comprobante o captura.";
        } 
        else if (lowerMsg.includes('envio') || lowerMsg.includes('mrw') || lowerMsg.includes('zoom') || lowerMsg.includes('tealca') || lowerMsg.includes('nacional') || lowerMsg.includes('despacho')) {
          botReply = "🚚 Realizamos envíos seguros a todo el país a través de MRW, Zoom y Tealca, o puedes seleccionar 'Retiro en Tienda' sin costo adicional.";
        } 
        else if (lowerMsg.includes('horario') || lowerMsg.includes('hora') || lowerMsg.includes('abierto') || lowerMsg.includes('atencion') || lowerMsg.includes('dias')) {
          botReply = "🕒 Nuestro horario de atención en línea es de Lunes a Sábado de 9:00 AM a 7:00 PM. ¡Estamos disponibles para procesar tus pedidos y consultas!";
        }
        else if (lowerMsg.includes('hola') || lowerMsg.includes('buenas') || lowerMsg.includes('saludos')) {
          botReply = "¡Hola! ¿En qué puedo asistirte hoy? Pregúntame sobre nuestros precios, tasas BCV, métodos de envío o horarios de atención.";
        }
      }

      // 3. MENSAJE POR DEFECTO SI NINGUNA CONDICIÓN COINCIDE
      if (!botReply) {
        botReply = "Lo siento, no encontré una respuesta exacta. Puedes escribirnos directamente por WhatsApp para atenderte de forma personalizada.";
      }

    } catch (error) {
      console.error("Error al consultar Firestore desde el chatbot:", error);
      botReply = "Ocurrió un pequeño error al consultar los datos, pero puedes comunicarte con nuestro soporte oficial.";
    }

    setTimeout(() => {
      setMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center justify-center cursor-pointer border-2 border-white group relative animate-bounce"
          title="Asistencia y Chat en Línea"
        >
          {/* ICONO OFICIAL DE WHATSAPP SVG */}
          <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center shadow-md">
            1
          </span>
        </button>
      ) : (
        <div className="w-80 sm:w-96 h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
          
          {/* HEADER DEL CHAT */}
          <div className="bg-emerald-600 text-white p-3.5 flex justify-between items-center border-b border-emerald-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-10 bg-white rounded-xl overflow-hidden shrink-0 shadow-inner flex items-center justify-center p-1 border border-emerald-500">
                <img src={logoMilano} alt="Milano Shops" className="w-full h-full object-contain" />
              </div>
              <div className="leading-tight">
                <h3 className="font-serif font-black text-[11px] uppercase tracking-wider text-white">
                  Asistencia WhatsApp
                </h3>
                <p className="font-serif font-bold text-[10px] uppercase tracking-wide text-emerald-100 mt-0.5">
                  Milano Shops
                </p>
                <p className="text-[10px] text-white/90 italic font-medium flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse inline-block"></span>
                  En línea para ayudarte
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-emerald-200 font-bold cursor-pointer p-1 text-sm">
              ✕
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                    msg.sender === 'user'
                      ? 'bg-slate-900 text-white rounded-br-none shadow-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-400 p-3 rounded-2xl border border-slate-200 text-xs shadow-sm animate-pulse">
                  Escribiendo respuesta...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleUserMessageSubmit} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input
              ref={inputRef} /* <--- 3. Conectamos la referencia al input de texto */
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta aquí..."
              className="flex-1 border border-slate-300 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}