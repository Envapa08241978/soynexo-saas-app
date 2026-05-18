document.addEventListener('DOMContentLoaded', () => {
    const fileImport = document.getElementById('file-import');
    const contactsList = document.getElementById('contacts-list');
    const contactsEmpty = document.getElementById('contacts-empty');
    const contactsTableContainer = document.getElementById('contacts-table-container');
    const btnDeleteAll = document.getElementById('btn-delete-all');
    let currentUser = null;

    // Escuchar autenticación para saber de quién son los contactos
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            cargarContactos(user.uid);
        }
    });

    // Cargar Contactos desde Firestore
    function cargarContactos(uid) {
        db.collection('users').doc(uid).collection('contacts').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
            contactsList.innerHTML = '';
            
            if (snapshot.empty) {
                contactsEmpty.style.display = 'block';
                contactsTableContainer.style.display = 'none';
                btnDeleteAll.style.display = 'none';
                return;
            }

            contactsEmpty.style.display = 'none';
            contactsTableContainer.style.display = 'block';
            btnDeleteAll.style.display = 'block';

            snapshot.forEach(doc => {
                const contact = doc.data();
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid var(--border-color)';
                
                tr.innerHTML = `
                    <td style="padding: 16px;">
                        <div style="font-weight: 500; color: var(--text-primary);">${contact.name || 'Sin nombre'}</div>
                    </td>
                    <td style="padding: 16px; color: var(--text-secondary);">${contact.phone}</td>
                    <td style="padding: 16px;">
                        <span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; color: var(--text-secondary);">
                            ${contact.label || 'General'}
                        </span>
                    </td>
                `;
                contactsList.appendChild(tr);
            });
        });
    }

    // Importar Excel / CSV
    fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !currentUser) return;

        const loader = document.getElementById('loader');
        loader.style.display = 'flex';
        loader.style.opacity = '1';

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convertir a JSON
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                // Procesar filas (saltando la fila 1 si son cabeceras)
                procesarEInsertarContactos(json);

            } catch (error) {
                console.error("Error leyendo Excel:", error);
                alert("Hubo un error al leer el archivo. Asegúrate de que sea un Excel válido.");
                loader.style.display = 'none';
            }
        };
        reader.readAsArrayBuffer(file);
        // Resetear input
        fileImport.value = '';
    });

    async function procesarEInsertarContactos(rows) {
        if (rows.length < 2) {
            alert("El archivo parece estar vacío o solo tiene cabeceras.");
            document.getElementById('loader').style.display = 'none';
            return;
        }

        let contactCount = 0;
        const batch = db.batch();
        const contactsRef = db.collection('users').doc(currentUser.uid).collection('contacts');

        // Asumimos que la Columna 1 es Nombre, Columna 2 es Teléfono, Columna 3 es Etiqueta
        // Empezamos en la fila 1 (índice 1) para saltar cabeceras
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue; // Fila vacía

            const rawName = row[0] ? String(row[0]).trim() : '';
            const rawPhone = row[1] ? String(row[1]).trim() : '';
            const rawLabel = row[2] ? String(row[2]).trim() : '';

            // Solo importar si hay teléfono
            if (rawPhone && rawPhone.length >= 10) {
                // Limpiar teléfono (quitar espacios, guiones, etc)
                const cleanPhone = rawPhone.replace(/\D/g, '');
                
                const newDocRef = contactsRef.doc(); // Auto-ID
                batch.set(newDocRef, {
                    name: rawName || 'Sin Nombre',
                    phone: cleanPhone,
                    label: rawLabel || 'General',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                contactCount++;

                // Firestore batch limit is 500 operations. If we hit 400, we should commit and create a new batch.
                // For simplicity in this demo, we assume files under 400 rows. 
                // For larger files, logic needs to chunk batches.
                if (contactCount >= 450) {
                    break; // Demo limit
                }
            }
        }

        if (contactCount > 0) {
            try {
                await batch.commit();
                alert(`¡Se importaron ${contactCount} contactos con éxito!`);
            } catch (err) {
                console.error("Error guardando contactos en DB:", err);
                alert("Error al guardar en la base de datos.");
            }
        } else {
            alert("No se encontraron números de teléfono válidos en la columna 2.");
        }

        document.getElementById('loader').style.display = 'none';
    }

    // Vaciar Base de Datos
    btnDeleteAll.addEventListener('click', async () => {
        if (!currentUser) return;
        const confirmar = confirm("¿Estás seguro de que deseas ELIMINAR TODOS tus contactos? Esta acción no se puede deshacer.");
        if (!confirmar) return;

        const loader = document.getElementById('loader');
        loader.style.display = 'flex';
        loader.style.opacity = '1';

        try {
            const contactsRef = db.collection('users').doc(currentUser.uid).collection('contacts');
            const snapshot = await contactsRef.get();
            
            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            alert("Base de datos vaciada.");
        } catch (error) {
            console.error("Error vaciando DB:", error);
            alert("Error al vaciar la base de datos.");
        } finally {
            loader.style.display = 'none';
        }
    });

    // Descargar Plantilla CSV
    function downloadTemplate(e) {
        if(e) e.preventDefault();
        
        // Crear contenido CSV (con BOM para que Excel lea acentos correctamente)
        const csvContent = "Nombre,Telefono,Etiqueta\nJuan Perez,5512345678,VIP\nMaría García,5587654321,Colonia Centro";
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Crear enlace de descarga nativo
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', 'Plantilla_SoyNexo.csv');
        document.body.appendChild(a);
        a.click();
        
        // Limpiar
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    const btnDownloadTemplate = document.getElementById('btn-download-template');
    const linkDownloadTemplate = document.getElementById('link-download-template');
    
    if(btnDownloadTemplate) btnDownloadTemplate.addEventListener('click', downloadTemplate);
    if(linkDownloadTemplate) linkDownloadTemplate.addEventListener('click', downloadTemplate);

});
