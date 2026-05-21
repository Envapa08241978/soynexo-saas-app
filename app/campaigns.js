document.addEventListener('DOMContentLoaded', () => {

    const btnNewCampaign = document.getElementById('btn-new-campaign');
    const btnCancelCampaign = document.getElementById('btn-cancel-campaign');
    const listPanel = document.getElementById('campaigns-list-panel');
    const newPanel = document.getElementById('new-campaign-panel');
    
    const templateSelect = document.getElementById('campaign-template');
    const audienceSelect = document.getElementById('campaign-audience');
    const nameInput = document.getElementById('campaign-name');
    const summaryCount = document.getElementById('summary-count');
    const summaryCost = document.getElementById('summary-cost');
    const btnSend = document.getElementById('btn-send-campaign');
    
    const previewContainer = document.getElementById('preview-msg-container');
    const previewImage = document.getElementById('preview-image');
    const previewText = document.getElementById('preview-text');
    const previewLink = document.getElementById('preview-link');
    
    const campaignsList = document.getElementById('campaigns-list');
    const campaignsEmpty = document.getElementById('campaigns-empty');
    const campaignsTableContainer = document.getElementById('campaigns-table-container');

    let currentUser = null;
    let allContacts = [];
    let currentBalance = 0;
    let userTemplates = [];
    let userWhatsAppConfig = null; // { phoneNumberId, metaSystemToken, whatsappConnected }

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadCampaigns();
            listenToBalance();
            loadWhatsAppConfig();
        }
    });

    // Cargar configuración de WhatsApp del usuario
    function loadWhatsAppConfig() {
        db.collection('users').doc(currentUser.uid).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                userWhatsAppConfig = {
                    whatsappConnected: data.whatsappConnected || false,
                    phoneNumberId: data.phoneNumberId || null,
                    metaSystemToken: data.metaSystemToken || null,
                    wabaId: data.wabaId || null
                };
            }
        });
    }

    // Escuchar cuando la pestaña de campañas se activa
    window.addEventListener('campanas-tab-active', () => {
        if (currentUser) {
            loadContactsForAudience();
        }
    });

    // Escuchar cuando se cargan las plantillas
    window.addEventListener('templates-loaded', (e) => {
        userTemplates = e.detail;
        
        // Actualizar select
        templateSelect.innerHTML = '<option value="" disabled selected>Selecciona una plantilla...</option>';
        userTemplates.forEach(tpl => {
            const option = document.createElement('option');
            option.value = tpl.id;
            option.textContent = tpl.name;
            templateSelect.appendChild(option);
        });
        
        // Reset preview si la plantilla seleccionada ya no existe
        if (!userTemplates.find(t => t.id === templateSelect.value)) {
            templateSelect.value = '';
            previewContainer.style.display = 'none';
        }
    });

    // Toggle Panels
    btnNewCampaign.addEventListener('click', () => {
        listPanel.style.display = 'none';
        newPanel.style.display = 'block';
        resetForm();
    });

    btnCancelCampaign.addEventListener('click', () => {
        newPanel.style.display = 'none';
        listPanel.style.display = 'block';
    });

    // Load Campaigns
    function loadCampaigns() {
        db.collection('users').doc(currentUser.uid).collection('campaigns')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                if (snapshot.empty) {
                    campaignsEmpty.style.display = 'block';
                    campaignsTableContainer.style.display = 'none';
                } else {
                    campaignsEmpty.style.display = 'none';
                    campaignsTableContainer.style.display = 'block';
                    campaignsList.innerHTML = '';
                    
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString() : 'En proceso...';
                        
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td style="padding: 16px; border-top: 1px solid var(--border-color);">${data.name}</td>
                            <td style="padding: 16px; border-top: 1px solid var(--border-color);">
                                ${data.audience === 'all' ? 'Todos' : data.audience} (${data.count} msgs)
                            </td>
                            <td style="padding: 16px; border-top: 1px solid var(--border-color); text-transform: capitalize;">${data.template}</td>
                            <td style="padding: 16px; border-top: 1px solid var(--border-color);">${date}</td>
                        `;
                        campaignsList.appendChild(tr);
                    });
                }
            });
    }

    function listenToBalance() {
        db.collection('users').doc(currentUser.uid).onSnapshot(doc => {
            if(doc.exists) {
                currentBalance = doc.data().balanceMessages || 0;
                validateForm(); // Re-validar si cambia el saldo
            }
        });
    }

    function loadContactsForAudience() {
        db.collection('users').doc(currentUser.uid).collection('contacts').get()
            .then((querySnapshot) => {
                allContacts = [];
                const etiquetasSet = new Set();
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    allContacts.push(data);
                    if(data.etiqueta) etiquetasSet.add(data.etiqueta);
                });
                
                // Populate select
                audienceSelect.innerHTML = `<option value="all">Todos los contactos (${allContacts.length})</option>`;
                
                etiquetasSet.forEach(etiq => {
                    const count = allContacts.filter(c => c.etiqueta === etiq).length;
                    const option = document.createElement('option');
                    option.value = etiq;
                    option.textContent = `${etiq} (${count})`;
                    audienceSelect.appendChild(option);
                });
                
                updateSummary();
            });
    }

    // Handlers
    templateSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const tpl = userTemplates.find(t => t.id === val);
        
        if(tpl) {
            previewContainer.style.display = 'block';
            previewText.innerHTML = tpl.text.replace(/\n/g, '<br>');
            
            if(tpl.imageUrl) {
                previewImage.src = tpl.imageUrl;
                previewImage.style.display = 'block';
            } else {
                previewImage.style.display = 'none';
                previewImage.src = '';
            }

            if(tpl.btnText) {
                previewLink.style.display = 'block';
                previewLink.innerText = tpl.btnText;
            } else {
                previewLink.style.display = 'none';
            }
        } else {
            previewContainer.style.display = 'none';
        }
        validateForm();
    });

    audienceSelect.addEventListener('change', () => {
        updateSummary();
    });

    nameInput.addEventListener('input', validateForm);

    function updateSummary() {
        const selected = audienceSelect.value;
        let count = 0;
        
        if (selected === 'all') {
            count = allContacts.length;
        } else {
            count = allContacts.filter(c => c.etiqueta === selected).length;
        }
        
        summaryCount.innerText = count.toLocaleString();
        summaryCost.innerText = `-${count.toLocaleString()} mensajes`;
        
        validateForm();
    }

    function validateForm() {
        const selectedAudience = audienceSelect.value;
        let count = selectedAudience === 'all' ? allContacts.length : allContacts.filter(c => c.etiqueta === selectedAudience).length;
        
        const isNameValid = nameInput.value.trim().length > 0;
        const isTemplateValid = templateSelect.value !== "";
        const isCountValid = count > 0;
        const hasBalance = currentBalance >= count;
        
        if (!hasBalance && isCountValid) {
            summaryCost.style.color = '#ef4444';
            summaryCost.innerText = `-${count} mensajes (Saldo insuficiente)`;
        } else {
            summaryCost.style.color = '#e2e8f0';
            summaryCost.innerText = `-${count} mensajes`;
        }

        btnSend.disabled = !(isNameValid && isTemplateValid && isCountValid && hasBalance);
    }

    function resetForm() {
        nameInput.value = '';
        templateSelect.value = '';
        audienceSelect.selectedIndex = 0;
        previewContainer.style.display = 'none';
        btnSend.disabled = true;
        if(currentUser) loadContactsForAudience();
    }

    btnSend.addEventListener('click', async () => {
        if (btnSend.disabled) return;

        // Verificar que WhatsApp esté conectado
        if (!userWhatsAppConfig || !userWhatsAppConfig.whatsappConnected) {
            alert('⚠️ Tu WhatsApp no está conectado. Ve al Dashboard y conecta tu número primero.');
            return;
        }

        if (!userWhatsAppConfig.phoneNumberId || !userWhatsAppConfig.metaSystemToken) {
            alert('⚠️ Falta configuración de WhatsApp (phoneNumberId o token). Reconecta tu número.');
            return;
        }

        const selectedAudience = audienceSelect.value;
        const contactsToSend = selectedAudience === 'all'
            ? allContacts
            : allContacts.filter(c => c.etiqueta === selectedAudience);
        const count = contactsToSend.length;

        if (count === 0) {
            alert('No hay contactos en la audiencia seleccionada.');
            return;
        }

        const confirmed = confirm(`¿Enviar campaña a ${count} contactos?\n\nSe descontarán ${count} mensajes de tu saldo.`);
        if (!confirmed) return;

        btnSend.disabled = true;
        btnSend.innerText = `Enviando 0 / ${count}...`;

        const campaignName = nameInput.value.trim();
        // Usamos la nueva plantilla flexible de Meta
        const metaTemplateName = 'campana_flexible';

        // Obtener el contenido de la plantilla creada por el usuario
        const selectedTpl = userTemplates.find(t => t.id === templateSelect.value);
        const businessName = selectedTpl ? selectedTpl.name : 'Mi Negocio';
        const bodyText = selectedTpl ? selectedTpl.text : 'Tenemos un mensaje para ti.';

        try {
            // 1. Llamar a la API de envío real
            const sendResponse = await fetch('/api/sendWhatsAppMessage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneNumberId: userWhatsAppConfig.phoneNumberId,
                    accessToken: userWhatsAppConfig.metaSystemToken,
                    contacts: contactsToSend,
                    templateName: metaTemplateName,
                    templateVariables: {
                        businessName: businessName,
                        bodyText: bodyText
                    }
                })
            });

            const sendResult = await sendResponse.json();
            console.log('Resultado envío:', sendResult);

            const sentCount = sendResult.sent || 0;
            const failedCount = sendResult.failed || 0;

            // 2. Descontar del saldo solo los mensajes enviados exitosamente
            const userRef = db.collection('users').doc(currentUser.uid);
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) throw 'Usuario no existe';

                const currentBal = userDoc.data().balanceMessages || 0;
                const newBalance = currentBal - sentCount;
                if (newBalance < 0) throw 'Saldo insuficiente';

                transaction.update(userRef, { balanceMessages: newBalance });

                const campaignRef = userRef.collection('campaigns').doc();
                transaction.set(campaignRef, {
                    name: campaignName,
                    audience: selectedAudience,
                    template: metaTemplateName,
                    count: sentCount,
                    failed: failedCount,
                    totalTargeted: count,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: sentCount > 0 ? 'sent' : 'failed'
                });
            });

            // 3. Mostrar resultado
            let mensaje = `✅ Campaña "${campaignName}" completada:\n\n`;
            mensaje += `📤 Enviados: ${sentCount}\n`;
            if (failedCount > 0) {
                mensaje += `❌ Fallidos: ${failedCount}\n`;
                if (sendResult.errors && sendResult.errors.length > 0) {
                    mensaje += `\nPrimeros errores:\n`;
                    sendResult.errors.slice(0, 3).forEach(e => {
                        mensaje += `• ${e.contact}: ${e.reason}\n`;
                    });
                }
            }

            alert(mensaje);
            btnSend.innerText = 'Enviar Campaña';
            newPanel.style.display = 'none';
            listPanel.style.display = 'block';
            resetForm();

        } catch (err) {
            console.error('Error al enviar campaña:', err);
            alert('❌ Error al enviar la campaña: ' + err);
            btnSend.disabled = false;
            btnSend.innerText = 'Enviar Campaña';
        }
    });

});
