// telegramService.js

export const sendTelegramOrderNotification = async (orderData) => {
  const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/56tuut7cr53c40uipahqjvm3k3o69mst";

  if (!MAKE_WEBHOOK_URL) return;

  // Formatear los artículos para que lleguen detallados
  const itemsText = orderData.cartItems?.map(item => 
    `• ${item.name} (x${item.quantity}) - $${((item.price || 0) * item.quantity).toFixed(2)} USD`
  ).join('\n') || 'Sin detalles';

  try {
    fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: {
          fullName: orderData.userName || 'Cliente Milano',
          idNumber: orderData.paymentDetails?.cedulaPagador || orderData.phone || 'N/A',
          phone: orderData.phone || 'N/A',
          address: orderData.address || 'N/A'
        },
        paymentMethod: orderData.paymentDetails?.bancoEmisor || 'Pago Móvil',
        reference: orderData.paymentDetails?.refDigits || orderData.paymentDetails?.nroReferencia || 'N/A',
        totalUSD: (orderData.totalUSD || 0).toFixed(2),
        totalVES: orderData.paymentDetails?.montoBs || '0.00',
        // 🎟️ NUEVOS CAMPOS DEL CUPÓN PARA TELEGRAM / MAKE
        couponApplied: orderData.couponApplied || null,
        discountUSD: (orderData.discountUSD || 0).toFixed(2),
        itemsSummary: itemsText
      })
    }).catch(err => console.log("Error en segundo plano:", err));

  } catch (error) {
    console.error("Error al enviar al Webhook de Make:", error);
  }
};