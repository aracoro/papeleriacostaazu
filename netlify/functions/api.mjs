/*
 * Función de Netlify que ejecuta la API Express (server/app.js).
 *
 * netlify.toml redirige  /api/*  y  /uploads/*  a esta función.
 * Aquí se normaliza la ruta para que Express reciba siempre /api/...
 */
import express from 'express';
import serverless from 'serverless-http';
import app from '../../server/app.js';

const wrapper = express();

wrapper.use((req, _res, next) => {
  // Netlify puede entregar la ruta como /.netlify/functions/api/auth/login
  const prefijo = '/.netlify/functions/api';
  if (req.url.startsWith(prefijo)) {
    const resto = req.url.slice(prefijo.length) || '/';
    req.url = resto.startsWith('/uploads') ? resto : `/api${resto}`;
  }
  next();
});

wrapper.use(app);

export const handler = serverless(wrapper, {
  binary: ['image/*', 'application/octet-stream'],
});
