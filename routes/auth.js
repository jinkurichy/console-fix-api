const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// CAMBIO: Subimos el costo de bcrypt de 10 a 12 rondas.
// Esto hace más costoso intentar adivinar contraseñas si alguien obtiene hashes.
const BCRYPT_ROUNDS = 12;

// CAMBIO: Patrón básico para validar que el correo tenga formato válido.
// No sustituye la confirmación por correo, pero evita datos claramente inválidos.
const EMAIL_PATTERN = /^[^s@]+@[^s@]+.[^s@]+$/;

// CAMBIO: Normaliza los correos antes de guardarlos o buscarlos.
// " Usuario@Correo.com " y "usuario@correo.com" se tratan como el mismo correo.
function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

// CAMBIO: Centralizamos la creación del JWT.
// Así todos los tokens tienen la misma información y configuración.
function createToken(user) {
  // CAMBIO CRÍTICO: Ya no usamos "consolefixSecret" como contraseña de respaldo.
  // Si JWT_SECRET no existe en Railway, la aplicación debe marcar un error.
  // Crea una variable JWT_SECRET larga y aleatoria en Railway > Variables.
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurado');
  }

  return jwt.sign(
    {
      // CAMBIO: "sub" identifica al usuario dentro del token.
      // Es una convención común para el sujeto/propietario del token.
      sub: String(user.id),

      // Se mantiene el correo para identificar al usuario en rutas protegidas.
      email: user.email,

      // CAMBIO: Incluimos el rol para permitir autorización futura.
      // Ejemplo: decidir si un usuario puede administrar tickets o usuarios.
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      // CAMBIO: Indicamos explícitamente el algoritmo de firma.
      algorithm: 'HS256',

      // CAMBIO: Reducimos el tiempo de vida de 7 días a 8 horas.
      // Limita el tiempo de uso si un token se filtra o es robado.
      expiresIn: '8h',

      // CAMBIO: Identifica quién emitió el token.
      issuer: 'consolefix-api',

      // CAMBIO: Define para qué cliente fue creado el token.
      audience: 'consolefix-web'
    }
  );
}

// =====================================================
// REGISTRO DE USUARIO
// =====================================================
router.post('/register', async (req, res) => {
  try {
    // CAMBIO: Ya no usamos valores predeterminados como "Usuario Taller".
    // El usuario debe enviar un nombre real y válido.
    const fullName = String(req.body.fullName || req.body.name || '').trim();

    // CAMBIO: Normalizamos el correo antes de usarlo en MySQL.
    const email = normalizeEmail(req.body.email);

    // El teléfono sigue siendo opcional.
    const phone = String(req.body.phone || '').trim();

    // CAMBIO CRÍTICO: Eliminamos la contraseña por defecto "1234".
    // Si no llega contraseña, queda como cadena vacía y la validación la rechaza.
    const password = String(req.body.password || '');

    // CAMBIO: Validación de longitud del nombre.
    if (fullName.length < 2 || fullName.length > 120) {
      return res.status(400).json({
        success: false,
        message: 'El nombre debe tener entre 2 y 120 caracteres.'
      });
    }

    // CAMBIO: Validamos formato y longitud máxima del correo.
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return res.status(400).json({
        success: false,
        message: 'Ingresa un correo electrónico válido.'
      });
    }

    // CAMBIO CRÍTICO: Exigimos una contraseña en vez de usar "1234".
    // Bcrypt usa como máximo 72 bytes de entrada, por eso limitamos a 72 caracteres.
    if (password.length < 12 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña debe tener entre 12 y 72 caracteres.'
      });
    }

    // CAMBIO: Consultamos solo id, no todas las columnas.
    // Es suficiente para saber si el correo ya existe.
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existing.length > 0) {
      // CAMBIO: Usamos 409 Conflict porque el correo ya existe.
      // El mensaje puede hacerse genérico si deseas ocultar qué correos existen.
      return res.status(409).json({
        success: false,
        message: 'No fue posible completar el registro.'
      });
    }

    // CAMBIO: Generamos un hash bcrypt antes de guardar la contraseña.
    // Nunca se guarda ni se devuelve el texto real de la contraseña.
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // CAMBIO CRÍTICO: No tomamos role, status ni jobTitle del body.
    // Si aceptaras req.body.role, un usuario podría registrarse como administrador.
    const role = 'CLIENTE';
    const jobTitle = 'Solicitante';
    const status = 'PENDING_APPROVAL';

    // CAMBIO: Usamos NOW() para que MySQL ponga la fecha del registro.
    // También recibimos result.insertId, que es el ID real creado por la base.
    const [result] = await db.query(
      `INSERT INTO users
        (full_name, email, phone, role, job_title, status, password, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [fullName, email, phone, role, jobTitle, status, passwordHash]
    );

    return res.status(201).json({
      success: true,
      message: 'Registro recibido. Tu cuenta está pendiente de aprobación.',
      user: {
        // CAMBIO: Devolvemos el ID real generado por MySQL.
        // Eliminamos Date.now(), porque no correspondía al registro de la tabla.
        id: String(result.insertId),
        fullName,
        email,
        phone,
        role,
        jobTitle,
        status
      }
    });
  } catch (error) {
    // No expongas error.message al cliente: puede revelar SQL o datos internos.
    console.error('Error en registro:', error);

    return res.status(500).json({
      success: false,
      message: 'No fue posible completar el registro.'
    });
  }
});

// =====================================================
// INICIO DE SESIÓN
// =====================================================
router.post('/login', async (req, res) => {
  try {
    // CAMBIO: Conservamos compatibilidad temporal con emailOrUser,
    // pero internamente se busca únicamente por email.
    const email = normalizeEmail(req.body.emailOrUser || req.body.email);

    // CAMBIO: Convertimos a string y evitamos valores undefined/null.
    const password = String(req.body.password || '');

    // CAMBIO: Validamos que ambos campos existan antes de consultar MySQL.
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Correo y contraseña son requeridos.'
      });
    }

    // CAMBIO: Pedimos solo las columnas necesarias.
    // Evita SELECT * y documenta los datos que realmente usa el login.
    const [rows] = await db.query(
      `SELECT id, full_name, email, phone, role, job_title, status, password
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    const user = rows[0];

    // CAMBIO: Unificamos la respuesta para usuario inexistente o contraseña errónea.
    // Así no se revela si un correo está registrado en ConsoleFix.
    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Correo o contraseña incorrectos.'
      });
    }

    // CAMBIO CRÍTICO: Eliminamos el soporte para contraseña en texto plano.
    // Todas las contraseñas válidas deben existir como hashes bcrypt en MySQL.
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Correo o contraseña incorrectos.'
      });
    }

    // CAMBIO: La cuenta solo puede iniciar sesión si el administrador la activó.
    // PENDING_APPROVAL, SUSPENDED o cualquier otro estado no autorizado queda bloqueado.
    if (String(user.status).toUpperCase() !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta no está activa. Contacta al administrador.'
      });
    }

    // CAMBIO: Generamos el token con createToken(), que exige JWT_SECRET
    // y define expiración, issuer, audience y algoritmo.
    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        id: String(user.id),
        fullName: user.full_name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        jobTitle: user.job_title || '',
        status: user.status
      }
    });
  } catch (error) {
    // No devuelvas el error técnico al navegador.
    console.error('Error en login:', error);

    return res.status(500).json({
      success: false,
      message: 'No fue posible iniciar sesión.'
    });
  }
});

module.exports = router;
