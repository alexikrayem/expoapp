// config/queue.js
// BullMQ connection configuration

const isQueueEnabled = () => Boolean(process.env.REDIS_URL);

const getQueueConnection = () => {
  if (!process.env.REDIS_URL) return null;
  return { url: process.env.REDIS_URL };
};

module.exports = {
  isQueueEnabled,
  getQueueConnection,
};
