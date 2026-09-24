const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  telefono: {
    type: String,
    required: true
  },
  rol: {
    type: String,
    enum: ['pasajero', 'chofer', 'admin'],
    default: 'pasajero'
  },
  // Datos específicos si el usuario es Chofer
  datosChofer: {
    tipoVehiculo: {
      type: String,
      enum: ['Auto', 'Moto', 'Flete'],
    },
    patente: String,
    modeloVehiculo: String,
    activo: {
      type: Boolean,
      default: false
    },
    ubicacionActual: {
      lat: Number,
      lng: Number
    }
  },
  fechaRegistro: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
