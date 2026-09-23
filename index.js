const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// El puerto se adapta automáticamente al servidor en la nube (Render)
const PORT = process.env.PORT || 10000;

// Aquí lee tu API Key de Mapbox desde las variables de entorno seguras
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || 'Pk.eyJ1IjoiZ29ydTIwMjYiLCJhIjoiY211Ym94emIzMGlnODQ4c2JrNnFyZG40OCJ9.au_s_1ynUiNDfNP7axIlyg';

// Ruta principal para comprobar que el servidor de Goru está vivo
app.get('/', (req, res) => {
  res.json({ estado: 'OK', sistema: 'Servidor de Goru funcionando correctamente' });
});

// Ruta de cotización de viajes con Mapbox
app.post('/api/cotizar', async (req, res) => {
  try {
    const { origen, destino, tipoServicio } = req.body; 
    // Formato de coordenadas requeridas: [longitud, latitud]

    if (!origen || !destino) {
      return res.status(400).json({ error: 'Se requieren coordenadas de origen y destino' });
    }

    const urlMapbox = `https://api.mapbox.com/directions/v5/mapbox/driving/${origen[0]},${origen[1]};${destino[0]},${destino[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

    const respuesta = await axios.get(urlMapbox);
    const ruta = respuesta.data.routes[0];

    const distanciaKm = (ruta.distance / 1000).toFixed(2);
    const duracionMin = Math.round(ruta.duration / 60);

    // Tarifas para los servicios de Goru
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
      distanciaKm: parseFloat(distanciaKm),
      duracionMin,
      precioEstimado,
      geometriaRuta: ruta.geometry
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Error al consultar rutas con Mapbox' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Goru corriendo en el puerto ${PORT}`);
});
