import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { createWorker } from 'tesseract.js';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, getDoc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { sendTelegramOrderNotification } from './telegramService';

// Logos institucionales
import mrwLogo from './MRW Logo.png';
import zoomLogo from './Zoom Logo.png';
import tealcaLogo from './Tealca Logo.png';
import milanoLogo from './LogoMilano.jpg';

export default function CheckoutView({ cart, cartTotal, currentUser, onBackToCatalog, onClearCart }) {
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [fetchingUserData, setFetchingUserData] = useState(true);
  const [shippingMethod, setShippingMethod] = useState('MRW');
  const [copiedPaymentData, setCopiedPaymentData] = useState(false);
  
  // 💶 TASA BCV EUR EN TIEMPO REAL
  const [bcvEurRate, setBcvEurRate] = useState(1001.19); 

  // 🎟️ ESTADOS PARA EL SISTEMA DE CUPONES Y ANIMACIÓN DE CONFETI
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [discountAmountUSD, setDiscountAmountUSD] = useState(0);
  const [showConfettiEffect, setShowConfettiEffect] = useState(false);

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

  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [comprobantePreview, setComprobantePreview] = useState('');
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);

  const shippingCosts = {
    'MRW': 5.00,
    'Zoom': 6.50,
    'Tealca': 6.00,
    'Retiro en Tienda': 0.00
  };

  const currentShippingUSD = shippingCosts[shippingMethod] || 0;
  const subtotalWithShippingUSD = cartTotal + currentShippingUSD;
  const finalTotalUSD = Math.max(0, subtotalWithShippingUSD - discountAmountUSD);
  const finalTotalVES = finalTotalUSD * bcvEurRate;

  const [billing, setBilling] = useState({
    name: '',
    lastname: '',
    cedula: '',
    address: '',
    phone: '',
    email: currentUser?.email || ''
  });

  const [paymentData, setPaymentData] = useState({
    bancoEmisor: 'Banesco',
    bancoReceptor: 'Banco de Venezuela',
    telefonoDestino: '04120000000',
    cedulaPagador: '',
    fechaPago: '',
    telefonoPago: '',
    montoBs: finalTotalVES.toFixed(2),
    refDigits: ''
  });

  // 🎟️ VALIDACIÓN ROBUSTA DE CUPÓN DESDE FIRESTORE
  const handleApplyCoupon = async () => {
    setCouponError('');
    const cleanCode = couponInput.trim().toUpperCase();
    if (!cleanCode) return;

    try {
      let couponSnap = await getDoc(doc(db, "Coupons", cleanCode));
      let couponData = null;

      if (couponSnap.exists()) {
        couponData = couponSnap.data();
      } else {
        const querySnapshot = await getDocs(collection(db, "Coupons"));
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.code && data.code.toUpperCase() === cleanCode) {
            couponData = data;
          }
        });
      }

      if (!couponData && cleanCode === 'MILANOVIP10') {
        couponData = {
          code: 'MILANOVIP10',
          discountType: 'percentage',
          discountValue: 10,
          active: true
        };
      }

      if (couponData && couponData.active) {
        setAppliedCoupon(couponData);
        if (couponData.discountType === 'percentage') {
          const discount = (cartTotal * couponData.discountValue) / 100;
          setDiscountAmountUSD(discount);
        } else {
          setDiscountAmountUSD(couponData.discountValue);
        }
        setCouponInput('');
        
        setShowConfettiEffect(true);
        setTimeout(() => setShowConfettiEffect(false), 3500);

      } else {
        setCouponError('El código de cupón no es válido o está inactivo.');
      }
    } catch (err) {
      console.error("Error al validar cupón:", err);
      if (cleanCode === 'MILANOVIP10') {
        const defaultCoupon = { code: 'MILANOVIP10', discountType: 'percentage', discountValue: 10, active: true };
        setAppliedCoupon(defaultCoupon);
        setDiscountAmountUSD((cartTotal * 10) / 100);
        setCouponInput('');
        setShowConfettiEffect(true);
        setTimeout(() => setShowConfettiEffect(false), 3500);
      } else {
        setCouponError('Error al verificar el cupón en el sistema.');
      }
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmountUSD(0);
    setCouponError('');
    setShowConfettiEffect(false);
  };

  useEffect(() => {
    setPaymentData(prev => ({
      ...prev,
      montoBs: (finalTotalUSD * bcvEurRate).toFixed(2)
    }));
  }, [finalTotalUSD, bcvEurRate]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const activeUser = auth.currentUser;
      if (activeUser) {
        try {
          let userDocRef = doc(db, "Users", activeUser.uid);
          let userSnap = await getDoc(userDocRef);

          if (!userSnap.exists() && activeUser.email) {
            userDocRef = doc(db, "Users", activeUser.email);
            userSnap = await getDoc(userDocRef);
          }

          if (userSnap.exists()) {
            const data = userSnap.data();
            setBilling({
              name: data.name || '',
              lastname: data.lastname || '',
              cedula: data.cedula || '',
              address: data.address || '',
              phone: data.phone || '',
              email: data.email || activeUser.email
            });

            setPaymentData(prev => ({
              ...prev,
              telefonoPago: data.phone || '',
              cedulaPagador: data.cedula || ''
            }));
          }
        } catch (err) {
          console.error("Error al cargar perfil de usuario:", err);
        }
      }
      setFetchingUserData(false);
    };

    fetchUserProfile();
  }, []);

  const handleInputChange = (e) => {
    setBilling({ ...billing, [e.target.name]: e.target.value });
  };

  const handlePaymentChange = (e) => {
    setPaymentData({ ...paymentData, [e.target.name]: e.target.value });
  };

  const handleShippingChange = (method) => {
    setShippingMethod(method);
    const newSubtotal = cartTotal + (shippingCosts[method] || 0);
    const newFinalUSD = Math.max(0, newSubtotal - discountAmountUSD);
    setPaymentData(prev => ({
      ...prev,
      montoBs: (newFinalUSD * bcvEurRate).toFixed(2)
    }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1048576) {
        alert("La imagen es muy pesada. Selecciona una captura menor a 1MB.");
        return;
      }
      setComprobanteFile(file);
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        setComprobantePreview(base64String);

        try {
          setIsProcessingOcr(true);
          const worker = await createWorker('spa');
          const ret = await worker.recognize(base64String);
          await worker.terminate();

          const text = ret.data.text;
          let detectedBanco = paymentData.bancoEmisor;
          const lowerText = text.toLowerCase();
          if (lowerText.includes('banesco')) detectedBanco = 'Banesco';
          else if (lowerText.includes('mercantil')) detectedBanco = 'Mercantil';
          else if (lowerText.includes('provincial')) detectedBanco = 'BBVA Provincial';
          else if (lowerText.includes('bnc')) detectedBanco = 'BNC';
          else if (lowerText.includes('venezuela')) detectedBanco = 'Banco de Venezuela';

          const dateMatch = text.match(/([0-9]{2})[\/.-]([0-9]{2})[\/.-]([0-9]{4})/);
          let formattedDate = paymentData.fechaPago;
          if (dateMatch) {
            const [, day, month, year] = dateMatch;
            formattedDate = `${year}-${month}-${day}`;
          }

          const cedulaLabelMatch = text.match(/(?:cédula|cedula|identificación|rif|ci|c\.i)[\s.:#-]*([vvejp0-9-]{7,10})/i);
          const rawCedula = cedulaLabelMatch ? cedulaLabelMatch[1] : '';
          const cleanCedula = rawCedula.replace(/[^0-9]/g, '');

          const refMatch = text.match(/(?:ref|referencia|nro|número|transacción|operación)[\s:]*([0-9]{6,})/i) || text.match(/\b([0-9]{6,12})\b/);
          const extractedRef = refMatch ? refMatch[1] : '';

          const telfMatch = text.match(/(?:0412|0414|0424|0416|0426)[0-9]{7}/);
          const montoMatch = text.match(/(?:bs|monto|\$)?[\s.]*([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/i) || text.match(/([0-9]+[.,][0-9]{2})/);

          const extractedTelf = telfMatch ? telfMatch[0] : '';
          const extractedMonto = montoMatch ? montoMatch[1] : '';

          setPaymentData(prev => ({
            ...prev,
            bancoEmisor: detectedBanco,
            ...(formattedDate && { fechaPago: formattedDate }),
            ...(cleanCedula.length >= 7 && { cedulaPagador: cleanCedula }),
            ...(extractedRef && { refDigits: extractedRef.slice(-8) }),
            ...(extractedTelf && { telefonoPago: extractedTelf }),
            ...(extractedMonto && { montoBs: extractedMonto })
          }));

        } catch (ocrErr) {
          console.error("Error OCR:", ocrErr);
        } finally {
          setIsProcessingOcr(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenReceiptModal = () => {
    if (!comprobantePreview) return;
    const win = window.open();
    win.document.write(`
      <html>
        <head><title>Comprobante de Pago - Milano Shops</title></head>
        <body style="background:#0f172a; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
          <img src="${comprobantePreview}" style="max-width:90%; max-height:90vh; border-radius:12px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);" />
        </body>
      </html>
    `);
  };

  const handleCopyPaymentData = () => {
    const montoLimpio = parseFloat(paymentData.montoBs || 0).toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    const cedulaLimpia = (paymentData.cedulaPagador || billing.cedula || "12345678").replace(/\D/g, '');
    const telefonoLimpio = paymentData.telefonoDestino.replace(/-/g, '');

    const textToCopy = `${cedulaLimpia}\nBanco de Venezuela\n${telefonoLimpio}\n${montoLimpio}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedPaymentData(true);
        setTimeout(() => setCopiedPaymentData(false), 2000);
      }).catch(() => fallbackCopyText(textToCopy));
    } else {
      fallbackCopyText(textToCopy);
    }
  };

  const fallbackCopyText = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedPaymentData(true);
      setTimeout(() => setCopiedPaymentData(false), 2000);
    } catch (err) {
      alert("No se pudo copiar automáticamente.");
    }
    document.body.removeChild(textArea);
  };

  const handleProceedToPayment = (e) => {
    e.preventDefault();
    if (!billing.cedula || !billing.phone || !billing.address) {
      alert('Por favor complete todos los datos de facturación y envío.');
      return;
    }
    setStep('payment');
  };

  const handleSendVerification = async (e) => {
    e.preventDefault();
    if (paymentData.refDigits.length < 8) {
      alert('Por favor ingrese los 8 últimos dígitos de la transacción.');
      return;
    }

    setLoading(true);

    let itemsText = "";
    cart.forEach(item => {
      itemsText += `- ${item.name} x${item.quantity} - $${((item.price || 0) * item.quantity).toFixed(2)}\n`;
    });

    const fullName = `${billing.name} ${billing.lastname}`.trim();

    const templateParams = {
      client_name: fullName,
      client_cedula: `V-${paymentData.cedulaPagador || billing.cedula}`,
      client_phone: billing.phone,
      client_address: billing.address,
      client_email: billing.email,
      cart_details: itemsText,
      cart_total: finalTotalUSD.toFixed(2),
      banco_emisor: paymentData.bancoEmisor,
      banco_receptor: paymentData.bancoReceptor,
      telefono_destino: paymentData.telefonoDestino,
      fecha_pago: paymentData.fechaPago,
      telefono_pago: paymentData.telefonoPago,
      monto_bs: `${paymentData.montoBs} Bs (Tasa Euro BCV: ${bcvEurRate})`,
      ref_digits: paymentData.refDigits,
      comprobante_status: comprobantePreview ? "Comprobante digital adjuntado" : "Sin comprobante"
    };

    const SERVICE_ID = "service_qg33cwg";
    const TEMPLATE_ID = "template_trwvlgu";
    const PUBLIC_KEY = "b5whOnqwIJbyDFTF5";

    try {
      await addDoc(collection(db, "Orders"), {
        userEmail: billing.email,
        userName: fullName,
        phone: billing.phone,
        address: billing.address,
        shippingMethod: shippingMethod,
        shippingCostUSD: currentShippingUSD,
        cartItems: cart,
        subtotalUSD: cartTotal,
        discountUSD: discountAmountUSD,
        couponApplied: appliedCoupon ? appliedCoupon.code : null,
        totalUSD: finalTotalUSD,
        totalVES: parseFloat(paymentData.montoBs),
        exchangeRateUsed: bcvEurRate,
        currencyUsed: 'EUR-BCV',
        paymentDetails: {
          bancoEmisor: paymentData.bancoEmisor,
          bancoReceptor: paymentData.bancoReceptor,
          telefonoDestino: paymentData.telefonoDestino,
          fechaPago: paymentData.fechaPago,
          telefonoPagador: paymentData.telefonoPago || billing.phone,
          cedulaPagador: paymentData.cedulaPagador || billing.cedula,
          montoBs: paymentData.montoBs,
          nroReferencia: paymentData.refDigits,
          comprobanteBase64: comprobantePreview || null
        },
        status: "pendiente",
        createdAt: serverTimestamp()
      });

      // 🎟️ REGISTRO AUTOMÁTICO EN EL HISTORIAL FINANCIERO Y CONTEO DE USOS
      if (appliedCoupon) {
        try {
          // 1. Guardar en la bitácora financiera CouponHistory
          await addDoc(collection(db, "CouponHistory"), {
            couponCode: appliedCoupon.code,
            userName: fullName,
            userEmail: billing.email,
            discountUSD: discountAmountUSD,
            discountVES: discountAmountUSD * bcvEurRate,
            createdAt: serverTimestamp()
          });

          // 2. Incrementar el contador timesUsed en el documento del cupón
          const couponDocRef = doc(db, "Coupons", appliedCoupon.code);
          const couponSnap = await getDoc(couponDocRef);
          if (couponSnap.exists()) {
            const currentTimes = couponSnap.data().timesUsed || 0;
            await updateDoc(couponDocRef, {
              timesUsed: currentTimes + 1
            });
          }
        } catch (couponErr) {
          console.error("Error al registrar historial de cupón:", couponErr);
        }
      }

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);

      // 📞 LLAMADA AL SERVICIO DE TELEGRAM CON LOS DATOS DEL CUPÓN
      await sendTelegramOrderNotification({
        userName: fullName,
        userEmail: billing.email,
        phone: billing.phone,
        address: billing.address,
        shippingMethod: shippingMethod,
        cartItems: cart,
        totalUSD: finalTotalUSD,
        discountUSD: discountAmountUSD,
        couponApplied: appliedCoupon ? appliedCoupon.code : null,
        paymentDetails: paymentData
      });

      let reportMessage = `*REPORTE DE PAGO (TASA EURO BCV) - MILANO SHOPS*\n\n`;
      reportMessage += `*FACTURACIÓN:*\n`;
      reportMessage += `• Nombre: ${fullName}\n`;
      reportMessage += `• Cédula: V-${paymentData.cedulaPagador || billing.cedula}\n`;
      reportMessage += `• Teléfono: ${billing.phone}\n`;
      reportMessage += `• Dirección: ${billing.address}\n`;
      reportMessage += `• Correo: ${billing.email}\n\n`;

      reportMessage += `*DETALLE DE COMPRA (Euro BCV: ${bcvEurRate} Bs.):*\n`;
      cart.forEach(item => {
        reportMessage += `• ${item.name} x${item.quantity} - $${((item.price || 0) * item.quantity).toFixed(2)}\n`;
      });
      reportMessage += `• Método de Despacho: ${shippingMethod} ($${currentShippingUSD.toFixed(2)})\n`;
      if (appliedCoupon) {
        reportMessage += `• Cupón (${appliedCoupon.code}): -$${discountAmountUSD.toFixed(2)}\n`;
      }
      reportMessage += `*Total USD:* $${finalTotalUSD.toFixed(2)}\n\n`;

      reportMessage += `*DATOS DEL PAGO MÓVIL:*\n`;
      reportMessage += `• Banco Emisor: ${paymentData.bancoEmisor}\n`;
      reportMessage += `• Banco Receptor: ${paymentData.bancoReceptor}\n`;
      reportMessage += `• Teléfono Destino: ${paymentData.telefonoDestino}\n`;
      reportMessage += `• Fecha: ${paymentData.fechaPago}\n`;
      reportMessage += `• Teléfono Origen: ${paymentData.telefonoPago}\n`;
      reportMessage += `• Monto Bs (Calculado a Tasa Euro BCV): ${paymentData.montoBs} Bs\n`;
      reportMessage += `• 8 Últimos Dígitos: ${paymentData.refDigits}\n`;

      const whatsappNumber = "584164383158";
      window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(reportMessage)}`, '_blank');

      setLoading(false);
      setStep('success');
      onClearCart();
    } catch (error) {
      console.error("Error al procesar orden:", error);
      alert(`Error al procesar: ${error.message}`);
      setLoading(false);
    }
  };

  const shippingOptions = [
    { id: 'MRW', name: 'MRW', cost: 5.00, img: mrwLogo },
    { id: 'Zoom', name: 'Zoom', cost: 6.50, img: zoomLogo },
    { id: 'Tealca', name: 'Tealca', cost: 6.00, img: tealcaLogo },
    { id: 'Retiro en Tienda', name: 'Tienda', cost: 0.00, img: milanoLogo }
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 font-sans">
      
      <style>
        {`
          @keyframes bounceIcon {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-5px) scale(1.15); }
          }
          @keyframes confettiFall {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
          }
          .gold-banner-glow {
            background: linear-gradient(135deg, #fef9c3 0%, #fef08a 50%, #fde047 100%);
            border: 2px solid #ca8a04;
            box-shadow: 0 10px 25px -5px rgba(202, 138, 4, 0.25);
          }
          .animate-gold-icon {
            animation: bounceIcon 1.8s infinite ease-in-out;
          }
          .confetti-piece {
            position: absolute;
            width: 8px;
            height: 14px;
            background-color: #f59e0b;
            top: 0;
            animation: confettiFall 2.5s ease-out forwards;
          }
        `}
      </style>

      {step === 'form' && (
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm relative overflow-hidden">
          
          {showConfettiEffect && (
            <div className="absolute inset-x-0 top-0 h-32 pointer-events-none z-30 overflow-hidden flex justify-around">
              {[...Array(16)].map((_, i) => (
                <div 
                  key={i} 
                  className="confetti-piece rounded-xs" 
                  style={{
                    left: `${i * 6}%`,
                    backgroundColor: i % 3 === 0 ? '#eab308' : i % 2 === 0 ? '#10b981' : '#3b82f6',
                    animationDelay: `${(i % 5) * 0.15}s`
                  }}
                />
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b pb-4">
            <div>
              <h2 className="text-xl font-serif font-black uppercase tracking-wider text-slate-900">
                Datos de Facturación y Envío
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                💱 Todos los pagos en Bolívares se calculan a la tasa oficial del <strong>Euro BCV ({bcvEurRate} Bs.)</strong>.
              </p>
            </div>
            {fetchingUserData && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full animate-pulse mt-2 sm:mt-0">
                ⌛ Cargando perfil...
              </span>
            )}
          </div>

          <form onSubmit={handleProceedToPayment} className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-3 text-center">
                Seleccione el Método de Despacho
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {shippingOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleShippingChange(opt.id)}
                    className={`p-3 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-between h-28 cursor-pointer ${
                      shippingMethod === opt.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1 shadow-xs overflow-hidden">
                      <img src={opt.img} alt={opt.name} className="w-full h-full object-contain" />
                    </div>
                    <span className="uppercase text-[11px] tracking-tight">{opt.id}</span>
                    <span className={`text-[10px] font-normal ${shippingMethod === opt.id ? 'text-slate-300' : 'text-slate-500'}`}>
                      {opt.cost === 0 ? 'Gratis' : `$${opt.cost.toFixed(2)}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Nombre</label>
                <input type="text" name="name" value={billing.name} onChange={handleInputChange} required className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Apellido</label>
                <input type="text" name="lastname" value={billing.lastname} onChange={handleInputChange} required className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Cédula de Identidad</label>
                <input type="text" name="cedula" placeholder="Ej: 26123456" value={billing.cedula} onChange={handleInputChange} required className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Número de Teléfono</label>
                <input type="text" name="phone" placeholder="Ej: 04121234567" value={billing.phone} onChange={handleInputChange} required className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Correo Electrónico</label>
              <input type="email" name="email" value={billing.email} onChange={handleInputChange} required className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900" />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Dirección de Destino o Sucursal</label>
              <textarea name="address" rows="2" placeholder="Ciudad, Estado, Municipio o Agencia de envío seleccionada" value={billing.address} onChange={handleInputChange} required className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900"></textarea>
            </div>

            {/* SECCIÓN DE CUPÓN DE DESCUENTO */}
            <div className="gold-banner-glow p-5 rounded-2xl space-y-3 mt-5 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-md animate-gold-icon">
                    % ⬇
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">
                      ¿Tienes un Código Promocional?
                    </h4>
                    <p className="text-[10px] font-bold text-amber-800">
                      Usa <span className="bg-amber-200 px-1.5 py-0.5 rounded text-amber-950">MILANOVIP10</span> para obtener un 10% de descuento instantáneo.
                    </p>
                  </div>
                </div>
              </div>
              
              {!appliedCoupon ? (
                <div className="flex gap-2 pt-1">
                  <input 
                    type="text"
                    placeholder="EJ: MILANOVIP10"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-1 border-2 border-amber-400 bg-white px-4 py-2.5 text-xs rounded-xl uppercase outline-none focus:border-amber-600 font-black text-slate-900 tracking-wider shadow-xs"
                  />
                  <button 
                    type="button"
                    onClick={handleApplyCoupon}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer"
                  >
                    Aplicar Cupón
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center bg-emerald-50 border-2 border-emerald-400 p-3.5 rounded-xl shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🎉</span>
                    <div>
                      <span className="text-emerald-900 font-black text-xs block uppercase">
                        ¡Cupón <span className="underline">{appliedCoupon.code}</span> Aplicado con Éxito!
                      </span>
                      <span className="text-emerald-700 text-[11px] font-bold">
                        Se ha aplicado un descuento de -{appliedCoupon.discountValue}% en tu orden.
                      </span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={removeCoupon} 
                    className="text-xs text-rose-600 font-black bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    Quitar
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-rose-700 text-xs font-black bg-rose-50 border border-rose-200 p-2 rounded-lg text-center">
                  ⚠️ {couponError}
                </p>
              )}
            </div>

            <div className="border-t pt-4 mt-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-3">Resumen de tu Compra</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-2 mb-4">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between text-xs text-slate-600">
                    <span>{item.name} (x{item.quantity})</span>
                    <span className="font-semibold">${((item.price || 0) * item.quantity).toFixed(2)} USD</span>
                  </div>
                ))}
              </div>
              
              <div className="space-y-1.5 text-xs border-t pt-3">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal productos:</span>
                  <span>${cartTotal.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Envío ({shippingMethod}):</span>
                  <span>{currentShippingUSD === 0 ? 'Gratis' : `$${currentShippingUSD.toFixed(2)} USD`}</span>
                </div>
                
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700 font-extrabold bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                    <span>Descuento Promocional ({appliedCoupon.code} - {appliedCoupon.discountValue}%):</span>
                    <span>-${discountAmountUSD.toFixed(2)} USD</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-black pt-2 border-t text-slate-900">
                  <span>Total USD:</span>
                  <span>${finalTotalUSD.toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 text-emerald-700 bg-emerald-50 p-2.5 rounded-xl mt-2">
                  <span>Total en Bs. (Tasa Euro BCV - {bcvEurRate} Bs.):</span>
                  <span>{finalTotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.</span>
                </div>
              </div>
            </div>

            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 text-xs font-black uppercase tracking-widest rounded-xl transition shadow-xl mt-4 cursor-pointer">
              Continuar al Pago
            </button>
          </form>
        </div>
      )}

      {step === 'payment' && (
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm text-center space-y-6">
          <h2 className="text-xl font-serif font-black uppercase tracking-wider text-slate-900">Realiza tu Pago Móvil</h2>
          <p className="text-xs text-slate-500">
            Transfiere el monto exacto calculado a la tasa oficial del <strong>Euro BCV ({bcvEurRate} Bs.)</strong>:
          </p>

          <div className="bg-slate-50 border p-5 text-left max-w-md mx-auto rounded-2xl space-y-3 text-xs font-medium">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold uppercase tracking-wider text-slate-700">Datos Bancarios</span>
              <button
                type="button"
                onClick={handleCopyPaymentData}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition shadow-sm cursor-pointer ${
                  copiedPaymentData ? 'bg-emerald-600 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copiedPaymentData ? '✓ ¡Datos Copiados!' : '📋 Copiar Datos'}
              </button>
            </div>
            
            <p><strong>Cédula:</strong> V-12345678</p>
            <p><strong>Banco:</strong> Banco de Venezuela (0102)</p>
            <p><strong>Teléfono Destino:</strong> {paymentData.telefonoDestino}</p>
            <p className="text-sm font-black text-slate-900 pt-1 border-t text-emerald-700">
              Monto a Pagar: {parseFloat(paymentData.montoBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setStep('verification')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 text-xs font-black uppercase tracking-widest transition rounded-xl shadow-lg cursor-pointer">
              Sí, Ya Pagué
            </button>
            <button onClick={onBackToCatalog} className="border border-slate-900 text-slate-900 px-8 py-3.5 text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition rounded-xl cursor-pointer">
              No, Seguir Comprando
            </button>
          </div>
        </div>
      )}

      {step === 'verification' && (
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm">
          <h2 className="text-xl font-serif font-black uppercase tracking-wider text-slate-900 mb-6 text-center">
            Datos de Verificación del Pago (Tasa Euro BCV)
          </h2>
          <form onSubmit={handleSendVerification} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Banco Emisor (Tu banco)</label>
                <select name="bancoEmisor" value={paymentData.bancoEmisor} onChange={handlePaymentChange} className="w-full border p-3 text-xs rounded-xl bg-white outline-none focus:border-slate-900">
                  <option value="Banesco">Banesco</option>
                  <option value="Banco de Venezuela">Banco de Venezuela</option>
                  <option value="Mercantil">Mercantil</option>
                  <option value="BBVA Provincial">BBVA Provincial</option>
                  <option value="BNC">BNC</option>
                  <option value="Otros">Otro Banco</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Banco Receptor</label>
                <input type="text" name="bancoReceptor" value={paymentData.bancoReceptor} readOnly className="w-full border p-3 text-xs bg-slate-100 rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Fecha del Pago</label>
                <input type="date" name="fechaPago" value={paymentData.fechaPago} onChange={handlePaymentChange} required className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Teléfono Origen del Pago</label>
                <input type="text" name="telefonoPago" placeholder="Ej: 04141234567" value={paymentData.telefonoPago} onChange={handlePaymentChange} required className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Teléfono Destino (Receptor)</label>
                <input type="text" name="telefonoDestino" value={paymentData.telefonoDestino} onChange={handlePaymentChange} required className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Cédula del Pagador</label>
                <input type="text" name="cedulaPagador" placeholder="Ej: 26123456" value={paymentData.cedulaPagador} onChange={handlePaymentChange} required className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Monto en Bolívares (Calculado a Tasa Euro BCV)</label>
                <input type="text" name="montoBs" value={paymentData.montoBs} onChange={handlePaymentChange} required className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900 bg-emerald-50/50 font-bold text-emerald-800" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">08 Últimos Dígitos de Transacción</label>
                <input type="text" name="refDigits" maxLength="8" placeholder="Ej: 12345678" value={paymentData.refDigits} onChange={handlePaymentChange} required className="w-full border p-3 text-xs rounded-xl outline-none focus:border-slate-900" />
              </div>
            </div>

            <div className="border border-dashed border-slate-300 p-4 rounded-2xl bg-slate-50 text-center space-y-2">
              <label className="block text-[10px] font-black uppercase text-slate-700">
                📎 Adjuntar Comprobante de Pago (Captura / Foto)
              </label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer w-full"
              />
              
              {isProcessingOcr && (
                <p className="text-[10px] font-bold text-purple-600 animate-pulse mt-1">
                  🤖 Leyendo comprobante y autocompletando datos...
                </p>
              )}

              {comprobantePreview && !isProcessingOcr && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="text-[10px] text-emerald-600 font-bold">✓ Captura cargada y leída con éxito</span>
                  <button 
                    type="button"
                    onClick={handleOpenReceiptModal}
                    className="text-[10px] text-blue-600 underline font-semibold cursor-pointer bg-transparent border-0 p-0"
                  >
                    Ver imagen cargada
                  </button>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 text-xs font-black uppercase tracking-widest rounded-xl transition shadow-xl mt-4 cursor-pointer">
              {loading ? "Enviando reporte..." : "Enviar a Verificación"}
            </button>
          </form>
        </div>
      )}

      {step === 'success' && (
        <div className="bg-white border border-slate-200 p-10 text-center rounded-3xl shadow-sm space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-3xl font-black">
            ✓
          </div>
          <h2 className="text-2xl font-serif font-black uppercase tracking-wider text-slate-900">¡Pago Reportado con Éxito!</h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
            Se ha registrado tu orden calculada a la tasa oficial del <strong>Euro BCV</strong>, la captura del comprobante fue guardada y se generaron los reportes automáticos por WhatsApp y Telegram.
          </p>
          <button onClick={onBackToCatalog} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition cursor-pointer">
            Volver al Catálogo
          </button>
        </div>
      )}
    </div>
  );
}