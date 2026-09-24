const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  pasajero: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chofer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  origen: {
    direccion: String,
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  destino: {
    direccion: String,
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  tipoVehiculo: {
    type: String,
    enum: ['Auto', 'Moto', 'Flete'],
    required: true
  },
  distanciaKm: Number,
  duracionMin: Number,
  precioEstimado: {
    type: Number,
    required: true
  },
  estado: {
    type: String,
    enum: ['solicitado', 'aceptado', 'en_camino', 'finalizado', 'cancelado'],
    default: 'solicitado'
  },
  metodoPago: {
    type: String,
    enum: ['efectivo', 'digital'],
    default: 'efectivo'
  },
  comisionPlataforma: Number,
  fechaCreacion: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Ride', rideSchema);
