const createQueue = ({
  counts = {
    waiting: 1,
    active: 2,
    completed: 3,
    failed: 0,
    delayed: 0,
    paused: 0,
  },
  repeatableJobs = [{ key: 'job-1' }],
  repeatableError = null,
} = {}) => {
  const queue = {
    getJobCounts: jest.fn().mockResolvedValue(counts),
    getRepeatableJobs: jest.fn(),
  };

  if (repeatableError) {
    queue.getRepeatableJobs.mockRejectedValue(repeatableError);
  } else {
    queue.getRepeatableJobs.mockResolvedValue(repeatableJobs);
  }

  return queue;
};

const loadQueueMonitorModule = ({
  queueEnabled = true,
  notificationQueue = null,
  pricingQueue = null,
  linkingQueue = null,
} = {}) => {
  jest.resetModules();

  const isQueueEnabled = jest.fn(() => queueEnabled);
  const getNotificationQueue = jest.fn(() => notificationQueue);
  const getPricingQueue = jest.fn(() => pricingQueue);
  const getLinkingQueue = jest.fn(() => linkingQueue);

  jest.doMock('../../config/queue', () => ({ isQueueEnabled }));
  jest.doMock('../../services/notificationQueue', () => ({ getNotificationQueue }));
  jest.doMock('../../services/pricingQueue', () => ({ getPricingQueue }));
  jest.doMock('../../services/linkingQueue', () => ({ getLinkingQueue }));

  const queueMonitor = require('../../services/queueMonitor');
  return {
    queueMonitor,
    isQueueEnabled,
    getNotificationQueue,
    getPricingQueue,
    getLinkingQueue,
  };
};

describe('queueMonitor service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns disabled status when queueing is not enabled', async () => {
    const { queueMonitor, getNotificationQueue, getPricingQueue, getLinkingQueue } =
      loadQueueMonitorModule({ queueEnabled: false });

    const stats = await queueMonitor.getQueueStats();

    expect(stats).toEqual({ enabled: false, queues: {} });
    expect(getNotificationQueue).not.toHaveBeenCalled();
    expect(getPricingQueue).not.toHaveBeenCalled();
    expect(getLinkingQueue).not.toHaveBeenCalled();
  });

  it('returns queue counts and repeatable job totals for enabled queues', async () => {
    const notificationQueue = createQueue({
      counts: { waiting: 4, active: 1, completed: 9, failed: 0, delayed: 2, paused: 0 },
      repeatableJobs: [{ key: 'n1' }, { key: 'n2' }],
    });
    const pricingQueue = createQueue({
      counts: { waiting: 0, active: 0, completed: 5, failed: 1, delayed: 0, paused: 0 },
      repeatableJobs: [{ key: 'p1' }],
    });
    const linkingQueue = createQueue({
      counts: { waiting: 3, active: 1, completed: 1, failed: 0, delayed: 1, paused: 0 },
      repeatableJobs: [],
    });

    const { queueMonitor } = loadQueueMonitorModule({
      queueEnabled: true,
      notificationQueue,
      pricingQueue,
      linkingQueue,
    });

    const stats = await queueMonitor.getQueueStats();

    expect(notificationQueue.getJobCounts).toHaveBeenCalledWith(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );
    expect(stats).toEqual({
      enabled: true,
      queues: {
        notifications: {
          enabled: true,
          counts: { waiting: 4, active: 1, completed: 9, failed: 0, delayed: 2, paused: 0 },
          repeatable: 2,
        },
        pricing: {
          enabled: true,
          counts: { waiting: 0, active: 0, completed: 5, failed: 1, delayed: 0, paused: 0 },
          repeatable: 1,
        },
        linking: {
          enabled: true,
          counts: { waiting: 3, active: 1, completed: 1, failed: 0, delayed: 1, paused: 0 },
          repeatable: 0,
        },
      },
    });
  });

  it('marks unavailable queues as disabled', async () => {
    const notificationQueue = createQueue();
    const { queueMonitor } = loadQueueMonitorModule({
      queueEnabled: true,
      notificationQueue,
      pricingQueue: null,
      linkingQueue: null,
    });

    const stats = await queueMonitor.getQueueStats();

    expect(stats.queues.notifications.enabled).toBe(true);
    expect(stats.queues.pricing).toEqual({ enabled: false });
    expect(stats.queues.linking).toEqual({ enabled: false });
  });

  it('falls back to repeatable=0 when fetching repeatable jobs throws', async () => {
    const queueWithRepeatableError = createQueue({
      repeatableError: new Error('repeatable not supported'),
    });
    const { queueMonitor } = loadQueueMonitorModule({
      queueEnabled: true,
      notificationQueue: queueWithRepeatableError,
      pricingQueue: null,
      linkingQueue: null,
    });

    const stats = await queueMonitor.getQueueStats();

    expect(stats.queues.notifications.repeatable).toBe(0);
  });
});
