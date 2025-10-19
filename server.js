const express = require('express');
const { DefaultApi, SearchItemsRequest, PartnerType } = require('paapi5-nodejs-sdk');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Credenciales de Amazon (reemplaza con las tuyas)
const ACCESS_KEY = 'AKPAAM52YG1760838236';
const SECRET_KEY = 'A7JOjzyNJvjKK8R867Enzy9FvLDL5bf/GS8iL10v'; 
const PARTNER_TAG = 'kelonio-21';
const HOST = 'webservices.amazon.es';
const REGION = 'eu-west-1';

app.post('/api/amazon-pa', async (req, res) => {
    const { titulo, autor, isbn } = req.body;

    try {
        const defaultApi = new DefaultApi({
            accessKey: ACCESS_KEY,
            secretKey: SECRET_KEY,
            host: HOST,
            region: REGION
        });

        const request = new SearchItemsRequest();
        request.Keywords = isbn && isbn !== 'No disponible' ? isbn : `${titulo} ${autor}`;
        request.SearchIndex = 'Books';
        request.Resources = [
            'Images.Primary.Medium',
            'ItemInfo.Title',
            'ItemInfo.EditorialReviews',
            'ItemInfo.ContentInfo'
        ];
        request.PartnerTag = PARTNER_TAG;
        request.PartnerType = PartnerType.ASSOCIATES;
        request.Marketplace = 'www.amazon.es';

        const response = await defaultApi.searchItems(request);

        let portada = 'https://via.placeholder.com/100x150?text=Sin+Portada';
        let sinopsis = 'Sin sinopsis disponible.';
        let enlaceAfiliado = '#';

        if (response.SearchResult && response.SearchResult.Items && response.SearchResult.Items.length > 0) {
            const item = response.SearchResult.Items[0];
            portada = item.Images?.Primary?.Medium?.URL || 'https://via.placeholder.com/100x150?text=Sin+Portada';
            sinopsis = item.ItemInfo?.EditorialReviews?.EditorialReviews?.[0]?.Content ||
                       item.ItemInfo?.ContentInfo?.Features?.DisplayValue ||
                       'Sin sinopsis disponible.';
            enlaceAfiliado = item.DetailPageURL || '#';
        }

        res.json({ portada, sinopsis, enlaceAfiliado });
    } catch (error) {
        console.error(`Error al consultar Amazon PA API:`, error);
        res.status(500).json({ error: `Error al consultar Amazon: ${error.message}` });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});