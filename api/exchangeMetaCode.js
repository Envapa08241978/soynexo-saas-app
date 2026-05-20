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

    // Estas variables de entorno se configurarán en Vercel
    const APP_ID = process.env.META_APP_ID || '32643043931978281';
    const APP_SECRET = process.env.META_APP_SECRET;

    if (!APP_SECRET) {
      console.error('Server configuration error: Missing META_APP_SECRET');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // 1. Intercambiar el código por un Access Token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${APP_ID}&client_secret=${APP_SECRET}&code=${code}`;
    
    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Error from Meta token API:', tokenData.error);
      return res.status(400).json({ error: tokenData.error.message });
    }

    const accessToken = tokenData.access_token;

    // 2. Obtener el WABA_ID compartido
    const wabasUrl = `https://graph.facebook.com/v19.0/${APP_ID}/client_wabas`;
    const wabasResponse = await fetch(wabasUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const wabasData = await wabasResponse.json();
    let wabaId = null;
    
    if (wabasData.data && wabasData.data.length > 0) {
      wabaId = wabasData.data[0].id;
    }

    // Enviar la respuesta exitosa al frontend
    return res.status(200).json({
      success: true,
      accessToken: accessToken,
      wabaId: wabaId
    });

  } catch (error) {
    console.error('Unhandled error in exchangeMetaCode:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
