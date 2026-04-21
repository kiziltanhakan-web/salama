// Vercel Serverless Function — Shopier Ürünleri
// Token güvenliği: SHOPIER_TOKEN değeri Vercel Dashboard'dan
// Settings → Environment Variables → SHOPIER_TOKEN olarak ekleyin.
// Koda veya git'e asla yazmayın.

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const TOKEN = process.env.SHOPIER_TOKEN;

    if (!TOKEN) {
        return res.status(500).json({ error: 'SHOPIER_TOKEN env var is not set' });
    }

    const SHOPIER_API = 'https://api.shopier.com/v2/products';

    try {
        const response = await fetch(SHOPIER_API, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Accept':        'application/json',
                'Content-Type':  'application/json',
            },
        });

        if (!response.ok) {
            const text = await response.text();
            return res.status(502).json({
                error:  'Shopier API error',
                status: response.status,
                detail: text.slice(0, 200),
            });
        }

        const data = await response.json();

        // Shopier yanıtı data.data, data.products veya doğrudan dizi olabilir
        const raw = Array.isArray(data) ? data
                  : Array.isArray(data.data) ? data.data
                  : Array.isArray(data.products) ? data.products
                  : [];

        // Fiyat bilgisi KALDIRILDI — sadece gösterim alanları döndürülür
        const products = raw
            .filter(p => p.status !== 'inactive' && p.status !== 'draft')
            .map(p => ({
                id:          p.id,
                name:        p.name || p.title || '',
                description: p.description
                    ? p.description.replace(/<[^>]*>/g, '').slice(0, 160).trim()
                    : '',
                image:       p.image_url || p.cover_image || p.thumbnail || null,
                url:         p.url || p.product_url
                    || `https://www.shopier.com/sedademren?product=${p.id}`,
            }));

        // 1 saatlik CDN cache — ürünler sık değişmez
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).json({ products });

    } catch (err) {
        return res.status(500).json({ error: 'Fetch failed', message: err.message });
    }
}
