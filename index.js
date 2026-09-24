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

// ==========================================
// RUTAS DE USUARIOS Y CHOFERES
// ==========================================

// 1. Registro de Usuario (Pasajero o Chofer)
app.post('/api/usuarios/registro', async (req, res) => {
  try {
    const { nombre, email, telefono, rol, datosChofer } = req.body;

    if (!nombre || !email || !telefono) {
      return res.status(400).json({ error: "Nombre, email y teléfono son obligatorios." });
    }

    const usuarioExistente = await User.findOne({ $or: [{ email }, { telefono }] });
    if (usuarioExistente) {
      return res.status(400).json({ error: "El email o teléfono ya se encuentra registrado." });
    }

    const nuevoUsuario = new User({
      nombre,
      email,
      telefono,
      rol: rol || 'pasajero',
      datosChofer: rol === 'chofer' ? datosChofer : undefined
    });

    await nuevoUsuario.save();

    if (nuevoUsuario.rol === 'chofer') {
      const nuevaBilletera = new Wallet({ chofer: nuevoUsuario._id, saldo: 0 });
      await nuevaBilletera.save();
    }

    res.status(201).json({
      exito: true,
      mensaje: "Usuario registrado correctamente",
      usuario: nuevoUsuario
    });

  } catch (error) {
    res.status(500).json({ error: "Error al registrar usuario", detalle: error.message });
  }
});

// 2. Login / Consulta por Teléfono
app.post('/api/usuarios/login', async (req, res) => {
  try {
    const { telefono } = req.body;

    if (!telefono) {
      return res.status(400).json({ error: "El número de teléfono es obligatorio." });
    }

    const usuario = await User.findOne({ telefono });
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    res.json({
      exito: true,
      usuario
    });

  } catch (error) {
    res.status(500).json({ error: "Error al iniciar sesión", detalle: error.message });
  }
});

// 3. Cambiar disponibilidad del Chofer
app.put('/api/usuarios/chofer/disponibilidad', async (req, res) => {
  try {
    const { choferId, activo, ubicacionActual } = req.body;

    const chofer = await User.findById(choferId);
    if (!chofer || chofer.rol !== 'chofer') {
      return res.status(404).json({ error: "Chofer no encontrado." });
    }

    chofer.datosChofer.activo = activo;
    if (ubicacionActual) {
      chofer.datosChofer.ubicacionActual = ubicacionActual;
    }

    await chofer.save();

    res.json({
      exito: true,
      mensaje: `Chofer ahora está ${activo ? 'Disponible' : 'Fuera de servicio'}`,
      chofer
    });

  } catch (error) {
    res.status(500).json({ error: "Error al actualizar disponibilidad", detalle: error.message });
  }
});

// ==========================================
// RUTAS DE VIAJES Y ENVÍOS
// ==========================================

// 1. Solicitar un viaje
app.post('/api/viajes/solicitar', async (req, res) => {
  try {
    const { pasajeroId, origen, destino, tipoVehiculo, precioEstimado, distanciaKm, duracionMin } = req.body;

    if (!pasajeroId || !origen || !destino || !tipoVehiculo || !precioEstimado) {
      return res.status(400).json({ error: "Faltan parámetros requeridos para solicitar el viaje." });
    }

    // Calcular la comisión de la plataforma (ejemplo: 10%)
    const porcentajeComision = 0.10;
    const comisionPlataforma = Math.round(precioEstimado * porcentajeComision);

    const nuevoViaje = new Ride({
      pasajero: pasajeroId,
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

    res.status(201).json({
      exito: true,
      mensaje: "Viaje solicitado con éxito. Buscando choferes...",
      viaje: nuevoViaje
    });

  } catch (error) {
    res.status(500).json({ error: "Error al crear la solicitud de viaje", detalle: error.message });
  }
});

// 2. Obtener viajes pendientes de aceptación (para choferes)
app.get('/api/viajes/pendientes', async (req, res) => {
  try {
    const viajesPendientes = await Ride.find({ estado: 'solicitado' }).populate('pasajero', 'nombre telefono');
    res.json({
      exito: true,
      cantidad: viajesPendientes.length,
      viajes: viajesPendientes
    });
  } catch (error) {
    res.status(500).json({ error: "Error al consultar viajes pendientes", detalle: error.message });
  }
});

// 3. Aceptar un viaje (por parte del Chofer)
app.put('/api/viajes/aceptar', async (req, res) => {
  try {
    const { viajeId, choferId } = req.body;

    const viaje = await Ride.findById(viajeId);
    if (!viaje) {
      return res.status(404).json({ error: "Viaje no encontrado." });
    }

    if (viaje.estado !== 'solicitado') {
      return res.status(400).json({ error: "El viaje ya fue aceptado o cancelado por otro chofer." });
    }

    viaje.chofer = choferId;
    viaje.estado = 'aceptado';
    await viaje.save();

    res.json({
      exito: true,
      mensaje: "Viaje aceptado correctamente",
      viaje
    });

  } catch (error) {
    res.status(500).json({ error: "Error al aceptar el viaje", detalle: error.message });
  }
});

// 4. Finalizar viaje y descontar comisión de la billetera
app.put('/api/viajes/finalizar', async (req, res) => {
  try {
    const { viajeId } = req.body;

    const viaje = await Ride.findById(viajeId);
    if (!viaje) {
      return res.status(404).json({ error: "Viaje no encontrado." });
    }

    if (viaje.estado === 'finalizado') {
      return res.status(400).json({ error: "El viaje ya se encuentra finalizado." });
    }

    viaje.estado = 'finalizado';
    await viaje.save();

    // Descontar la comisión de la billetera virtual del chofer si el pago fue en efectivo
    if (viaje.chofer && viaje.metodoPago === 'efectivo') {
      const billetera = await Wallet.findOne({ chofer: viaje.chofer });
      if (billetera) {
        billetera.saldo -= viaje.comisionPlataforma;
        billetera.historialMovimientos.push({
          tipo: 'comision_descuento',
          monto: viaje.comisionPlataforma,
          descripcion: `Descuento por comisión del viaje ID: ${viaje._id}`
        });
        await billetera.save();
      }
    }

    res.json({
      exito: true,
      mensaje: "Viaje finalizado con éxito.",
      viaje
    });

  } catch (error) {
    res.status(500).json({ error: "Error al finalizar el viaje", detalle: error.message });
  }
});

// ==========================================
// RUTA DE COTIZACIÓN (MAPBOX)
// ==========================================
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
