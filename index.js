const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const axios = require('axios');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Token de Mapbox predeterminado
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN || 'pk.eyJ1IjoiZ29ydTIwMjYiLCJhIjoiY211Ym94emIzMGlnODQ4c2JrNnFyZG40OCJ9.au_s_1ynUiNDfNP7axIlyg';

// Conexión a MongoDB Atlas
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:goru2026@goru-cluster.mongodb.net/goru_db?retryWrites=true&w0=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado exitosamente a MongoDB Atlas'))
  .catch((err) => console.error('❌ Error al conectar con MongoDB:', err.message));

// Esquema de Viajes
const rideSchema = new mongoose.Schema({
  pasajeroId: String,
  choferId: String,
  origen: { direccion: String, lat: Number, lng: Number },
  destino: { direccion: String, lat: Number, lng: Number },
  tipoVehiculo: { type: String, enum: ['Auto', 'Moto', 'Flete'], default: 'Auto' },
  distanciaKm: Number,
  duracionMin: Number,
  precioEstimado: Number,
  comisionPlataforma: Number,
  estado: { type: String, enum: ['solicitado', 'aceptado', 'en_camino', 'finalizado', 'cancelado'], default: 'solicitado' },
  fechaCreacion: { type: Date, default: Date.now }
});

const Ride = mongoose.model('Ride', rideSchema);

// RUTAS DE LA API

// 1. Cotizar Ruta con Mapbox
app.post('/api/cotizar', async (req, res) => {
  try {
    const { origen, destino, tipoVehiculo } = req.body;

    if (!origen || !destino) {
      return res.status(400).json({ exito: false, error: 'Faltan coordenadas de origen o destino' });
    }

    // Consulta de ruta a Mapbox Directions API
    const urlMapbox = `https://api.mapbox.com/directions/v5/mapbox/driving/${origen.lng},${origen.lat};${destino.lng},${destino.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
    
    const respuestaMapbox = await axios.get(urlMapbox);
    const dataRuta = respuestaMapbox.data.routes[0];

    if (!dataRuta) {
      return res.status(404).json({ exito: false, error: 'No se encontró una ruta válida' });
    }

    const distanciaKm = parseFloat((dataRuta.distance / 1000).toFixed(2));
    const duracionMin = Math.round(dataRuta.duration / 60);

    // Tarifas base según el tipo de vehículo
    let tarifaBase = 500;
    let precioKm = 350;

    if (tipoVehiculo === 'Moto') {
      tarifaBase = 350;
      precioKm = 250;
    } else if (tipoVehiculo === 'Flete') {
      tarifaBase = 1200;
      precioKm = 600;
    }

    const precioEstimado = Math.round(tarifaBase + (distanciaKm * precioKm));

    res.json({
      exito: true,
      distanciaKm,
      duracionMin,
      precioEstimado,
      geometriaRuta: dataRuta.geometry
    });

  } catch (error) {
    console.error("Error en cotización Mapbox:", error.message);
    res.status(500).json({ exito: false, error: 'Error al consultar Mapbox' });
  }
});

// 2. Solicitar Viaje
app.post('/api/viajes/solicitar', async (req, res) => {
  try {
    const { pasajeroId, origen, destino, tipoVehiculo, distanciaKm, duracionMin, precioEstimado } = req.body;

    const comisionPlataforma = Math.round(precioEstimado * 0.10); // 10% comisión

    const nuevoViaje = new Ride({
      pasajeroId,
      origen,
      destino,
      tipoVehiculo,
      distanciaKm,
      duracionMin,
      precioEstimado,
      comisionPlataforma,
      estado: 'solicitado'
    });

    await nuevoViaje.save();

    res.json({ exito: true, mensaje: 'Viaje solicitado correctamente', viaje: nuevoViaje });
  } catch (error) {
    res.status(500).json({ exito: false, error: 'Error al solicitar el viaje' });
  }
});

// 3. Obtener viajes pendientes (Para choferes)
app.get('/api/viajes/pendientes', async (req, res) => {
  try {
    const viajesPendientes = await Ride.find({ estado: 'solicitado' }).sort({ fechaCreacion: -1 });
    res.json({ exito: true, viajes: viajesPendientes });
  } catch (error) {
    res.status(500).json({ exito: false, error: 'Error al obtener viajes' });
  }
});

// 4. Aceptar Viaje
app.put('/api/viajes/aceptar', async (req, res) => {
  try {
    const { viajeId, choferId } = req.body;

    const viaje = await Ride.findById(viajeId);
    if (!viaje) return res.status(404).json({ exito: false, error: 'Viaje no encontrado' });

    viaje.choferId = choferId;
    viaje.estado = 'aceptado';
    await viaje.save();

    res.json({ exito: true, mensaje: 'Viaje aceptado con éxito', viaje });
  } catch (error) {
    res.status(500).json({ exito: false, error: 'Error al aceptar el viaje' });
  }
});

// Servidor escuchando
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
});
