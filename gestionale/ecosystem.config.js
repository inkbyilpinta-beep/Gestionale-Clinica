module.exports = {
  apps: [
    {
      name: 'gestionale-backend',
      script: 'backend/src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: { NODE_ENV: 'production' },
      error_file: '/var/log/gestionale/backend-error.log',
      out_file:   '/var/log/gestionale/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'gestionale-frontend',
      script: 'serve',
      args: '-s frontend/dist -l 3000',
      instances: 1,
      autorestart: true,
      env: { NODE_ENV: 'production' },
    }
  ]
};
