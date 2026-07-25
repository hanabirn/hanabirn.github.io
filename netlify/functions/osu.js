exports.handler = async (event) => {
    const API_KEY = 'db6c7c60d8b9754364b2a8e225441f0f6f379452';
    const BASE = 'https://osu.ppy.sh/api/get_beatmaps';

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const qs = event.queryStringParameters || {};
        const params = new URLSearchParams({ k: API_KEY });
        if (qs.b) params.set('b', qs.b);
        if (qs.s) params.set('s', qs.s);

        const res = await fetch(`${BASE}?${params.toString()}`);
        const data = await res.json();

        return { statusCode: 200, headers, body: JSON.stringify(data) };
    } catch (err) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
};
