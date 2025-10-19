const express = require('express');
const { DefaultApi, SearchItemsRequest, PartnerType } = require('paapi5-nodejs-sdk');
const cors = require('cors');
require('dotenv').config(); // Para cargar variables de entorno

const app = express();
app.use(express.json());
app.use(cors()); // Habilita CORS para permitir solicitudes desde el frontend

// Configuración de credenciales (carga desde .env)
const ACCESS_KEY = process.env.AMAZON_ACCESS_KEY || 'AKPAAM52YG1760838236';
const SECRET_KEY = process.env.AMAZON_SECRET_KEY || 'A7JOjzyNJvjKK8R867Enzy9FvLDL5bf/GS8iL10v';
const PARTNER_TAG = process.env.AMAZON_PARTNER_TAG || 'kelonio-21';
const HOST = 'webservices.amazon.es';
const REGION = 'eu-west-1';

// Endpoint para buscar libros
app.post('/api/amazon-pa', async (req, res) => {
    const { titulo, autor, isbn } = req.body;

    try {
        // Inicializa el cliente de la API
        const defaultApi = new DefaultApi({
            accessKey: ACCESS_KEY,
            secretKey: SECRET_KEY,
            host: HOST,
            region: REGION
        });

        // Configura la solicitud
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
        request.Marketplace = 'www.amazon.es'; // Fuerza el marketplace de España

        // Realiza la solicitud
        const response = await defaultApi.searchItems(request);

        let portada = './assets/sin-portada.png';
        let sinopsis = 'Sin sinopsis disponible.';
        let enlaceAfiliado = '#';

        if (response.SearchResult && response.SearchResult.Items && response.SearchResult.Items.length > 0) {
            const item = response.SearchResult.Items[0];
            portada = item.Images?.Primary?.Medium?.URL || './assets/sin-portada.png';
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

// Inicia el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});