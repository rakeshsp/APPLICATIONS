import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = 3000;

app.use(cors());

app.get('/api/fetch', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send('Missing url parameter');
    }

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer', // Handle binary data (images) or text
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const contentType = response.headers['content-type'];
        res.set('Content-Type', contentType);
        res.send(response.data);

    } catch (error) {
        console.error('Error fetching URL:', error.message);
        res.status(500).send('Error fetching URL');
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
