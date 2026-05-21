export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phoneNumberId, accessToken, contacts, templateName } = req.body;

    if (!phoneNumberId || !accessToken || !contacts || !templateName) {
      return res.status(400).json({ error: 'Faltan parámetros: phoneNumberId, accessToken, contacts, templateName' });
    }

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'La lista de contactos está vacía' });
    }

    const results = { sent: 0, failed: 0, errors: [] };
    const META_API_URL = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

    for (const contact of contacts) {
      // Formatear el número: quitar espacios, guiones y asegurarse que empiece con código de país
      let phone = String(contact.phone || contact.telefono || '').replace(/[\s\-\(\)\+]/g, '');
      
      // Si empieza con 52 (México) y tiene 12 dígitos, está bien
      // Si empieza con 1 (LADA), agregar 52 adelante  
      if (phone.startsWith('1') && phone.length === 10) {
        phone = '521' + phone.substring(1);
      } else if (!phone.startsWith('52') && phone.length === 10) {
        phone = '52' + phone;
      }

      if (!phone || phone.length < 10) {
        results.failed++;
        results.errors.push({ contact: contact.name || contact.nombre, reason: 'Número inválido: ' + phone });
        continue;
      }

      const contactName = contact.name || contact.nombre || 'amigo';

      let parameters = [];
      if (templateName === 'campana_flexible') {
        parameters = [
          { type: 'text', text: contactName }, // {{1}} = nombre del contacto
          { type: 'text', text: req.body.templateVariables?.businessName || 'Mi Negocio' }, // {{2}} = nombre del negocio/plantilla
          { type: 'text', text: req.body.templateVariables?.bodyText || 'Mensaje importante' } // {{3}} = cuerpo del mensaje
        ];
      } else {
        parameters = [
          { type: 'text', text: contactName } // fallback para otras plantillas
        ];
      }

      const messageBody = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'es_MX' },
          components: [
            {
              type: 'body',
              parameters: parameters
            }
          ]
        }
      };

      try {
        const metaResponse = await fetch(META_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageBody)
        });

        const metaData = await metaResponse.json();

        if (metaData.messages && metaData.messages.length > 0) {
          results.sent++;
        } else {
          results.failed++;
          const errorMsg = metaData.error ? metaData.error.message : JSON.stringify(metaData);
          results.errors.push({ contact: contactName, phone, reason: errorMsg });
          console.error(`Error enviando a ${phone}:`, metaData);
        }

      } catch (sendError) {
        results.failed++;
        results.errors.push({ contact: contactName, phone, reason: sendError.message });
        console.error(`Error de red enviando a ${phone}:`, sendError.message);
      }

      // Pequeña pausa entre mensajes para respetar rate limits de Meta (80 msgs/seg)
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`Campaña completada: ${results.sent} enviados, ${results.failed} fallidos`);

    return res.status(200).json({
      success: true,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors.slice(0, 10) // Máximo 10 errores en la respuesta
    });

  } catch (error) {
    console.error('Error en sendWhatsAppMessage:', error);
    return res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
}
