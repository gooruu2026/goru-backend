const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Token de Mapbox integrado directamente para pruebas
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || 'Pk.eyJ1IjoiZ29ydTIwMjYiLCJhIjoiY211Ym94emIzMGlnODQ4c2JrNnFyZG40OCJ9.au_s_1ynUiNDfNP7axIlyg';

app.get('/', (req, res) => {
  res.json({ estado: 'OK', sistema: 'Servidor de Goru activo' });
});

app.post('/api/cotizar', async (req, res) => {
  try {
    const { origen, destino, tipoServicio } = req.body; 

    if (!origen || !destino) {
      return res.status(400).json({ error: 'Se requieren coordenadas de origen y destino' });
    }

    const urlMapbox = `https://api.mapbox.com/directions/v5/mapbox/driving/${origen[0]},${origen[1]};${destino[0]},${destino[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

    const respuesta = await axios.get(urlMapbox);
    
    if (!respuesta.data.routes || respuesta.data.routes.length === 0) {
      return res.status(400).json({ error: 'No se encontró ruta entre esos puntos' });
    }

    const ruta = respuesta.data.routes[0];

    const distanciaKm = parseFloat((ruta.distance / 1000).toFixed(2));
    const duracionMin = Math.round(ruta.duration / 60);

    let tarifaBase = 500;
    let precioPorKm = 300;

    if (tipoServicio === 'MOTO') {
      tarifaBase = 300;
      precioPorKm = 200;
    } else if (tipoServicio === 'FLETE') {
      tarifaBase = 1500;
      precioPorKm = 600;
    }

    const precioEstimado = Math.round(tarifaBase + (distanciaKm * precioPorKm));

    res.json({
      exito: true,
      distanciaKm,
      duracionMin,
      precioEstimado,
      geometriaRuta: ruta.geometry
    });

  } catch (error) {
    console.error('Detalle del error:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
      error: 'Error al consultar rutas con Mapbox',
      detalle: error.response ? error.response.data.message : error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Goru escuchando en el puerto ${PORT}`);
});
