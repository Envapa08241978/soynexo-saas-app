// payments.js

document.addEventListener('DOMContentLoaded', () => {
    // Reemplaza con tu Clave Pública de prueba
    const stripe = Stripe('pk_test_51RzLuzRsiGjgaX77mTBqqaMTeXJsrSOaLctAoIAakCqbjlszp76ECMsIwxgDuNuaqCzpGebH7t83YVYN0ny8fFco00cjFiPSDF');
    
    const buyButtons = document.querySelectorAll('.btn-buy-package');

    buyButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Verificar si el usuario está logueado
            const user = auth.currentUser;
            if (!user) {
                alert("Debes iniciar sesión para comprar saldo.");
                return;
            }

            const packageId = e.target.getAttribute('data-package');
            const priceCents = e.target.getAttribute('data-price');
            const messagesAmount = e.target.getAttribute('data-messages');
            
            // UI feedback
            const originalText = e.target.innerText;
            e.target.innerText = 'Cargando...';
            e.target.disabled = true;

            try {
                const response = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        uid: user.uid,
                        packageId: packageId,
                        price: parseInt(priceCents),
                        messagesAmount: parseInt(messagesAmount)
                    }),
                });

                const session = await response.json();
                if (session.error) throw new Error(session.error);

                const result = await stripe.redirectToCheckout({ sessionId: session.id });
                if (result.error) alert(result.error.message);

            } catch (error) {
                console.error('Error al iniciar el pago:', error);
                alert("Hubo un error al iniciar el pago. Intenta nuevamente.");
            } finally {
                e.target.innerText = originalText;
                e.target.disabled = false;
            }
        });
    });

    // --- Recarga Personalizada ---
    const customInput = document.getElementById('custom-messages-input');
    const customPriceDisplay = document.getElementById('custom-price-display');
    const btnBuyCustom = document.getElementById('btn-buy-custom');
    const PRICE_PER_MSG = 1.30; // MXN por mensaje
    const MIN_MESSAGES = 500;

    if (customInput) {
        customInput.addEventListener('input', () => {
            const qty = parseInt(customInput.value) || 0;
            if (qty >= MIN_MESSAGES) {
                const total = (qty * PRICE_PER_MSG).toFixed(2);
                customPriceDisplay.innerText = `$${parseFloat(total).toLocaleString('es-MX', {minimumFractionDigits: 2})} MXN`;
                customPriceDisplay.style.color = 'var(--accent-cyan)';
                btnBuyCustom.disabled = false;
            } else {
                customPriceDisplay.innerText = qty > 0 ? `Mínimo ${MIN_MESSAGES} mensajes` : '$0.00 MXN';
                customPriceDisplay.style.color = qty > 0 ? '#ef4444' : 'var(--accent-cyan)';
                btnBuyCustom.disabled = true;
            }
        });
    }

    if (btnBuyCustom) {
        btnBuyCustom.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) {
                alert("Debes iniciar sesión para comprar saldo.");
                return;
            }

            const qty = parseInt(customInput.value) || 0;
            if (qty < MIN_MESSAGES) {
                alert(`La cantidad mínima es de ${MIN_MESSAGES} mensajes.`);
                return;
            }

            const totalMXN = parseFloat((qty * PRICE_PER_MSG).toFixed(2));
            const totalCents = Math.round(totalMXN * 100); // Stripe necesita centavos

            const originalText = btnBuyCustom.innerText;
            btnBuyCustom.innerText = 'Cargando...';
            btnBuyCustom.disabled = true;

            try {
                const response = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        uid: user.uid,
                        packageId: 'custom',
                        price: totalCents,
                        messagesAmount: qty
                    }),
                });

                const session = await response.json();
                if (session.error) throw new Error(session.error);

                const result = await stripe.redirectToCheckout({ sessionId: session.id });
                if (result.error) alert(result.error.message);

            } catch (error) {
                console.error('Error al iniciar pago personalizado:', error);
                alert("Hubo un error al iniciar el pago. Intenta nuevamente.");
            } finally {
                btnBuyCustom.innerText = originalText;
                btnBuyCustom.disabled = false;
            }
        });
    }
});
