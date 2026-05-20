document.addEventListener('DOMContentLoaded', () => {

    const btnNewTemplate = document.getElementById('btn-new-template');
    const btnCancelTemplate = document.getElementById('btn-cancel-template');
    const listPanel = document.getElementById('templates-list-panel');
    const newPanel = document.getElementById('new-template-panel');
    const templatesGrid = document.getElementById('templates-grid');
    const templatesEmpty = document.getElementById('templates-empty');
    
    // Formulario
    const nameInput = document.getElementById('tpl-name');
    const imageInput = document.getElementById('tpl-image');
    const textInput = document.getElementById('tpl-text');
    const btnTextInput = document.getElementById('tpl-btn-text');
    const btnUrlInput = document.getElementById('tpl-btn-url');
    const btnSave = document.getElementById('btn-save-template');

    // Previsualización
    const previewImg = document.getElementById('tpl-preview-img');
    const previewText = document.getElementById('tpl-preview-text');
    const previewBtn = document.getElementById('tpl-preview-btn');

    let currentUser = null;
    let selectedImageFile = null;

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadTemplates();
        }
    });

    // Toggle Panels
    btnNewTemplate.addEventListener('click', () => {
        listPanel.style.display = 'none';
        newPanel.style.display = 'block';
        resetForm();
    });

    btnCancelTemplate.addEventListener('click', () => {
        newPanel.style.display = 'none';
        listPanel.style.display = 'block';
    });

    // Previsualización en vivo
    function updatePreview() {
        const text = textInput.value || 'Escribe tu mensaje...';
        // Reemplazar saltos de línea por <br>
        previewText.innerHTML = text.replace(/\n/g, '<br>');
        
        if (btnTextInput.value.trim() !== '') {
            previewBtn.style.display = 'block';
            previewBtn.innerText = btnTextInput.value;
        } else {
            previewBtn.style.display = 'none';
        }

        validateForm();
    }

    textInput.addEventListener('input', updatePreview);
    btnTextInput.addEventListener('input', updatePreview);
    nameInput.addEventListener('input', validateForm);

    let currentImageBase64 = null;

    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            selectedImageFile = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                currentImageBase64 = e.target.result;
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
            }
            reader.readAsDataURL(selectedImageFile);
        } else {
            selectedImageFile = null;
            currentImageBase64 = null;
            previewImg.style.display = 'none';
            previewImg.src = '';
        }
    });

    function validateForm() {
        const isValid = nameInput.value.trim() !== '' && textInput.value.trim() !== '';
        btnSave.disabled = !isValid;
    }

    function resetForm() {
        nameInput.value = '';
        textInput.value = '';
        btnTextInput.value = '';
        btnUrlInput.value = '';
        imageInput.value = '';
        selectedImageFile = null;
        currentImageBase64 = null;
        
        previewImg.style.display = 'none';
        previewImg.src = '';
        updatePreview();
        btnSave.disabled = true;
    }

    // Load Templates
    function loadTemplates() {
        db.collection('users').doc(currentUser.uid).collection('templates')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                if (snapshot.empty) {
                    templatesEmpty.style.display = 'block';
                    templatesGrid.style.display = 'none';
                    // Disparar evento para que Campaigns actualice su select
                    window.dispatchEvent(new CustomEvent('templates-loaded', { detail: [] }));
                } else {
                    templatesEmpty.style.display = 'none';
                    templatesGrid.style.display = 'grid';
                    templatesGrid.innerHTML = '';
                    
                    const templatesList = [];

                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        data.id = doc.id;
                        templatesList.push(data);

                        const card = document.createElement('div');
                        card.style.cssText = 'background: var(--bg-glass); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; display: flex; flex-direction: column;';
                        
                        let imgHtml = '';
                        if (data.imageUrl) {
                            imgHtml = `<div style="height: 120px; overflow: hidden; border-radius: 8px; margin-bottom: 12px; background: #1a1a2e; display: flex; align-items: center; justify-content: center;">
                                        <img src="${data.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;">
                                       </div>`;
                        }

                        card.innerHTML = `
                            ${imgHtml}
                            <h3 style="font-size: 1.1rem; margin-bottom: 8px;">${data.name}</h3>
                            <p style="font-size: 0.85rem; color: var(--text-secondary); flex: 1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                                ${data.text.replace(/\n/g, '<br>')}
                            </p>
                            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between;">
                                <span style="font-size: 0.75rem; color: var(--text-muted);">${data.btnText ? 'Con enlace' : 'Solo texto'}</span>
                                <button class="btn-delete-tpl" data-id="${doc.id}" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 0.8rem;">Eliminar</button>
                            </div>
                        `;
                        templatesGrid.appendChild(card);
                    });

                    // Añadir listeners para borrar
                    document.querySelectorAll('.btn-delete-tpl').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            if (confirm('¿Seguro que deseas eliminar esta plantilla?')) {
                                const id = e.target.getAttribute('data-id');
                                db.collection('users').doc(currentUser.uid).collection('templates').doc(id).delete();
                            }
                        });
                    });

                    // Notificar a Campaigns para que recargue el select
                    window.dispatchEvent(new CustomEvent('templates-loaded', { detail: templatesList }));
                }
            });
    }

    // Guardar Plantilla
    btnSave.addEventListener('click', async () => {
        if (btnSave.disabled) return;
        
        btnSave.disabled = true;
        btnSave.innerText = 'Guardando...';

        try {
            let imageUrl = currentImageBase64; // Usar el Base64 directamente

            const templateData = {
                name: nameInput.value.trim(),
                text: textInput.value.trim(),
                btnText: btnTextInput.value.trim(),
                btnUrl: btnUrlInput.value.trim(),
                imageUrl: imageUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('users').doc(currentUser.uid).collection('templates').add(templateData);

            // Éxito
            newPanel.style.display = 'none';
            listPanel.style.display = 'block';
            resetForm();
            btnSave.innerText = 'Guardar Plantilla';

        } catch (error) {
            console.error("Error al guardar plantilla:", error);
            alert("Error al guardar: " + error.message);
            btnSave.disabled = false;
            btnSave.innerText = 'Guardar Plantilla';
        }
    });

});
