import performanceNow from 'fbjs/lib/performanceNow';

import { isNotAvoidedProperty, isPropertyValid } from './utils';
import { getContextPayload, resetContext } from './context';
import {
  getUserAgent,
  getDeviceModel,
  getDeviceBrand,
  getAppId,
} from './deviceUtils';

const measureTiming = ({ start }) => performanceNow() - start;

const createPayload = ({ name, property, timing, context }) => ({
  event: { name, property },
  system: {
    userAgent: getUserAgent(),
    brand: getDeviceBrand(),
    model: getDeviceModel(),
    appId: getAppId(),
  },
  metrics: { timing },
  context,
});

export const captureComponentPerfs = (
  instance,
  { identifier, excludes = ['constructor'], debug = false } = {}
) => {
  const name =
    identifier ||
    instance.constructor.displayName ||
    instance.constructor.name ||
    'Component';

  const properties = [
    ...Object.getOwnPropertyNames(instance).filter(isNotAvoidedProperty),
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(instance)),
  ];

  properties.filter(isPropertyValid(instance, excludes)).forEach(property => {
    const fn = instance[property];

    instance[property] = () => {
      const start = performanceNow();
      const result = fn.call(instance, arguments);

      const context = { ...getContextPayload() };
      resetContext();

      if (result && result.then) {
        return result.then(res => {
          const payload = createPayload({
            name,
            property,
            timing: measureTiming({ start }).toFixed(5),
            context,
          });

          if (debug) console.info(payload);

          return res;
        });
      }

      const payload = createPayload({
        name,
        property,
        timing: measureTiming({ start }).toFixed(5),
        context,
      });

      if (debug) console.info(payload);

      return result;
    };
  });
};
