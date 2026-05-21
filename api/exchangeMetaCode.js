export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Missing code parameter' });
    }

    const APP_ID = process.env.META_APP_ID || '32643043931978281';
    const APP_SECRET = process.env.META_APP_SECRET;

    if (!APP_SECRET) {
      console.error('Server configuration error: Missing META_APP_SECRET');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // 1. Intercambiar el código por un Access Token de usuario
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${code}`;
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Error from Meta token API:', tokenData.error);
      return res.status(400).json({ error: tokenData.error.message });
    }

    const userToken = tokenData.access_token;

    // 2. Obtener WABAs compartidas con nuestra app (Tech Provider)
    // Intentamos primero con client_wabas, luego con el token directamente
    let wabaId = null;
    let phoneNumberId = null;
    let phoneNumber = null;

    // Intento A: Obtener WABAs via client_wabas
    try {
      const wabasUrl = `https://graph.facebook.com/v19.0/${APP_ID}/client_wabas?access_token=${APP_SECRET ? `${APP_ID}|${APP_SECRET}` : userToken}`;
      const wabasResp = await fetch(wabasUrl);
      const wabasData = await wabasResp.json();
      console.log('client_wabas response:', JSON.stringify(wabasData));

      if (wabasData.data && wabasData.data.length > 0) {
        // Tomar el WABA más reciente (último en la lista)
        wabaId = wabasData.data[wabasData.data.length - 1].id;
      }
    } catch (e) {
      console.log('client_wabas fallido, intentando método alternativo:', e.message);
    }

    // Intento B: Obtener WABAs directamente con el token del usuario
    if (!wabaId) {
      try {
        const wabasUrl2 = `https://graph.facebook.com/v19.0/me/businesses?access_token=${userToken}&fields=owned_whatsapp_business_accounts`;
        const wabasResp2 = await fetch(wabasUrl2);
        const wabasData2 = await wabasResp2.json();
        console.log('me/businesses response:', JSON.stringify(wabasData2));

        if (wabasData2.data && wabasData2.data.length > 0) {
          const biz = wabasData2.data[0];
          if (biz.owned_whatsapp_business_accounts && biz.owned_whatsapp_business_accounts.data.length > 0) {
            wabaId = biz.owned_whatsapp_business_accounts.data[0].id;
          }
        }
      } catch (e) {
        console.log('me/businesses también falló:', e.message);
      }
    }

    // 3. Si tenemos WABA_ID, obtener el Phone_Number_ID
    if (wabaId) {
      try {
        const appToken = `${APP_ID}|${APP_SECRET}`;
        const phoneUrl = `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?access_token=${appToken}`;
        const phoneResp = await fetch(phoneUrl);
        const phoneData = await phoneResp.json();
        console.log('phone_numbers response:', JSON.stringify(phoneData));

        if (phoneData.data && phoneData.data.length > 0) {
          phoneNumberId = phoneData.data[0].id;
          phoneNumber = phoneData.data[0].display_phone_number;
        }
      } catch (e) {
        console.log('Error obteniendo phone_numbers:', e.message);
      }
    }

    // Respuesta al frontend con todos los datos
    return res.status(200).json({
      success: true,
      accessToken: userToken,
      wabaId: wabaId,
      phoneNumberId: phoneNumberId,
      phoneNumber: phoneNumber
    });

  } catch (error) {
    console.error('Unhandled error in exchangeMetaCode:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
