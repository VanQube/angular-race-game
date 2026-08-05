export const MONGO_CONFIG = {
  baseUrl: 'http://127.0.0.1:3001',
  endpoints: {
    races: '/api/races',
    carModels: '/api/car-models'
  },
  auth: {
    login: '/api/login',
    register: '/api/register',
    me: '/api/me',
    protected: '/api/protected'
  }
};
