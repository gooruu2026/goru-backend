const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');

// Importar los modelos de la base de datos
const User = require('./models/User');
const Ride = require('./models/Ride');
const Wallet = require('./models/Wallet');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiZ29ydTIwMjYiLCJhIjoiY211Ym94emIzMGlnODQ4c2JrNnFyZG40OCJ9.au_s_1ynUiNDfNP7axIlyg';
const MONGO_URI = process.env.MONGO_URI;

// Conexión a MongoDB Atlas
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Conectado exitosamente a MongoDB Atlas'))
    .catch((err) => console.error('❌ Error al conectar a MongoDB:', err));
} else {
  console.log('⚠️ No se proporcionó MONGO_URI en las variables de entorno.');
}

// Ruta principal de prueba
app.get('/', (req, res) => {
  res.json({
    mensaje: "¡Bienvenido a la API de Goru!",
    estado: "Servidor activo",
    baseDeDatos: mongoose.connection.readyState === 1 ? "Conectada" : "Desconectada"
  });
});

// Endpoint de Cotización (Mapbox)
app.post('/api/cotizar', async (req, res) => {
  try {
    const { origen, destino, tipoVehiculo } = req.body;

    if (!origen || !destino || !tipoVehiculo) {
      return res.status(400).json({ error: "Faltan datos obligatorios (origen, destino, tipoVehiculo)" });
    }

    const urlMapbox = `https://api.mapbox.com/directions/v5/mapbox/driving/${origen.lng},${origen.lat};${destino.lng},${destino.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
    const respuesta = await axios.get(urlMapbox);

    if (!respuesta.data.routes || respuesta.data.routes.length === 0) {
      return res.status(404).json({ error: "No se encontró una ruta válida." });
    }

    const ruta = respuesta.data.routes[0];
    const distanciaKm = (ruta.distance / 1000).toFixed(2);
    const duracionMin = Math.round(ruta.duration / 60);

    let bajadaBandera = 500;
    let precioPorKm = 300;

    if (tipoVehiculo === 'Moto') {
      bajadaBandera = 300;
      precioPorKm = 200;
    } else if (tipoVehiculo === 'Flete') {
      bajadaBandera = 1500;
      precioPorKm = 600;
    }

    const precioEstimado = Math.round(bajadaBandera + (distanciaKm * precioPorKm));

    res.json({
      exito: true,
      tipoVehiculo,
      distanciaKm: parseFloat(distanciaKm),
      duracionMin,
      precioEstimado,
      geometriaRuta: ruta.geometry
    });

  } catch (error) {
    res.status(500).json({
      error: "Error al consultar Mapbox",
      detalle: error.response ? error.response.data.message || error.response.data : error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Goru corriendo en puerto ${PORT}`);
});
