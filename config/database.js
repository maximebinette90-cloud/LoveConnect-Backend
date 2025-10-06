require(\'dotenv\').config();

module.exports = {
  development: {
    url: process.env.DATABASE_URL || \'postgresql://postgres:password@localhost:5432/loveconnect_dev\',
    dialect: \'postgres\',
  },
  test: {
    url: process.env.DATABASE_URL || \'postgresql://postgres:password@localhost:5432/loveconnect_test\',
    dialect: \'postgres\',
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: \'postgres\',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
