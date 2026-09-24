const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  chofer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  saldo: {
    type: Number,
    default: 0
  },
  historialMovimientos: [
    {
      tipo: {
        type: String,
        enum: ['recarga', 'comision_descuento', 'ajuste'],
        required: true
      },
      monto: {
        type: Number,
        required: true
      },
      descripcion: String,
      fecha: {
        type: Date,
        default: Date.now
      }
    }
  ],
  fechaActualizacion: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Wallet', walletSchema);
